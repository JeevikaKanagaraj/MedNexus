package com.mednexus.backend.service;

import com.mednexus.backend.dto.ExtensionRequestDto;
import com.mednexus.backend.entity.Checkout;
import com.mednexus.backend.entity.ExtensionRequest;
import com.mednexus.backend.entity.Notification;
import com.mednexus.backend.repository.CheckoutRepository;
import com.mednexus.backend.repository.ExtensionRequestRepository;
import com.mednexus.backend.repository.NotificationRepository;
import com.mednexus.backend.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExtensionRequestService {

    private final ExtensionRequestRepository extensionRequestRepository;
    private final CheckoutRepository checkoutRepository;
    private final StaffRepository staffRepository;
    private final NotificationRepository notificationRepository;

    public List<ExtensionRequest> getAll() {
        return extensionRequestRepository.findAll();
    }

    public List<ExtensionRequest> getByHospital(String hospitalId) {
        return extensionRequestRepository.findByHospitalId(hospitalId);
    }

    public List<ExtensionRequest> getPending(String hospitalId) {
        return extensionRequestRepository.findByHospitalIdAndStatus(hospitalId, "pending");
    }

    public List<ExtensionRequest> getByStaff(String staffId) {
        return extensionRequestRepository.findByStaffId(staffId);
    }

    /**
     * Staff submits an extension request (Movable or Immovable)
     */
    @Transactional
    public ExtensionRequest createRequest(ExtensionRequestDto dto) {
        String equipName = dto.getEquipmentName() != null ? dto.getEquipmentName() : "Equipment";
        String hospId = dto.getHospitalId() != null ? dto.getHospitalId() : "HOSP-001";
        java.time.LocalDate currDue = dto.getCurrentDue() != null ? dto.getCurrentDue() : java.time.LocalDate.now();

        if (dto.getCheckoutId() != null && !dto.getCheckoutId().isEmpty()) {
            var optCheckout = checkoutRepository.findById(dto.getCheckoutId());
            if (optCheckout.isPresent()) {
                Checkout checkout = optCheckout.get();
                if (!"active".equalsIgnoreCase(checkout.getStatus())) {
                    throw new RuntimeException("Cannot request extension on completed checkout.");
                }
                if (dto.getRequestedDue() != null && checkout.getCheckoutDate() != null
                        && dto.getRequestedDue().isAfter(checkout.getCheckoutDate().plusDays(90))) {
                    throw new RuntimeException("Total checkout period cannot exceed 90 days.");
                }
                equipName = checkout.getEquipmentName();
                hospId = checkout.getHospitalId();
                currDue = checkout.getDueDate();
            }
        }

        var staff = staffRepository.findById(dto.getStaffId())
                .orElseThrow(() -> new RuntimeException("Staff not found: " + dto.getStaffId()));

        String id = "EXT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        ExtensionRequest ext = ExtensionRequest.builder()
                .id(id)
                .checkoutId(dto.getCheckoutId())
                .hospitalId(hospId)
                .staffId(staff.getId())
                .staffName(staff.getName())
                .equipmentName(equipName)
                .currentDue(currDue)
                .requestedDue(dto.getRequestedDue())
                .reason(dto.getReason())
                .status("pending")
                .timestamp(LocalDateTime.now())
                .build();

        return extensionRequestRepository.save(ext);
    }

    /**
     * Admin approves an extension request → updates checkout and generates notification
     */
    @Transactional
    public ExtensionRequest approveRequest(String requestId) {
        ExtensionRequest ext = extensionRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Extension request not found: " + requestId));

        if (!"pending".equalsIgnoreCase(ext.getStatus())) {
            throw new RuntimeException("Request is already " + ext.getStatus());
        }

        // Update checkout due date if checkout exists
        if (ext.getCheckoutId() != null) {
            checkoutRepository.findById(ext.getCheckoutId()).ifPresent(checkout -> {
                checkout.setDueDate(ext.getRequestedDue());
                checkout.setExtended(true);
                checkoutRepository.save(checkout);
            });
        }

        ext.setStatus("approved");
        ExtensionRequest saved = extensionRequestRepository.save(ext);

        // Generate staff notification
        Notification notif = Notification.builder()
                .id("NOTIF-EXT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                .hospitalId(ext.getHospitalId() != null ? ext.getHospitalId() : "HOSP-001")
                .targetStaffId(ext.getStaffId())
                .type("extension_approved")
                .severity("info")
                .message("Your extension request for \"" + ext.getEquipmentName() + "\" until "
                        + ext.getRequestedDue() + " has been APPROVED by administration.")
                .timestamp(LocalDateTime.now())
                .read(false)
                .build();
        notificationRepository.save(notif);

        return saved;
    }

    /**
     * Admin rejects an extension request → generates notification
     */
    @Transactional
    public ExtensionRequest rejectRequest(String requestId) {
        ExtensionRequest ext = extensionRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Extension request not found: " + requestId));

        if (!"pending".equalsIgnoreCase(ext.getStatus())) {
            throw new RuntimeException("Request is already " + ext.getStatus());
        }

        ext.setStatus("rejected");
        ExtensionRequest saved = extensionRequestRepository.save(ext);

        // Generate staff notification
        Notification notif = Notification.builder()
                .id("NOTIF-EXT-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 4))
                .hospitalId(ext.getHospitalId() != null ? ext.getHospitalId() : "HOSP-001")
                .targetStaffId(ext.getStaffId())
                .type("extension_rejected")
                .severity("warning")
                .message("Your extension request for \"" + ext.getEquipmentName() + "\" has been REJECTED by administration.")
                .timestamp(LocalDateTime.now())
                .read(false)
                .build();
        notificationRepository.save(notif);

        return saved;
    }
}

