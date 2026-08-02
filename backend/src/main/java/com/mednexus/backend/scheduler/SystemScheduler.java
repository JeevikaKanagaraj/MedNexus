package com.mednexus.backend.scheduler;

import com.mednexus.backend.entity.Booking;
import com.mednexus.backend.entity.Checkout;
import com.mednexus.backend.entity.Notification;
import com.mednexus.backend.repository.BookingRepository;
import com.mednexus.backend.repository.CheckoutRepository;
import com.mednexus.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SystemScheduler {

    private final CheckoutRepository checkoutRepo;
    private final BookingRepository bookingRepo;
    private final NotificationRepository notificationRepo;

    // Run every hour
    @Scheduled(fixedRate = 3600000)
    public void scanAndGenerateAlerts() {
        log.info("Running System Scheduler for Overdue Checkouts and Upcoming Bookings...");
        LocalDate today = LocalDate.now();

        // 1. Scan Overdue Checkouts
        List<Checkout> activeCheckouts = checkoutRepo.findAll().stream()
                .filter(c -> "active".equals(c.getStatus()) || "checked_out".equals(c.getStatus()))
                .toList();

        for (Checkout c : activeCheckouts) {
            if (c.getDueDate() != null && c.getDueDate().isBefore(today)) {
                String msg = "Your checkout for " + c.getEquipmentName() + " (ID: " + c.getEquipmentId()
                        + ") is OVERDUE since " + c.getDueDate();
                createIfNotExists(c.getStaffId(), c.getHospitalId(), "overdue_equipment", "critical", msg);
            } else if (c.getDueDate() != null && c.getDueDate().isEqual(today)) {
                String msg = "Your checkout for " + c.getEquipmentName() + " (ID: " + c.getEquipmentId()
                        + ") is due TODAY.";
                createIfNotExists(c.getStaffId(), c.getHospitalId(), "due_today", "warning", msg);
            }
        }

        // 2. Scan Upcoming Bookings (Today)
        List<Booking> todaysBookings = bookingRepo.findAll().stream()
                .filter(b -> b.getDate() != null && b.getDate().isEqual(today))
                .toList();

        for (Booking b : todaysBookings) {
            String msg = "Reminder: You have an upcoming booking for " + b.getEquipmentName() + " today at "
                    + b.getStartTime() + " for patient " + b.getPatientName();
            createIfNotExists(b.getStaffId(), b.getHospitalId(), "upcoming_booking", "info", msg);
        }
    }

    private void createIfNotExists(String staffId, String hospitalId, String type, String severity, String message) {
        boolean exists = notificationRepo.findAll().stream()
                .anyMatch(n -> n.getTargetStaffId().equals(staffId) && n.getMessage().equals(message)
                        && n.getType().equals(type));

        if (!exists) {
            Notification n = Notification.builder()
                    .id("S" + (System.currentTimeMillis() % 10000000000L) + (int) (Math.random() * 10))
                    .hospitalId(hospitalId)
                    .targetStaffId(staffId)
                    .type(type)
                    .severity(severity)
                    .message(message)
                    .timestamp(LocalDateTime.now())
                    .read(false)
                    .build();
            notificationRepo.save(n);
        }
    }
}
