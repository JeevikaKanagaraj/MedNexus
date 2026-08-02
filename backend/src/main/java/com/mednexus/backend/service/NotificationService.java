package com.mednexus.backend.service;

import com.mednexus.backend.entity.Notification;
import com.mednexus.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public List<Notification> getByStaffId(String staffId) {
        return notificationRepository.findByTargetStaffIdOrderByTimestampDesc(staffId);
    }

    public List<Notification> getUnreadByStaffId(String staffId) {
        return notificationRepository.findByTargetStaffIdAndReadFalseOrderByTimestampDesc(staffId);
    }

    public long getUnreadCount(String staffId) {
        return notificationRepository.countByTargetStaffIdAndReadFalse(staffId);
    }

    public List<Notification> getByHospital(String hospitalId) {
        return notificationRepository.findByHospitalIdOrderByTimestampDesc(hospitalId);
    }

    @Transactional
    public Notification markAsRead(String notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        n.setRead(true);
        return notificationRepository.save(n);
    }

    @Transactional
    public void markAllAsRead(String staffId) {
        List<Notification> unread = notificationRepository.findByTargetStaffIdAndReadFalseOrderByTimestampDesc(staffId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public Notification createNotification(String hospitalId, String targetStaffId,
            String type, String severity, String message) {
        String id = "NOTIF-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Notification n = Notification.builder()
                .id(id)
                .hospitalId(hospitalId)
                .targetStaffId(targetStaffId)
                .type(type)
                .severity(severity)
                .message(message)
                .timestamp(LocalDateTime.now())
                .read(false)
                .build();
        return notificationRepository.save(n);
    }

    @Transactional
    public void deleteAllByStaffId(String staffId) {
        notificationRepository.deleteByTargetStaffId(staffId);
    }

    @Transactional
    public void deleteById(String id) {
        notificationRepository.deleteById(id);
    }

    public Notification save(Notification n) {
        if (n.getId() == null || n.getId().isEmpty()) {
            n.setId("NOTIF-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        }
        if (n.getTimestamp() == null) {
            n.setTimestamp(LocalDateTime.now());
        }
        return notificationRepository.save(n);
    }
}
