package com.mednexus.backend.service;

import com.mednexus.backend.dto.CheckoutRequest;
import com.mednexus.backend.entity.Checkout;
import com.mednexus.backend.entity.MovableEquipment;
import com.mednexus.backend.entity.Staff;
import com.mednexus.backend.entity.ExtensionRequest;
import com.mednexus.backend.entity.Notification;
import com.mednexus.backend.repository.CheckoutRepository;
import com.mednexus.backend.repository.ExtensionRequestRepository;
import com.mednexus.backend.repository.MovableEquipmentRepository;
import com.mednexus.backend.repository.NotificationRepository;
import com.mednexus.backend.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final CheckoutRepository checkoutRepository;
    private final MovableEquipmentRepository equipmentRepository;
    private final StaffRepository staffRepository;
    private final ExtensionRequestRepository extensionRepository;
    private final NotificationRepository notificationRepository;

    public List<Checkout> getAll() {
        return checkoutRepository.findAll();
    }

    public Optional<Checkout> getById(String id) {
        return checkoutRepository.findById(id);
    }

    public List<Checkout> getByStaffId(String staffId) {
        return checkoutRepository.findByStaffId(staffId);
    }

    public List<Checkout> getActiveByStaffId(String staffId) {
        return checkoutRepository.findByStaffIdAndStatus(staffId, "active");
    }

    public List<Checkout> getByHospital(String hospitalId) {
        return checkoutRepository.findByHospitalId(hospitalId);
    }

    public List<Checkout> getActiveByHospital(String hospitalId) {
        return checkoutRepository.findByHospitalIdAndStatus(hospitalId, "active");
    }

    /**
     * Create a new checkout – marks equipment as checked_out
     */
    @Transactional
    public Checkout createCheckout(CheckoutRequest request) {
        // Validate equipment exists and is available
        MovableEquipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new RuntimeException("Equipment not found: " + request.getEquipmentId()));

        if (!"available".equalsIgnoreCase(equipment.getStatus())) {
            throw new RuntimeException("Equipment is not available for checkout.");
        }

        // Validate staff exists
        Staff staff = staffRepository.findById(request.getStaffId())
                .orElseThrow(() -> new RuntimeException("Staff not found: " + request.getStaffId()));

        // Validate due date (max 90 days)
        LocalDate today = LocalDate.now();
        if (request.getDueDate() != null && request.getDueDate().isAfter(today.plusDays(90))) {
            throw new RuntimeException("Checkout period cannot exceed 90 days.");
        }

        // Generate checkout ID
        String checkoutId = "CHK-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Checkout checkout = Checkout.builder()
                .checkoutId(checkoutId)
                .hospitalId(equipment.getHospitalId())
                .equipmentId(equipment.getId())
                .equipmentName(equipment.getName())
                .staffId(staff.getId())
                .staffName(staff.getName())
                .checkoutDate(today)
                .dueDate(request.getDueDate())
                .status("active")
                .extended(false)
                .notes(request.getNotes())
                .build();

        // Mark equipment as checked out
        equipment.setStatus("checked_out");
        equipmentRepository.save(equipment);

        checkout = checkoutRepository.save(checkout);

        if (request.isExtensionRequested()) {
            // Create extension request
            ExtensionRequest ext = ExtensionRequest.builder()
                    .id("REQ-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                    .checkoutId(checkout.getCheckoutId())
                    .hospitalId(equipment.getHospitalId())
                    .staffId(staff.getId())
                    .staffName(staff.getName())
                    .equipmentName(equipment.getName())
                    .currentDue(checkout.getDueDate())
                    .requestedDue(request.getRequestedDueDate())
                    .reason(request.getExtensionReason())
                    .status("pending")
                    .timestamp(java.time.LocalDateTime.now())
                    .build();
            extensionRepository.save(ext);

            // Notify Admin
            Notification notif = Notification.builder()
                    .id("NOTIF-REQ-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase())
                    .hospitalId(equipment.getHospitalId())
                    .targetStaffId("ADM-001") // Assuming ADM-001 is the admin
                    .type("extension_request")
                    .severity("warning")
                    .message(staff.getName() + " requested an instant extension during checkout for "
                            + equipment.getName() + " spanning >90 days.")
                    .timestamp(java.time.LocalDateTime.now())
                    .read(false)
                    .build();
            notificationRepository.save(notif);
        }

        return checkout;
    }

    /**
     * Return equipment – marks checkout as completed and equipment as available
     */
    @Transactional
    public Checkout returnEquipment(String checkoutId, String returnLocation) {
        Checkout checkout = checkoutRepository.findById(checkoutId)
                .orElseThrow(() -> new RuntimeException("Checkout not found: " + checkoutId));

        if (!"active".equalsIgnoreCase(checkout.getStatus())) {
            throw new RuntimeException("This checkout is already completed.");
        }

        checkout.setStatus("completed");
        checkout.setReturnDate(LocalDate.now());
        if (returnLocation != null) {
            checkout.setReturnLocation(returnLocation);
        }
        checkoutRepository.save(checkout);

        // Mark equipment available again
        equipmentRepository.findById(checkout.getEquipmentId()).ifPresent(eq -> {
            eq.setStatus("available");
            equipmentRepository.save(eq);
        });

        return checkout;
    }

    /**
     * Extend a checkout due date
     */
    @Transactional
    public Checkout extendCheckout(String checkoutId, LocalDate newDueDate) {
        Checkout checkout = checkoutRepository.findById(checkoutId)
                .orElseThrow(() -> new RuntimeException("Checkout not found: " + checkoutId));

        if (!"active".equalsIgnoreCase(checkout.getStatus())) {
            throw new RuntimeException("Cannot extend a completed checkout.");
        }

        // Validate max 90 days from original checkout
        if (newDueDate.isAfter(checkout.getCheckoutDate().plusDays(90))) {
            throw new RuntimeException("Total checkout period cannot exceed 90 days.");
        }

        checkout.setDueDate(newDueDate);
        checkout.setExtended(true);

        return checkoutRepository.save(checkout);
    }
}
