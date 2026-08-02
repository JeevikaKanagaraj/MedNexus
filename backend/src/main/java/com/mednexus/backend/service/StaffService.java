package com.mednexus.backend.service;

import com.mednexus.backend.dto.LoginRequest;
import com.mednexus.backend.dto.LoginResponse;
import com.mednexus.backend.entity.Staff;
import com.mednexus.backend.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final StaffRepository staffRepository;

    /**
     * Authenticate a user by ID + password
     */
    public LoginResponse authenticate(LoginRequest request) {
        String id = request.getUserId().trim().toUpperCase();
        Optional<Staff> match = staffRepository.findById(id);

        if (match.isEmpty() || !match.get().getPassword().equals(request.getPassword())) {
            return LoginResponse.builder()
                    .success(false)
                    .message("Invalid User ID or Password.")
                    .build();
        }

        Staff user = match.get();
        String role = id.startsWith("ADM-") ? "Admin" : "Staff";

        return LoginResponse.builder()
                .success(true)
                .user(user)
                .role(role)
                .build();
    }

    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }

    public Optional<Staff> getStaffById(String id) {
        return staffRepository.findById(id);
    }

    public List<Staff> getStaffByHospital(String hospitalId) {
        return staffRepository.findByHospitalId(hospitalId);
    }

    public Staff addStaff(Staff staff) {
        return staffRepository.save(staff);
    }
    
    public void deleteStaff(String id) {
        staffRepository.deleteById(id);
    }
    
    public List<Staff> getStaffByDepartment(String department) {
        return staffRepository.findByDepartment(department);
    }

    public Staff save(Staff staff) {
        return staffRepository.save(staff);
    }
}
