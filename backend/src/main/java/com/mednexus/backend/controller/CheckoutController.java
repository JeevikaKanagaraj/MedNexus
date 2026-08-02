package com.mednexus.backend.controller;

import com.mednexus.backend.dto.ApiResponse;
import com.mednexus.backend.dto.CheckoutRequest;
import com.mednexus.backend.entity.Checkout;
import com.mednexus.backend.service.CheckoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checkouts")
@RequiredArgsConstructor
public class CheckoutController {

    private final CheckoutService checkoutService;

    @GetMapping
    public ResponseEntity<List<Checkout>> getAll() {
        return ResponseEntity.ok(checkoutService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return checkoutService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<Checkout>> getByStaff(@PathVariable String staffId) {
        return ResponseEntity.ok(checkoutService.getByStaffId(staffId));
    }

    @GetMapping("/staff/{staffId}/active")
    public ResponseEntity<List<Checkout>> getActiveByStaff(@PathVariable String staffId) {
        return ResponseEntity.ok(checkoutService.getActiveByStaffId(staffId));
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<Checkout>> getByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(checkoutService.getByHospital(hospitalId));
    }

    @GetMapping("/hospital/{hospitalId}/active")
    public ResponseEntity<List<Checkout>> getActiveByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(checkoutService.getActiveByHospital(hospitalId));
    }

    /**
     * POST /api/checkouts – create a new checkout
     */
    @PostMapping
    public ResponseEntity<?> createCheckout(@RequestBody CheckoutRequest request) {
        try {
            Checkout checkout = checkoutService.createCheckout(request);
            return ResponseEntity.ok(ApiResponse.ok("Equipment checked out successfully.", checkout));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/checkouts/{id}/return
     */
    @PutMapping("/{id}/return")
    public ResponseEntity<?> returnEquipment(@PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String returnLocation = null;
            if (body != null) {
                returnLocation = body.get("return_location");
                if (returnLocation == null) {
                    returnLocation = body.get("returnLocation");
                }
            }
            Checkout checkout = checkoutService.returnEquipment(id, returnLocation);
            return ResponseEntity.ok(ApiResponse.ok("Equipment returned successfully.", checkout));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/checkouts/{id}/extend
     * Body: { "new_due_date": "2026-03-15" } or { "newDueDate": "2026-03-15" }
     */
    @PutMapping("/{id}/extend")
    public ResponseEntity<?> extendCheckout(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String newDueStr = null;
            if (body != null) {
                newDueStr = body.get("new_due_date");
                if (newDueStr == null) {
                    newDueStr = body.get("newDueDate");
                }
            }
            LocalDate newDue = (newDueStr != null && !newDueStr.isEmpty())
                    ? LocalDate.parse(newDueStr)
                    : LocalDate.now().plusDays(15);
            Checkout checkout = checkoutService.extendCheckout(id, newDue);
            return ResponseEntity.ok(ApiResponse.ok("Checkout extended successfully.", checkout));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
