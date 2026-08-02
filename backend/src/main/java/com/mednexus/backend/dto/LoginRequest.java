package com.mednexus.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class LoginRequest {
    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("password")
    private String password;
}
