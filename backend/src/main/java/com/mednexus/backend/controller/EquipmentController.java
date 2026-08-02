package com.mednexus.backend.controller;

import com.mednexus.backend.entity.MovableEquipment;
import com.mednexus.backend.entity.ImmovableEquipment;
import com.mednexus.backend.repository.MovableEquipmentRepository;
import com.mednexus.backend.repository.ImmovableEquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipment")
@RequiredArgsConstructor
public class EquipmentController {

    private final MovableEquipmentRepository movableRepo;
    private final ImmovableEquipmentRepository immovableRepo;

    // ── Movable Equipment ────────────────────────────────────────
    
    @PostMapping("/movable")
    public ResponseEntity<MovableEquipment> addMovable(@RequestBody MovableEquipment eq) {
        if (eq.getSerialNumber() == null || eq.getSerialNumber().trim().isEmpty()) {
            eq.setSerialNumber("EQP-" + java.time.Instant.now().toEpochMilli());
        }
        return ResponseEntity.ok(movableRepo.save(eq));
    }
    
    @DeleteMapping("/movable/{id}")
    public ResponseEntity<?> deleteMovable(@PathVariable String id) {
        movableRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }
    

    @GetMapping("/movable")
    public ResponseEntity<List<MovableEquipment>> getAllMovable() {
        return ResponseEntity.ok(movableRepo.findAll());
    }

    @GetMapping("/movable/{id}")
    public ResponseEntity<?> getMovableById(@PathVariable String id) {
        return movableRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/movable/hospital/{hospitalId}")
    public ResponseEntity<List<MovableEquipment>> getMovableByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(movableRepo.findByHospitalId(hospitalId));
    }

    @GetMapping("/movable/available")
    public ResponseEntity<List<MovableEquipment>> getAvailableMovable(
            @RequestParam(required = false) String hospitalId) {
        if (hospitalId != null) {
            return ResponseEntity.ok(movableRepo.findByHospitalIdAndStatus(hospitalId, "available"));
        }
        return ResponseEntity.ok(movableRepo.findByStatus("available"));
    }

    // ── Immovable Equipment ──────────────────────────────────────
    
    @PostMapping("/immovable")
    public ResponseEntity<ImmovableEquipment> addImmovable(@RequestBody ImmovableEquipment eq) {
        return ResponseEntity.ok(immovableRepo.save(eq));
    }
    
    @DeleteMapping("/immovable/{id}")
    public ResponseEntity<?> deleteImmovable(@PathVariable String id) {
        immovableRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }
    

    @GetMapping("/immovable")
    public ResponseEntity<List<ImmovableEquipment>> getAllImmovable() {
        return ResponseEntity.ok(immovableRepo.findAll());
    }

    @GetMapping("/immovable/{id}")
    public ResponseEntity<?> getImmovableById(@PathVariable String id) {
        return immovableRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/immovable/hospital/{hospitalId}")
    public ResponseEntity<List<ImmovableEquipment>> getImmovableByHospital(@PathVariable String hospitalId) {
        return ResponseEntity.ok(immovableRepo.findByHospitalId(hospitalId));
    }
}
