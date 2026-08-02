package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "immovable_equipment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImmovableEquipment {

    @Id
    @Column(length = 20)
    private String id; // IM-2001

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

    @Column(name = "slot_duration_mins")
    private Integer slotDurationMins;

    @Column(name = "operating_hours_start", length = 10)
    private String operatingHoursStart;

    @Column(name = "operating_hours_end", length = 10)
    private String operatingHoursEnd;
}
