package com.mednexus.backend.controller;

import com.mednexus.backend.dto.ApiResponse;
import com.mednexus.backend.entity.Notification;
import com.mednexus.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<Notification>> getByStaff(@PathVariable String staffId) {
        return ResponseEntity.ok(notificationService.getByStaffId(staffId));
    }

    @GetMapping("/staff/{staffId}/unread")
    public ResponseEntity<List<Notification>> getUnread(@PathVariable String staffId) {
        return ResponseEntity.ok(notificationService.getUnreadByStaffId(staffId));
    }

    @GetMapping("/staff/{staffId}/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable String staffId) {
        long count = notificationService.getUnreadCount(staffId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<Notification>> getByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(notificationService.getByHospital(hospitalId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id) {
        try {
            Notification n = notificationService.markAsRead(id);
            return ResponseEntity.ok(ApiResponse.ok("Marked as read.", n));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/staff/{staffId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable String staffId) {
        notificationService.markAllAsRead(staffId);
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read."));
    }

    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Notification n) {
        return ResponseEntity.ok(notificationService.save(n));
    }

    @DeleteMapping("/staff/{staffId}")
    public ResponseEntity<?> clearNotifications(@PathVariable String staffId) {
        notificationService.deleteAllByStaffId(staffId);
        return ResponseEntity.ok(ApiResponse.ok("Notifications cleared."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable String id) {
        notificationService.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Notification deleted."));
    }
}
