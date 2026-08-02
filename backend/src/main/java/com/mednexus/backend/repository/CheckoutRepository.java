package com.mednexus.backend.repository;

import com.mednexus.backend.entity.Checkout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CheckoutRepository extends JpaRepository<Checkout, String> {

    List<Checkout> findByHospitalId(String hospitalId);

    List<Checkout> findByStaffId(String staffId);

    List<Checkout> findByStatus(String status);

    List<Checkout> findByStaffIdAndStatus(String staffId, String status);

    List<Checkout> findByHospitalIdAndStatus(String hospitalId, String status);

    List<Checkout> findByEquipmentIdAndStatus(String equipmentId, String status);
}
