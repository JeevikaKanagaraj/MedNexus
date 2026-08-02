package com.mednexus.backend.repository;

import com.mednexus.backend.entity.MovableEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovableEquipmentRepository extends JpaRepository<MovableEquipment, String> {

    List<MovableEquipment> findByHospitalId(String hospitalId);

    List<MovableEquipment> findByStatus(String status);

    List<MovableEquipment> findByHospitalIdAndStatus(String hospitalId, String status);
}
