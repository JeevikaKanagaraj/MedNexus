package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @Column(length = 64)
    private String id; // NOTIF-001

    @Column(name = "hospital_id", length = 20)
    private String hospitalId;

    @Column(name = "target_staff_id", length = 20)
    private String targetStaffId;

    @Column(length = 30)
    private String type; // overdue_alert, critical_overdue

    @Column(length = 20)
    private String severity; // info, warning, critical

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column
    private LocalDateTime timestamp;

    @Column(name = "is_read")
    private Boolean read;
}
