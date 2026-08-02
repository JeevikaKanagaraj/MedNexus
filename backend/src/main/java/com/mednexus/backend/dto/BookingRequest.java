package com.mednexus.backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class BookingRequest {
    private String equipmentId;
    private String patientName;
    private String staffId;
    private LocalDate date;
    private String startTime;
    private String endTime;
    private String priority;
    private String department;
}
