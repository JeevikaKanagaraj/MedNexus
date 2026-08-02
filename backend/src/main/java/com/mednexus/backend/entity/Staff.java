package com.mednexus.backend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "staff")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Staff {

    @Id
    @Column(length = 20)
    private String id; // ADM-001, ST-101

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 40)
    private String role;

    @Column(length = 60)
    private String department;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false, length = 100)
    private String password;

    @Column(name = "hospital_id", length = 20)
    private String hospitalId;

    @Column(length = 20)
    private String phone;

    @Column(length = 80)
    private String email;

    @Column(name = "joined_year", length = 10)
    private String joinedYear;

    @Column(length = 20)
    private String experience;

    @Column(name = "professional_summary", columnDefinition = "TEXT")
    private String professionalSummary;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "emergency_contact", length = 120)
    private String emergencyContact;
}
