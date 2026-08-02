package com.mednexus.backend.controller;

import com.mednexus.backend.dto.LoginRequest;
import com.mednexus.backend.dto.LoginResponse;
import com.mednexus.backend.entity.Staff;
import com.mednexus.backend.service.StaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    @PostMapping("/staff")
    public ResponseEntity<Staff> addStaff(@RequestBody Staff staff) {
        // ideally use service but repo isn't autowired here; wait, AuthController uses
        // staffService
        return ResponseEntity.ok(staffService.addStaff(staff));
    }

    @DeleteMapping("/staff/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable String id) {
        staffService.deleteStaff(id);
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/staff/{id}/profile – staff updates their own contact details
     * Accepts only: email, phone, address, emergency_contact
     * Called by staff dashboard handleSaveProfile()
     */
    @PutMapping("/staff/{id}/profile")
    public ResponseEntity<Staff> updateStaffProfile(
            @PathVariable String id,
            @RequestBody java.util.Map<String, String> body) {
        return staffService.getStaffById(id.toUpperCase())
                .map(existing -> {
                    if (body.containsKey("email") && body.get("email") != null)
                        existing.setEmail(body.get("email"));
                    if (body.containsKey("phone") && body.get("phone") != null)
                        existing.setPhone(body.get("phone"));
                    if (body.containsKey("address") && body.get("address") != null)
                        existing.setAddress(body.get("address"));
                    if (body.containsKey("emergency_contact") && body.get("emergency_contact") != null)
                        existing.setEmergencyContact(body.get("emergency_contact"));
                    return ResponseEntity.ok(staffService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<Staff> updateStaff(@PathVariable String id, @RequestBody Staff staff) {
        return staffService.getStaffById(id.toUpperCase())
                .map(existing -> {
                    if (staff.getName() != null)
                        existing.setName(staff.getName());
                    if (staff.getEmail() != null)
                        existing.setEmail(staff.getEmail());
                    if (staff.getPhone() != null)
                        existing.setPhone(staff.getPhone());
                    if (staff.getAddress() != null)
                        existing.setAddress(staff.getAddress());
                    if (staff.getEmergencyContact() != null)
                        existing.setEmergencyContact(staff.getEmergencyContact());
                    if (staff.getRole() != null)
                        existing.setRole(staff.getRole());
                    if (staff.getDepartment() != null)
                        existing.setDepartment(staff.getDepartment());
                    if (staff.getJoinedYear() != null)
                        existing.setJoinedYear(staff.getJoinedYear());
                    if (staff.getExperience() != null)
                        existing.setExperience(staff.getExperience());
                    if (staff.getProfessionalSummary() != null)
                        existing.setProfessionalSummary(staff.getProfessionalSummary());

                    return ResponseEntity.ok(staffService.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private final StaffService staffService;

    /**
     * POST /api/auth/login
     * Body: { "userId": "ADM-001", "password": "admin123" }
     */
    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = staffService.authenticate(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).body(response);
    }

    /**
     * GET /api/staff – all staff
     */
    @GetMapping("/staff")
    public ResponseEntity<List<Staff>> getAllStaff() {
        return ResponseEntity.ok(staffService.getAllStaff());
    }

    /**
     * GET /api/staff/{id} – single staff by ID
     */
    @GetMapping("/staff/{id}")
    public ResponseEntity<?> getStaffById(@PathVariable String id) {
        return staffService.getStaffById(id.toUpperCase())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/staff/hospital/{hospitalId}
     */
    @GetMapping("/staff/hospital/{hospitalId}")
    public ResponseEntity<List<Staff>> getStaffByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(staffService.getStaffByHospital(hospitalId));
    }

    /**
     * GET /api/staff/department/{dept}
     */
    @GetMapping("/staff/department/{dept}")
    public ResponseEntity<List<Staff>> getStaffByDepartment(@PathVariable String dept) {
        return ResponseEntity.ok(staffService.getStaffByDepartment(dept));
    }
}
