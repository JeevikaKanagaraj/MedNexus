package com.mednexus.backend.controller;

import com.mednexus.backend.dto.ApiResponse;
import com.mednexus.backend.dto.ExtensionRequestDto;
import com.mednexus.backend.entity.ExtensionRequest;
import com.mednexus.backend.service.ExtensionRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/extensions")
@RequiredArgsConstructor
public class ExtensionRequestController {

    private final ExtensionRequestService extensionService;

    @GetMapping
    public ResponseEntity<List<ExtensionRequest>> getAll() {
        return ResponseEntity.ok(extensionService.getAll());
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<ExtensionRequest>> getByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(extensionService.getByHospital(hospitalId));
    }

    @GetMapping("/hospital/{hospitalId}/pending")
    public ResponseEntity<List<ExtensionRequest>> getPending(@PathVariable String hospitalId) {
        return ResponseEntity.ok(extensionService.getPending(hospitalId));
    }

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<ExtensionRequest>> getByStaff(@PathVariable String staffId) {
        return ResponseEntity.ok(extensionService.getByStaff(staffId));
    }

    /**
     * POST /api/extensions – staff requests an extension
     */
    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody ExtensionRequestDto request) {
        try {
            ExtensionRequest ext = extensionService.createRequest(request);
            return ResponseEntity.ok(ApiResponse.ok("Extension request submitted.", ext));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/extensions/{id}/approve – admin approves
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable String id) {
        try {
            ExtensionRequest ext = extensionService.approveRequest(id);
            return ResponseEntity.ok(ApiResponse.ok("Extension approved.", ext));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/extensions/{id}/reject – admin rejects
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable String id) {
        try {
            ExtensionRequest ext = extensionService.rejectRequest(id);
            return ResponseEntity.ok(ApiResponse.ok("Extension rejected.", ext));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
