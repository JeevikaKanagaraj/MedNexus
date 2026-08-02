package com.mednexus.backend.repository;

import com.mednexus.backend.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff, String> {

    List<Staff> findByHospitalId(String hospitalId);

    Optional<Staff> findByIdAndPassword(String id, String password);

    List<Staff> findByDepartment(String department);

    List<Staff> findByRole(String role);
}
