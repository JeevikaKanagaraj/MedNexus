package com.mednexus.backend.repository;

import com.mednexus.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    /** Sorted descending by timestamp so newest always comes first */
    List<Notification> findByTargetStaffIdOrderByTimestampDesc(String staffId);

    List<Notification> findByTargetStaffIdAndReadFalseOrderByTimestampDesc(String staffId);

    List<Notification> findByHospitalIdOrderByTimestampDesc(String hospitalId);

    long countByTargetStaffIdAndReadFalse(String staffId);

    void deleteByTargetStaffId(String staffId);
}
