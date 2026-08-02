package com.mednexus.backend.repository;

import com.mednexus.backend.entity.ImmovableEquipment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImmovableEquipmentRepository extends JpaRepository<ImmovableEquipment, String> {

    List<ImmovableEquipment> findByHospitalId(String hospitalId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ImmovableEquipment e where e.id = :id")
    Optional<ImmovableEquipment> findByIdWithLock(@Param("id") String id);
}
