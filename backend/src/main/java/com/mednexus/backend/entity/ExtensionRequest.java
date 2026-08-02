package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "extension_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtensionRequest {

    @Id
    @Column(length = 20)
    private String id; // EXT-001

    @Column(name = "checkout_id", length = 20)
    private String checkoutId;

    @Column(name = "hospital_id", length = 20)
    private String hospitalId;

    @Column(name = "staff_id", length = 20)
    private String staffId;

    @Column(name = "staff_name", length = 100)
    private String staffName;

    @Column(name = "equipment_name", length = 80)
    private String equipmentName;

    @Column(name = "current_due")
    private LocalDate currentDue;

    @Column(name = "requested_due")
    private LocalDate requestedDue;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(length = 20)
    private String status; // pending, approved, rejected

    @Column
    private LocalDateTime timestamp;
}
