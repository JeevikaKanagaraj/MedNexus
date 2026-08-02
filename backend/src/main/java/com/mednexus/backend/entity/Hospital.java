package com.mednexus.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "hospitals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hospital {

    @Id
    @Column(length = 20)
    private String id; // HOSP-001

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 60)
    private String city;

    @Column(length = 40)
    private String timezone;
}
