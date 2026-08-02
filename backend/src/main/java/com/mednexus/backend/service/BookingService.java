package com.mednexus.backend.service;

import com.mednexus.backend.dto.BookingRequest;
import com.mednexus.backend.entity.Booking;
import com.mednexus.backend.entity.ImmovableEquipment;
import com.mednexus.backend.entity.Notification;
import com.mednexus.backend.entity.Staff;
import com.mednexus.backend.repository.BookingRepository;
import com.mednexus.backend.repository.ImmovableEquipmentRepository;
import com.mednexus.backend.repository.NotificationRepository;
import com.mednexus.backend.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ImmovableEquipmentRepository equipmentRepository;
    private final StaffRepository staffRepository;
    private final NotificationRepository notificationRepository;

    public List<Booking> getAll() {
        return bookingRepository.findAll();
    }

    public Optional<Booking> getById(String id) {
        return bookingRepository.findById(id);
    }

    public List<Booking> getByStaffId(String staffId) {
        return bookingRepository.findByStaffId(staffId);
    }

    public List<Booking> getByDate(LocalDate date) {
        return bookingRepository.findByDate(date);
    }

    public List<Booking> getByHospitalAndDate(String hospitalId, LocalDate date) {
        return bookingRepository.findByHospitalIdAndDate(hospitalId, date);
    }

    public List<Booking> getByStaffAndDate(String staffId, LocalDate date) {
        return bookingRepository.findByStaffIdAndDate(staffId, date);
    }

    public List<Booking> getByEquipmentId(String equipmentId) {
        return bookingRepository.findByEquipmentId(equipmentId);
    }

    /** Returns all bookings in PENDING_TRIAGE status for admin resolution */
    public List<Booking> getPendingTriageBookings() {
        return bookingRepository.findAll().stream()
                .filter(b -> "PENDING_TRIAGE".equals(b.getStatus()))
                .toList();
    }

    @Transactional
    public Booking createBooking(BookingRequest request) {
        // Validate equipment with pessimistic lock to prevent concurrent slot conflicts
        ImmovableEquipment equipment = equipmentRepository.findByIdWithLock(request.getEquipmentId())
                .orElseThrow(() -> new RuntimeException("Equipment not found: " + request.getEquipmentId()));

        // Validate staff
        Staff staff = staffRepository.findById(request.getStaffId())
                .orElseThrow(() -> new RuntimeException("Staff not found: " + request.getStaffId()));

        LocalTime newStart = LocalTime.parse(request.getStartTime());
        LocalTime newEnd = LocalTime.parse(request.getEndTime());

        // Validate operating hours
        if (equipment.getOperatingHoursStart() != null && equipment.getOperatingHoursEnd() != null) {
            LocalTime opStart = LocalTime.parse(equipment.getOperatingHoursStart());
            LocalTime opEnd = LocalTime.parse(equipment.getOperatingHoursEnd());
            if (newStart.isBefore(opStart) || newEnd.isAfter(opEnd)) {
                throw new RuntimeException("Booking time falls outside the equipment operating hours (" +
                        equipment.getOperatingHoursStart() + " – " + equipment.getOperatingHoursEnd() + ")");
            }
        }

        // Validate category-specific duration caps
        java.time.Duration duration = java.time.Duration.between(newStart, newEnd);
        long durationMins = duration.toMinutes();
        if (durationMins < 0) durationMins += 1440;

        long maxAllowed = 120; // default 2 hours
        String category = equipment.getCategory();
        if ("Surgery".equalsIgnoreCase(category)) {
            maxAllowed = 480; // 8 hours
        } else if ("Dialysis/Renal".equalsIgnoreCase(category)) {
            maxAllowed = 360; // 6 hours
        }

        if (durationMins > maxAllowed) {
            throw new RuntimeException("Booking duration of " + durationMins + " minutes exceeds the maximum cap of " +
                    maxAllowed + " minutes for category: " + (category != null ? category : "default"));
        }

        // Check for time-slot conflicts on the same equipment + date
        List<Booking> existing = bookingRepository.findByDateAndEquipmentId(request.getDate(),
                request.getEquipmentId());

        boolean isNewHighEmergency = "High Emergency".equalsIgnoreCase(request.getPriority());

        for (Booking b : existing) {
            if ("cancelled".equalsIgnoreCase(b.getStatus()))
                continue;
            if ("PENDING_TRIAGE".equalsIgnoreCase(b.getStatus()))
                continue; // Already triage-queued — skip conflict check against it

            LocalTime bStart = LocalTime.parse(b.getStartTime());
            LocalTime bEnd = LocalTime.parse(b.getEndTime());

            // Overlap check
            if (newStart.isBefore(bEnd) && newEnd.isAfter(bStart)) {
                boolean existingIsHighEmergency = "High Emergency".equalsIgnoreCase(b.getPriority());

                // ── CASE 1: New = HE vs Existing = HE → PENDING_TRIAGE (no hard error) ──
                if (isNewHighEmergency && existingIsHighEmergency) {
                    String bookingId = "BKG-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                    Booking pendingBooking = Booking.builder()
                            .bookingId(bookingId)
                            .hospitalId(equipment.getHospitalId())
                            .equipmentId(equipment.getId())
                            .equipmentName(equipment.getName())
                            .patientName(request.getPatientName())
                            .staffId(staff.getId())
                            .staffName(staff.getName())
                            .date(request.getDate())
                            .startTime(request.getStartTime())
                            .endTime(request.getEndTime())
                            .priority(request.getPriority())
                            .department(request.getDepartment())
                            .status("PENDING_TRIAGE")
                            .displacementCount(0)
                            .build();
                    bookingRepository.save(pendingBooking);

                    String triageNotifId = "NOTIF-TRIAGE-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4);
                    Notification triageAlert = Notification.builder()
                            .id(triageNotifId)
                            .hospitalId(equipment.getHospitalId())
                            .targetStaffId("ADM-001")
                            .type("triage_conflict")
                            .severity("critical")
                            .message("🚨 ACTION REQUIRED: Two High Emergency bookings for " + equipment.getName() + " on " + pendingBooking.getDate() + " at " + pendingBooking.getStartTime() + ". \n" +
                                     "Conflicting Booking: " + b.getBookingId() + " (Patient: " + b.getPatientName() + ")\n" +
                                     "New Request: " + pendingBooking.getBookingId() + " (Patient: " + pendingBooking.getPatientName() + ")")
                            .read(false)
                            .timestamp(LocalDateTime.now())
                            .build();
                    notificationRepository.save(triageAlert);

                    Notification staffAlert = Notification.builder()
                            .id("NOTIF-PENDING-" + System.currentTimeMillis())
                            .hospitalId(equipment.getHospitalId())
                            .targetStaffId(pendingBooking.getStaffId())
                            .type("triage_pending")
                            .severity("warning")
                            .message("Your High Emergency booking for " + pendingBooking.getPatientName() + " is pending triage due to a conflict with an existing High Emergency booking.")
                            .read(false)
                            .timestamp(LocalDateTime.now())
                            .build();
                    notificationRepository.save(staffAlert);

                    Notification conflictStaffAlert = Notification.builder()
                            .id("NOTIF-CONFLICT-" + System.currentTimeMillis())
                            .hospitalId(equipment.getHospitalId())
                            .targetStaffId(b.getStaffId())
                            .type("triage_conflict")
                            .severity("warning")
                            .message("Your High Emergency booking for " + b.getPatientName() + " has a scheduling conflict with another High Emergency request. An administrator is reviewing the triage priority.")
                            .read(false)
                            .timestamp(LocalDateTime.now())
                            .build();
                    notificationRepository.save(conflictStaffAlert);

                    return pendingBooking; // Return the PENDING_TRIAGE booking
                }

                // ── CASE 2: New is higher priority → pushback the lower-priority existing booking ──
                if (isPriorityHigher(request.getPriority(), b.getPriority())) {
                    performCascadePushback(b, newEnd, equipment, request.getDate(), true);
                } else {
                    throw new RuntimeException(
                            "Time slot conflict with booking " + b.getBookingId() +
                                     " (" + b.getStartTime() + " – " + b.getEndTime() + ")");
                }
            }
        }

        String bookingId = "BKG-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        Booking booking = Booking.builder()
                .bookingId(bookingId)
                .hospitalId(equipment.getHospitalId())
                .equipmentId(equipment.getId())
                .equipmentName(equipment.getName())
                .patientName(request.getPatientName())
                .staffId(staff.getId())
                .staffName(staff.getName())
                .date(request.getDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .priority(request.getPriority() != null ? request.getPriority() : "Normal")
                .department(request.getDepartment())
                .status("confirmed")
                .displacementCount(0)
                .build();

        return bookingRepository.save(booking);
    }

    /**
     * Admin selects which booking wins the disputed slot during triage.
     * The losing booking is cascaded to the next slot.
     *
     * @param winnerBookingId  The booking that gets the slot
     * @param loserBookingId   The booking to be cascaded
     */
    @Transactional
    public void resolveTriageConflict(String winnerBookingId, String loserBookingId) {
        Booking winner = bookingRepository.findById(winnerBookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + winnerBookingId));
        Booking loser = bookingRepository.findById(loserBookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + loserBookingId));

        ImmovableEquipment equipment = equipmentRepository.findById(winner.getEquipmentId())
                .orElseThrow(() -> new RuntimeException("Equipment not found"));

        // Confirm the winner
        if ("PENDING_TRIAGE".equalsIgnoreCase(winner.getStatus())) {
            winner.setStatus("confirmed");
            bookingRepository.save(winner);
        }

        // Cascade the loser — parse duration from loser
        LocalTime loserStart = LocalTime.parse(loser.getStartTime());
        LocalTime loserEnd = LocalTime.parse(loser.getEndTime());
        LocalTime winnerEnd = LocalTime.parse(winner.getEndTime());

        // Try to place loser in next available slot after winner ends
        java.time.Duration loserDuration = java.time.Duration.between(loserStart, loserEnd);
        int loserMins = (int) loserDuration.toMinutes();
        if (loserMins < 0) loserMins += 1440;

        LocalTime opEnd = (equipment.getOperatingHoursEnd() != null && !equipment.getOperatingHoursEnd().trim().isEmpty()) 
                ? LocalTime.parse(equipment.getOperatingHoursEnd()) : LocalTime.of(23, 59);
        LocalTime nextSlotStart = winnerEnd;
        LocalTime nextSlotEnd = winnerEnd.plusMinutes(loserMins);

        if (nextSlotEnd.isBefore(winnerEnd) || nextSlotEnd.isAfter(opEnd)) {
            // No slot available — failsafe
            loser.setStatus("cancelled");
            bookingRepository.save(loser);

            Notification failsafe = Notification.builder()
                    .id("NOTIF-FAIL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                    .hospitalId(equipment.getHospitalId())
                    .targetStaffId("ADM-001")
                    .type("pushback_failsafe")
                    .severity("critical")
                    .message("CONFLICT: Unable to reschedule High Emergency patient " + loser.getPatientName() +
                            " (" + loser.getBookingId() + "). No available slot found on " + equipment.getName() +
                            ". Booking was cancelled. Manual intervention required.")
                    .timestamp(java.time.LocalDateTime.now())
                    .read(false)
                    .build();
            notificationRepository.save(failsafe);
            return;
        }

        // Check if next slot has a High Emergency booking
        List<Booking> nextSlotBookings = bookingRepository.findByDateAndEquipmentId(loser.getDate(), loser.getEquipmentId());
        boolean nextSlotIsHE = false;
        java.util.List<Booking> conflictsToDisplace = new java.util.ArrayList<>();

        for (Booking b : nextSlotBookings) {
            if ("cancelled".equalsIgnoreCase(b.getStatus()) || b.getBookingId().equals(loser.getBookingId())) continue;
            
            LocalTime bS = LocalTime.parse(b.getStartTime());
            LocalTime bE = LocalTime.parse(b.getEndTime());
            
            if (nextSlotStart.isBefore(bE) && nextSlotEnd.isAfter(bS)) {
                if ("High Emergency".equalsIgnoreCase(b.getPriority())) {
                    nextSlotIsHE = true;
                    break;
                } else {
                    conflictsToDisplace.add(b);
                }
            }
        }

        if (nextSlotIsHE) {
            // SCENARIO B: Next slot is also HE — trigger another triage alert
            loser.setStatus("PENDING_TRIAGE");
            bookingRepository.save(loser);

            String triageId = "NOTIF-TRIAGE-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4);
            Notification cascadeTriage = Notification.builder()
                    .id(triageId)
                    .hospitalId(equipment.getHospitalId())
                    .targetStaffId("ADM-001")
                    .type("triage_conflict")
                    .severity("critical")
                    .message("🚨 CASCADE TRIAGE ALERT: Unselected High Emergency booking for " +
                            loser.getPatientName() + " (" + loser.getBookingId() + ") cannot auto-move to " +
                            nextSlotStart + "–" + nextSlotEnd + " — that slot ALSO has a High Emergency booking. " +
                            "Manual triage required for slot " + nextSlotStart + "–" + nextSlotEnd + " on " + equipment.getName())
                    .timestamp(java.time.LocalDateTime.now())
                    .read(false)
                    .build();
            notificationRepository.save(cascadeTriage);
        } else {
            // SCENARIO A: Next slot is Normal/Low — displace it and move the losing HE there
            for (Booking conflict : conflictsToDisplace) {
                performCascadePushback(conflict, nextSlotEnd, equipment, loser.getDate(), false);
            }
            
            loser.setStartTime(nextSlotStart.toString());
            loser.setEndTime(nextSlotEnd.toString());
            loser.setStatus("pushed_back");
            loser.setPushedTo(nextSlotStart.toString());
            
            int prevCount = loser.getDisplacementCount() == null ? 0 : loser.getDisplacementCount();
            loser.setDisplacementCount(prevCount + 1);
            bookingRepository.save(loser);

            Notification cascadeStaffAlert = Notification.builder()
                    .id("NOTIF-PUSH-" + System.currentTimeMillis())
                    .hospitalId(equipment.getHospitalId())
                    .targetStaffId(loser.getStaffId())
                    .type("booking_pushed_back")
                    .severity("warning")
                    .message("Your booking for " + loser.getPatientName() + " was pushed back to " + nextSlotStart + " following a triage resolution.")
                    .read(false)
                    .timestamp(LocalDateTime.now())
                    .build();
            notificationRepository.save(cascadeStaffAlert);
        }
    }

    /**
     * Cascade a booking to the next free slot.
     * If the slot being vacated has a lower-priority booking, displace it first.
     * Tracks displacement_count and alerts Admin if count > 2.
     */
    private void performCascadePushback(Booking displacedBooking, LocalTime afterTime, ImmovableEquipment equipment,
                                         LocalDate date, boolean checkForConflictsInNext) {
        LocalTime bStart = LocalTime.parse(displacedBooking.getStartTime());
        LocalTime bEnd = LocalTime.parse(displacedBooking.getEndTime());
        java.time.Duration bDuration = java.time.Duration.between(bStart, bEnd);
        long bMins = bDuration.toMinutes();
        if (bMins < 0) bMins += 1440;

        LocalTime[] newSlot = findNextFreeSlot(equipment.getId(), date, afterTime, (int) bMins,
                displacedBooking.getBookingId(), equipment.getOperatingHoursEnd());

        if (newSlot != null) {
            // If there's a booking at the next slot that we must displace first (recursive cascade)
            if (checkForConflictsInNext) {
                List<Booking> conflictsAtNext = bookingRepository.findByDateAndEquipmentId(date, equipment.getId());
                for (Booking conflict : conflictsAtNext) {
                    if ("cancelled".equalsIgnoreCase(conflict.getStatus())) continue;
                    if (conflict.getBookingId().equals(displacedBooking.getBookingId())) continue;
                    LocalTime cS = LocalTime.parse(conflict.getStartTime());
                    LocalTime cE = LocalTime.parse(conflict.getEndTime());
                    if (newSlot[0].isBefore(cE) && newSlot[1].isAfter(cS)) {
                        // Recursively displace this lower-priority booking
                        if (isPriorityHigher(displacedBooking.getPriority(), conflict.getPriority())) {
                            performCascadePushback(conflict, newSlot[1], equipment, date, false);
                        }
                    }
                }
            }

            displacedBooking.setStartTime(newSlot[0].toString());
            displacedBooking.setEndTime(newSlot[1].toString());
            displacedBooking.setStatus("pushed_back");
            displacedBooking.setPushedTo(newSlot[0].toString());

            // Increment displacement counter
            int prevCount = displacedBooking.getDisplacementCount() == null ? 0 : displacedBooking.getDisplacementCount();
            displacedBooking.setDisplacementCount(prevCount + 1);
            bookingRepository.save(displacedBooking);

            // Pushback notification to staff member
            String severity = (prevCount + 1) >= 2 ? "critical" : "warning";
            String extraMsg = (prevCount + 1) >= 2
                    ? " ⚠️ WARNING: This patient has been delayed " + (prevCount + 1) + " times today — admin review recommended."
                    : "";
            Notification notif = Notification.builder()
                    .id("NOTIF-PUSH-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                    .hospitalId(equipment.getHospitalId())
                    .targetStaffId(displacedBooking.getStaffId())
                    .type("pushback_alert")
                    .severity(severity)
                    .message("Your booking for " + equipment.getName() + " (patient: " + displacedBooking.getPatientName() +
                            ") has been rescheduled due to a High Emergency. New time: " +
                            displacedBooking.getStartTime() + "." + extraMsg)
                    .timestamp(java.time.LocalDateTime.now())
                    .read(false)
                    .build();
            notificationRepository.save(notif);

            // ── Displacement Safety Counter: flag if pushed back more than twice ──
            if (displacedBooking.getDisplacementCount() > 2) {
                Notification adminWarn = Notification.builder()
                        .id("NOTIF-DISP-WARN-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                        .hospitalId(equipment.getHospitalId())
                        .targetStaffId("ADM-001")
                        .type("displacement_warning")
                        .severity("critical")
                        .message("🔴 DISPLACEMENT ALERT: Patient \"" + displacedBooking.getPatientName() +
                                "\" (Booking " + displacedBooking.getBookingId() + ") has been displaced " +
                                displacedBooking.getDisplacementCount() + " times on " + equipment.getName() +
                                ". This patient requires urgent scheduling attention.")
                        .timestamp(java.time.LocalDateTime.now())
                        .read(false)
                        .build();
                notificationRepository.save(adminWarn);
            }

        } else {
            // Failsafe: cancel and notify admin
            displacedBooking.setStatus("cancelled");
            bookingRepository.save(displacedBooking);

            Notification notif = Notification.builder()
                    .id("NOTIF-FAIL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                    .hospitalId(equipment.getHospitalId())
                    .targetStaffId("ADM-001")
                    .type("pushback_failsafe")
                    .severity("critical")
                    .message("CONFLICT: Unable to reschedule " + displacedBooking.getPatientName() +
                            " (" + displacedBooking.getBookingId() + "). No available slot found on " +
                            equipment.getName() + " today. Manual intervention required.")
                    .timestamp(java.time.LocalDateTime.now())
                    .read(false)
                    .build();
            notificationRepository.save(notif);
        }
    }

    @Transactional
    public Booking cancelBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        booking.setStatus("cancelled");
        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking updateBooking(String bookingId, BookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        // Validate equipment with pessimistic lock
        ImmovableEquipment equipment = equipmentRepository.findByIdWithLock(booking.getEquipmentId())
                .orElseThrow(() -> new RuntimeException("Equipment not found: " + booking.getEquipmentId()));

        LocalTime newStart = LocalTime.parse(request.getStartTime());
        LocalTime newEnd = LocalTime.parse(request.getEndTime());

        // Validate operating hours
        if (equipment.getOperatingHoursStart() != null && equipment.getOperatingHoursEnd() != null) {
            LocalTime opStart = LocalTime.parse(equipment.getOperatingHoursStart());
            LocalTime opEnd = LocalTime.parse(equipment.getOperatingHoursEnd());
            if (newStart.isBefore(opStart) || newEnd.isAfter(opEnd)) {
                throw new RuntimeException("Booking time falls outside the equipment operating hours (" +
                        equipment.getOperatingHoursStart() + " – " + equipment.getOperatingHoursEnd() + ")");
            }
        }

        // Validate category-specific duration caps
        java.time.Duration duration = java.time.Duration.between(newStart, newEnd);
        long durationMins = duration.toMinutes();
        if (durationMins < 0) durationMins += 1440;

        long maxAllowed = 120;
        String category = equipment.getCategory();
        if ("Surgery".equalsIgnoreCase(category)) {
            maxAllowed = 480;
        } else if ("Dialysis/Renal".equalsIgnoreCase(category)) {
            maxAllowed = 360;
        }

        if (durationMins > maxAllowed) {
            throw new RuntimeException("Booking duration of " + durationMins + " minutes exceeds the maximum cap of " +
                    maxAllowed + " minutes for category: " + (category != null ? category : "default"));
        }

        // Check for time-slot conflicts on the same equipment + date (exclude current booking)
        List<Booking> existing = bookingRepository.findByDateAndEquipmentId(request.getDate(),
                booking.getEquipmentId());

        boolean isNewHighEmergency = "High Emergency".equalsIgnoreCase(request.getPriority());

        for (Booking b : existing) {
            if ("cancelled".equalsIgnoreCase(b.getStatus()))
                continue;
            if (b.getBookingId().equals(bookingId))
                continue;
            if ("PENDING_TRIAGE".equalsIgnoreCase(b.getStatus()))
                continue;

            LocalTime bStart = LocalTime.parse(b.getStartTime());
            LocalTime bEnd = LocalTime.parse(b.getEndTime());

            if (newStart.isBefore(bEnd) && newEnd.isAfter(bStart)) {
                boolean existingIsHighEmergency = "High Emergency".equalsIgnoreCase(b.getPriority());

                if (isNewHighEmergency && existingIsHighEmergency) {
                    throw new RuntimeException("Time slot conflict with another High Emergency booking " + b.getBookingId() +
                            " (" + b.getStartTime() + " – " + b.getEndTime() + "). Use the triage system to resolve.");
                }

                if (isPriorityHigher(request.getPriority(), b.getPriority())) {
                    performCascadePushback(b, newEnd, equipment, request.getDate(), true);
                } else {
                    throw new RuntimeException(
                            "Time slot conflict with booking " + b.getBookingId() +
                                    " (" + b.getStartTime() + " – " + b.getEndTime() + ")");
                }
            }
        }

        booking.setPatientName(request.getPatientName());
        booking.setDate(request.getDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPriority(request.getPriority() != null ? request.getPriority() : "Normal");
        booking.setDepartment(request.getDepartment());

        return bookingRepository.save(booking);
    }

    /**
     * Priority hierarchy: High Emergency > Emergency / Low Emergency > Normal > Routine > Elective
     */
    private boolean isPriorityHigher(String newPriority, String existingPriority) {
        return getPriorityRank(newPriority) > getPriorityRank(existingPriority);
    }

    private int getPriorityRank(String priority) {
        if (priority == null)
            return 0;
        return switch (priority.trim().toLowerCase()) {
            case "high emergency" -> 4;
            case "emergency", "low emergency" -> 3;
            case "normal" -> 2;
            case "routine" -> 1;
            case "elective" -> 0;
            default -> 0;
        };
    }

    private LocalTime[] findNextFreeSlot(String equipmentId, LocalDate date, LocalTime afterTime, int slotMins, String originalBookingId, String opEndStr) {
        LocalTime opEnd = (opEndStr != null && !opEndStr.trim().isEmpty()) ? LocalTime.parse(opEndStr) : LocalTime.of(23, 59);
        LocalTime cursor = afterTime;

        List<Booking> bookings = bookingRepository.findByDateAndEquipmentId(date, equipmentId);

        for (int attempts = 0; attempts < 20; attempts++) {
            LocalTime slotEnd = cursor.plusMinutes(slotMins);

            if (slotEnd.isBefore(cursor) || slotEnd.isAfter(opEnd)) {
                return null;
            }

            boolean clash = false;
            for (Booking b : bookings) {
                if ("cancelled".equalsIgnoreCase(b.getStatus())) {
                    continue;
                }
                if (b.getBookingId().equals(originalBookingId)) {
                    continue;
                }

                LocalTime bStart = LocalTime.parse(b.getStartTime());
                LocalTime bEnd = LocalTime.parse(b.getEndTime());

                if (cursor.isBefore(bEnd) && slotEnd.isAfter(bStart)) {
                    clash = true;
                    cursor = bEnd; // Jump past this conflict
                    break;
                }
            }

            if (!clash) {
                return new LocalTime[] { cursor, slotEnd };
            }
        }

        return null;
    }
}
