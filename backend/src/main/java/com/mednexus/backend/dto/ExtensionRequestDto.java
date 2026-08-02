package com.mednexus.backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ExtensionRequestDto {
    private String checkoutId;
    private String staffId;
    private String equipmentName;
    private String hospitalId;
    private LocalDate currentDue;
    private LocalDate requestedDue;
    private String reason;
}

