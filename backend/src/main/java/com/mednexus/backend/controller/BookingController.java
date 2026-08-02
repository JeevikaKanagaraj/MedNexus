package com.mednexus.backend.controller;

import com.mednexus.backend.dto.ApiResponse;
import com.mednexus.backend.dto.BookingRequest;
import com.mednexus.backend.entity.Booking;
import com.mednexus.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping
    public ResponseEntity<List<Booking>> getAll() {
        return ResponseEntity.ok(bookingService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return bookingService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<Booking>> getByStaff(@PathVariable String staffId) {
        return ResponseEntity.ok(bookingService.getByStaffId(staffId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<Booking>> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(bookingService.getByDate(date));
    }

    @GetMapping("/hospital/{hospitalId}/date/{date}")
    public ResponseEntity<List<Booking>> getByHospitalAndDate(
            @PathVariable String hospitalId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(bookingService.getByHospitalAndDate(hospitalId, date));
    }

    @GetMapping("/staff/{staffId}/date/{date}")
    public ResponseEntity<List<Booking>> getByStaffAndDate(
            @PathVariable String staffId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(bookingService.getByStaffAndDate(staffId, date));
    }

    @GetMapping("/equipment/{equipmentId}")
    public ResponseEntity<List<Booking>> getByEquipment(@PathVariable String equipmentId) {
        return ResponseEntity.ok(bookingService.getByEquipmentId(equipmentId));
    }

    /**
     * POST /api/bookings – create a new booking with conflict detection
     */
    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody BookingRequest request) {
        try {
            Booking booking = bookingService.createBooking(request);
            if ("PENDING_TRIAGE".equals(booking.getStatus())) {
                return ResponseEntity.ok(ApiResponse.ok("Slot occupied by another High Emergency. Escalated to Admin for immediate triage.", booking));
            }
            return ResponseEntity.ok(ApiResponse.ok("Booking confirmed successfully.", booking));
        } catch (RuntimeException e) {
            e.printStackTrace(); return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * PUT /api/bookings/{id}/cancel
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable String id) {
        try {
            Booking booking = bookingService.cancelBooking(id);
            return ResponseEntity.ok(ApiResponse.ok("Booking cancelled.", booking));
        } catch (RuntimeException e) {
            e.printStackTrace(); return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBooking(@PathVariable String id, @RequestBody BookingRequest request) {
        try {
            Booking booking = bookingService.updateBooking(id, request);
            return ResponseEntity.ok(ApiResponse.ok("Booking updated successfully.", booking));
        } catch (RuntimeException e) {
            e.printStackTrace(); return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/bookings/triage/pending — list all bookings in PENDING_TRIAGE state
     */
    @GetMapping("/triage/pending")
    public ResponseEntity<List<Booking>> getPendingTriage() {
        return ResponseEntity.ok(bookingService.getPendingTriageBookings());
    }

    /**
     * POST /api/bookings/triage/resolve
     * Body: { "winnerBookingId": "BKG-xxx", "loserBookingId": "BKG-yyy" }
     * Admin selects winner → loser is cascaded to next slot
     */
    @PostMapping("/triage/resolve")
    public ResponseEntity<?> resolveTriageConflict(@RequestBody Map<String, String> body) {
        try {
            String winnerId = body.get("winnerBookingId");
            String loserId = body.get("loserBookingId");
            if (winnerId == null || loserId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("winnerBookingId and loserBookingId are required."));
            }
            bookingService.resolveTriageConflict(winnerId, loserId);
            return ResponseEntity.ok(ApiResponse.ok("Triage resolution complete. Selected booking confirmed and displaced booking automatically rescheduled."));
        } catch (RuntimeException e) {
            e.printStackTrace(); return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
