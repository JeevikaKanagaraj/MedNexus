package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "movable_equipment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovableEquipment {

    @Id
    @Column(length = 20)
    private String id; // MV-1001

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 40)
    private String category;

    @Column(length = 60)
    private String location;

    @Column(name = "hospital_id", length = 20)
    private String hospitalId;

    @Column(length = 60)
    private String manufacturer;

    @Column(name = "serial_number", length = 40)
    private String serialNumber;

    @Column(length = 20)
    private String status; // available, checked_out

    @Column(name = "maintenance_cycle_days")
    private Integer maintenanceCycleDays;
}
