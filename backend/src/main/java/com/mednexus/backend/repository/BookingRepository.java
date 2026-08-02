package com.mednexus.backend.repository;

import com.mednexus.backend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {

    List<Booking> findByHospitalId(String hospitalId);

    List<Booking> findByStaffId(String staffId);

    List<Booking> findByDate(LocalDate date);

    List<Booking> findByDateAndEquipmentId(LocalDate date, String equipmentId);

    List<Booking> findByHospitalIdAndDate(String hospitalId, LocalDate date);

    List<Booking> findByStaffIdAndDate(String staffId, LocalDate date);

    List<Booking> findByEquipmentId(String equipmentId);
}
