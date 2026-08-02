package com.mednexus.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mednexus.backend.entity.*;
import com.mednexus.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Seeds the MySQL database from data/data.json on first run.
 * Skips seeding if data already exists.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final HospitalRepository hospitalRepo;
    private final StaffRepository staffRepo;
    private final MovableEquipmentRepository movableRepo;
    private final ImmovableEquipmentRepository immovableRepo;
    private final CheckoutRepository checkoutRepo;
    private final BookingRepository bookingRepo;
    private final NotificationRepository notificationRepo;
    private final ExtensionRequestRepository extensionRepo;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        if (hospitalRepo.count() > 0) {
            log.info("Database already contains data. Skipping data.json synchronization to preserve active records.");
            return;
        }

        log.info("Initial run: Seeding database from data.json ...");

        // Try to find data.json – first in relative path, then working dir, then classpath
        JsonNode root = null;
        Path projectDataPath = Path.of("../data/data.json"); // relative from backend/
        if (Files.exists(projectDataPath)) {
            root = objectMapper.readTree(projectDataPath.toFile());
            log.info("Loaded data.json from: {}", projectDataPath.toAbsolutePath());
        } else if (Files.exists(Path.of("data/data.json"))) {
            root = objectMapper.readTree(Path.of("data/data.json").toFile());
            log.info("Loaded data.json from working directory");
        } else {
            java.io.InputStream is = getClass().getResourceAsStream("/data.json");
            if (is == null) is = getClass().getResourceAsStream("/data/data.json");
            if (is != null) {
                root = objectMapper.readTree(is);
                log.info("Loaded data.json from classpath");
            } else {
                log.warn("data.json not found in filesystem or classpath. Skipping seed.");
                return;
            }
        }

        // Replace date placeholders in the raw JSON
        LocalDate today = LocalDate.now();
        String rawJson = objectMapper.writeValueAsString(root);
        rawJson = rawJson.replaceAll("\"__TODAY__\"", "\"" + today + "\"");
        rawJson = rawJson.replaceAll("\"__TODAY([+-])(\\d+)__\"", "");
        // Manual replacement for date offsets
        root = objectMapper.readTree(replaceDateTokens(objectMapper.writeValueAsString(root), today));

        // 1. Hospital
        JsonNode hospitalNode = root.get("hospital");
        if (hospitalNode != null) {
            Hospital h = Hospital.builder()
                    .id(hospitalNode.get("id").asText())
                    .name(hospitalNode.get("name").asText())
                    .city(hospitalNode.has("city") ? hospitalNode.get("city").asText() : null)
                    .timezone(hospitalNode.has("timezone") ? hospitalNode.get("timezone").asText() : null)
                    .build();
            hospitalRepo.save(h);
            log.info("  → Hospital: {}", h.getName());
        }

        // 2. Staff
        JsonNode staffArray = root.get("staff");
        if (staffArray != null && staffArray.isArray()) {
            int count = 0;
            for (JsonNode s : staffArray) {
                Staff staff = Staff.builder()
                        .id(s.get("id").asText())
                        .name(s.get("name").asText())
                        .role(textOrNull(s, "role"))
                        .department(textOrNull(s, "department"))
                        .password(s.get("password").asText())
                        .hospitalId(textOrNull(s, "hospital_id"))
                        .phone(textOrNull(s, "phone"))
                        .email(textOrNull(s, "email"))
                        .joinedYear(textOrNull(s, "joined_year"))
                        .experience(textOrNull(s, "experience"))
                        .professionalSummary(textOrNull(s, "professional_summary"))
                        .address(textOrNull(s, "address"))
                        .emergencyContact(textOrNull(s, "emergency_contact"))
                        .build();
                staffRepo.save(staff);
                count++;
            }
            log.info("  → Staff: {} records", count);
        }

        // 3. Movable Equipment
        JsonNode movableArray = root.get("movable_equipment");
        if (movableArray != null && movableArray.isArray()) {
            int count = 0;
            for (JsonNode m : movableArray) {
                MovableEquipment eq = MovableEquipment.builder()
                        .id(m.get("id").asText())
                        .name(m.get("name").asText())
                        .category(textOrNull(m, "category"))
                        .location(textOrNull(m, "location"))
                        .hospitalId(textOrNull(m, "hospital_id"))
                        .manufacturer(textOrNull(m, "manufacturer"))
                        .serialNumber(textOrNull(m, "serial_number"))
                        .status(textOrNull(m, "status"))
                        .build();
                movableRepo.save(eq);
                count++;
            }
            log.info("  → Movable Equipment: {} records", count);
        }

        // 4. Immovable Equipment
        JsonNode immovableArray = root.get("immovable_equipment");
        if (immovableArray != null && immovableArray.isArray()) {
            int count = 0;
            for (JsonNode im : immovableArray) {
                String ohStart = null, ohEnd = null;
                if (im.has("operating_hours")) {
                    JsonNode oh = im.get("operating_hours");
                    ohStart = textOrNull(oh, "start");
                    ohEnd = textOrNull(oh, "end");
                }
                ImmovableEquipment eq = ImmovableEquipment.builder()
                        .id(im.get("id").asText())
                        .name(im.get("name").asText())
                        .category(textOrNull(im, "category"))
                        .location(textOrNull(im, "location"))
                        .hospitalId(textOrNull(im, "hospital_id"))
                        .manufacturer(textOrNull(im, "manufacturer"))
                        .slotDurationMins(im.has("slot_duration_mins") ? im.get("slot_duration_mins").asInt() : null)
                        .operatingHoursStart(ohStart)
                        .operatingHoursEnd(ohEnd)
                        .build();
                immovableRepo.save(eq);
                count++;
            }
            log.info("  → Immovable Equipment: {} records", count);
        }

        // 5. Checkouts
        JsonNode checkoutArray = root.get("checkouts");
        if (checkoutArray != null && checkoutArray.isArray()) {
            int count = 0;
            for (JsonNode c : checkoutArray) {
                Checkout co = Checkout.builder()
                        .checkoutId(c.get("checkout_id").asText())
                        .hospitalId(textOrNull(c, "hospital_id"))
                        .equipmentId(textOrNull(c, "equipment_id"))
                        .equipmentName(textOrNull(c, "equipment_name"))
                        .staffId(textOrNull(c, "staff_id"))
                        .staffName(textOrNull(c, "staff_name"))
                        .checkoutDate(parseDate(c, "checkout_date"))
                        .dueDate(parseDate(c, "due_date"))
                        .status(textOrNull(c, "status"))
                        .extended(c.has("extended") ? c.get("extended").asBoolean() : false)
                        .notes(textOrNull(c, "notes"))
                        .returnLocation(textOrNull(c, "return_location"))
                        .returnDate(parseDate(c, "return_date"))
                        .build();
                checkoutRepo.save(co);
                count++;
            }
            log.info("  → Checkouts: {} records", count);
        }

        // 6. Bookings
        JsonNode bookingArray = root.get("bookings");
        if (bookingArray != null && bookingArray.isArray()) {
            int count = 0;
            for (JsonNode b : bookingArray) {
                Booking bk = Booking.builder()
                        .bookingId(b.get("booking_id").asText())
                        .hospitalId(textOrNull(b, "hospital_id"))
                        .equipmentId(textOrNull(b, "equipment_id"))
                        .equipmentName(textOrNull(b, "equipment_name"))
                        .patientName(textOrNull(b, "patient_name"))
                        .staffId(textOrNull(b, "staff_id"))
                        .staffName(textOrNull(b, "staff_name"))
                        .date(parseDate(b, "date"))
                        .startTime(textOrNull(b, "start_time"))
                        .endTime(textOrNull(b, "end_time"))
                        .priority(textOrNull(b, "priority"))
                        .department(textOrNull(b, "department"))
                        .status(textOrNull(b, "status"))
                        .pushedTo(textOrNull(b, "pushed_to"))
                        .build();
                bookingRepo.save(bk);
                count++;
            }
            log.info("  → Bookings: {} records", count);
        }

        // 7. Notifications
        JsonNode notifArray = root.get("notifications");
        if (notifArray != null && notifArray.isArray()) {
            int count = 0;
            for (JsonNode n : notifArray) {
                Notification notif = Notification.builder()
                        .id(n.get("id").asText())
                        .hospitalId(textOrNull(n, "hospital_id"))
                        .targetStaffId(textOrNull(n, "target_staff_id"))
                        .type(textOrNull(n, "type"))
                        .severity(textOrNull(n, "severity"))
                        .message(textOrNull(n, "message"))
                        .timestamp(
                                n.has("timestamp") ? LocalDateTime.parse(n.get("timestamp").asText().replace("Z", ""))
                                        : null)
                        .read(n.has("read") ? n.get("read").asBoolean() : false)
                        .build();
                notificationRepo.save(notif);
                count++;
            }
            log.info("  → Notifications: {} records", count);
        }

        // 8. Extension Requests
        JsonNode extArray = root.get("extension_requests");
        if (extArray != null && extArray.isArray()) {
            int count = 0;
            for (JsonNode e : extArray) {
                ExtensionRequest ext = ExtensionRequest.builder()
                        .id(e.get("id").asText())
                        .checkoutId(textOrNull(e, "checkout_id"))
                        .hospitalId(textOrNull(e, "hospital_id"))
                        .staffId(textOrNull(e, "staff_id"))
                        .staffName(textOrNull(e, "staff_name"))
                        .equipmentName(textOrNull(e, "equipment_name"))
                        .currentDue(parseDate(e, "current_due"))
                        .requestedDue(parseDate(e, "requested_due"))
                        .reason(textOrNull(e, "reason"))
                        .status(textOrNull(e, "status"))
                        .timestamp(
                                e.has("timestamp") ? LocalDateTime.parse(e.get("timestamp").asText().replace("Z", ""))
                                        : null)
                        .build();
                extensionRepo.save(ext);
                count++;
            }
            log.info("  → Extension Requests: {} records", count);
        }

        log.info("Database seeding complete!");
    }

    // ── Helpers ──────────────────────────────────────────────────

    private String textOrNull(JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : null;
    }

    private LocalDate parseDate(JsonNode node, String field) {
        String val = textOrNull(node, field);
        if (val == null || val.startsWith("__"))
            return null;
        try {
            return LocalDate.parse(val);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Replace date tokens like __TODAY__, __TODAY+2__, __TODAY-3__ with actual
     * dates
     */
    private String replaceDateTokens(String json, LocalDate today) {
        // Replace __TODAY__ first
        json = json.replace("\"__TODAY__\"", "\"" + today + "\"");

        // Replace __TODAY+N__ and __TODAY-N__
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"__TODAY([+-])(\\d+)__\"");
        java.util.regex.Matcher matcher = pattern.matcher(json);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String sign = matcher.group(1);
            int offset = Integer.parseInt(matcher.group(2));
            LocalDate d = "+".equals(sign) ? today.plusDays(offset) : today.minusDays(offset);
            matcher.appendReplacement(sb, "\"" + d + "\"");
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
}
