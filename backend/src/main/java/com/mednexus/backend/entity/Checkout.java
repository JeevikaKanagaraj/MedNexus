package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "checkouts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Checkout {

    @Id
    @Column(name = "checkout_id", length = 20)
    private String checkoutId; // CHK-001

    @Column(name = "hospital_id", length = 20)
    private String hospitalId;

    @Column(name = "equipment_id", length = 20)
    private String equipmentId;

    @Column(name = "equipment_name", length = 80)
    private String equipmentName;

    @Column(name = "staff_id", length = 20)
    private String staffId;

    @Column(name = "staff_name", length = 100)
    private String staffName;

    @Column(name = "checkout_date")
    private LocalDate checkoutDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(length = 20)
    private String status; // active, completed

    @Column
    private Boolean extended;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "return_location", length = 150)
    private String returnLocation;

    @Column(name = "return_date")
    private LocalDate returnDate;
}
