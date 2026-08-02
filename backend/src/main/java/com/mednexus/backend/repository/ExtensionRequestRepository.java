package com.mednexus.backend.repository;

import com.mednexus.backend.entity.ExtensionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExtensionRequestRepository extends JpaRepository<ExtensionRequest, String> {

    List<ExtensionRequest> findByHospitalId(String hospitalId);

    List<ExtensionRequest> findByStaffId(String staffId);

    List<ExtensionRequest> findByStatus(String status);

    List<ExtensionRequest> findByHospitalIdAndStatus(String hospitalId, String status);

    List<ExtensionRequest> findByCheckoutId(String checkoutId);
}
