package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @Column(name = "booking_id", length = 20)
    private String bookingId; // BKG-001

    @Column(name = "hospital_id", length = 20)
    private String hospitalId;

    @Column(name = "equipment_id", length = 20)
    private String equipmentId;

    @Column(name = "equipment_name", length = 80)
    private String equipmentName;

    @Column(name = "patient_name", length = 100)
    private String patientName;

    @Column(name = "staff_id", length = 20)
    private String staffId;

    @Column(name = "staff_name", length = 100)
    private String staffName;

    @Column
    private LocalDate date;

    @Column(name = "start_time", length = 10)
    private String startTime;

    @Column(name = "end_time", length = 10)
    private String endTime;

    @Column(length = 30)
    private String priority; // Normal, Emergency, High Emergency

    @Column(length = 60)
    private String department;

    @Column(length = 30)
    private String status; // confirmed, completed, cancelled, pushed_back, PENDING_TRIAGE

    @Column(name = "pushed_to", length = 10)
    private String pushedTo;

    @Column(name = "displacement_count")
    private Integer displacementCount = 0; // How many times this booking was pushed back
}
