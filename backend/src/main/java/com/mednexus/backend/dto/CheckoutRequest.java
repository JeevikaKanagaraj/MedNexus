package com.mednexus.backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CheckoutRequest {
    private String equipmentId;
    private String staffId;
    private LocalDate dueDate;
    private String notes;
    private boolean isExtensionRequested;
    private LocalDate requestedDueDate;
    private String extensionReason;
}
