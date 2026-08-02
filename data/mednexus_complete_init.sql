-- MedNexus Complete Database Initialization Script
CREATE DATABASE IF NOT EXISTS mednexus_db;
USE mednexus_db;

-- 1. Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(60),
    timezone VARCHAR(40)
);

INSERT INTO hospitals (id, name, city, timezone) VALUES 
('HOSP-001', 'Apex Care Hospital', 'Chennai', 'Asia/Kolkata');

-- 2. Staff
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(40),
    department VARCHAR(60),
    password VARCHAR(100) NOT NULL,
    hospital_id VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(80),
    joined_year VARCHAR(10),
    experience VARCHAR(20),
    professional_summary TEXT,
    address TEXT,
    emergency_contact VARCHAR(120),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO staff (id, name, role, department, password, hospital_id, phone, email, joined_year, experience, professional_summary, address, emergency_contact) VALUES
('ADM-001', 'Dr. Aniruddh', 'Admin', 'Administration', 'admin123', 'HOSP-001', '+91 98401 23456', 'aniruddh.admin@mednexus.com', '2015', '9 Years', 'Chief Administrator with 20+ years in healthcare operations.', '12, Harrington Road, Chetpet, Chennai 600031', 'Mrs. Priya S. - +91 98401 22233'),
('ADM-002', 'Dr. Meera', 'Admin', 'Administration', 'admin123', 'HOSP-001', '+91 98402 33445', 'meera.v@mednexus.com', '2018', '6 Years', 'Senior Quality Controller and Operations Manager.', 'Apartment 5B, Skyview, Anna Nagar, Chennai 600102', 'Vasudevan R. - +91 98402 11111'),
('ST-101', 'Nurse Bindu', 'Nurse', 'ICU', 'staff123', 'HOSP-001', '+91 91761 11001', 'bindu.n@mednexus.com', '2016', '8 Years', 'Senior Critical Care Nurse.', 'Plot 45, Anna Nagar East, Chennai 600102', 'Mohan Nair - +91 91761 22222'),
('ST-102', 'Arun', 'Technician', 'Radiology', 'staff123', 'HOSP-001', '+91 91762 22001', 'arun.p@mednexus.com', '2020', '4 Years', 'Chief Radiographer.', 'T.Nagar, Chennai 600017', 'Leela Pillai - +91 91762 00000'),
('ST-103', 'Dr. Ramesh', 'Surgeon', 'Surgery', 'staff123', 'HOSP-001', '+91 99401 55001', 'ramesh.v@mednexus.com', '2012', '12 Years', 'Senior Cardiothoracic Surgeon.', 'Poes Garden, Chennai 600086', 'Gita V. - +91 99401 00000'),
('ST-104', 'Nurse Kavitha', 'Nurse', 'Emergency', 'staff123', 'HOSP-001', '+91 98840 88001', 'kavitha.m@mednexus.com', '2019', '5 Years', 'Trauma Care Specialist.', 'Sardar Patel Road, Adyar, Chennai 600020', 'Murugan G. - +91 98840 00000'),
('ST-105', 'Vijay', 'Support', 'Emergency', 'staff123', 'HOSP-001', '+91 94440 44001', 'vijay.r@mednexus.com', '2021', '3 Years', 'Patient Flow Coordinator.', 'Rose Garden, Velachery, Chennai 600042', 'Anitha R. - +91 94440 00000'),
('ST-106', 'Nurse Mary', 'Nurse', 'Cardiology', 'staff123', 'HOSP-001', '+91 91763 33001', 'mary.k@mednexus.com', NULL, NULL, 'Cardiac Ward Supervisor.', 'Choolaimedu, Chennai 600094', 'Thomas K. - +91 91763 00000'),
('ST-107', 'Dr. Senthil', 'Physician', 'Orthopaedics', 'staff123', 'HOSP-001', '+91 99620 66001', 'senthil.k@mednexus.com', NULL, NULL, 'Orthopaedic Consultant.', 'Besant Nagar, Chennai 600090', 'Meena K. - +91 99620 00000');

-- 3. Movable Equipment
CREATE TABLE IF NOT EXISTS movable_equipment (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    category VARCHAR(40),
    location VARCHAR(60),
    hospital_id VARCHAR(20),
    manufacturer VARCHAR(60),
    serial_number VARCHAR(40),
    status VARCHAR(20),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO movable_equipment (id, name, category, location, hospital_id, manufacturer, serial_number, status) VALUES
('MV-1001', 'ICU Monitor', 'Monitoring', 'ICU Storage', 'HOSP-001', 'BPL', 'MN-M001', 'available'),
('MV-1002', 'Infusion Pump', 'Infusion', 'ER Main', 'HOSP-001', 'Mindray', 'MN-I002', 'available'),
('MV-1003', 'Portable Ultrasound', 'Imaging', 'Radio-GF', 'HOSP-001', 'Philips', 'MN-U003', 'checked_out'),
('MV-1004', 'Ventilator', 'Life Support', 'ICU Storage', 'HOSP-001', 'Hamilton', 'MN-V004', 'available'),
('MV-1005', 'Oxygen Concentrator', 'Oxygen', 'Ward A', 'HOSP-001', 'BPL', 'MN-O005', 'available'),
('MV-1006', 'C-Arm Machine', 'Surgery', 'OT Storage', 'HOSP-001', 'GE', 'MN-C006', 'checked_out'),
('MV-1007', 'Defibrillator', 'Emergency', 'ER Crash Cart', 'HOSP-001', 'Philips', 'MN-D007', 'available');

-- 4. Immovable Equipment
CREATE TABLE IF NOT EXISTS immovable_equipment (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    category VARCHAR(40),
    location VARCHAR(60),
    hospital_id VARCHAR(20),
    manufacturer VARCHAR(60),
    slot_duration_mins INT,
    operating_hours_start VARCHAR(10),
    operating_hours_end VARCHAR(10),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO immovable_equipment (id, name, category, location, hospital_id, manufacturer, slot_duration_mins, operating_hours_start, operating_hours_end) VALUES
('IM-2001', 'MRI Scanner', 'Imaging', 'Radio-GF, A', 'HOSP-001', 'GE', 45, '08:00', '22:00'),
('IM-2002', 'CT Scanner', 'Imaging', 'Radio-GF, B', 'HOSP-001', 'Siemens', 30, '08:00', '22:00'),
('IM-2003', 'Operating Theatre', 'Surgery', 'OT Complex, 2F', 'HOSP-001', 'Steris', 120, '00:00', '23:59'),
('IM-2004', 'Cardiac OT', 'Surgery', 'OT Complex, 2F', 'HOSP-001', 'Steris', 180, '00:00', '23:59'),
('IM-2005', 'Dialysis Unit', 'Renal', '1F, Renal Wing', 'HOSP-001', 'Fresenius', 240, '07:00', '21:00');

-- 5. Checkouts (Movable)
CREATE TABLE IF NOT EXISTS checkouts (
    checkout_id VARCHAR(20) PRIMARY KEY,
    hospital_id VARCHAR(20),
    equipment_id VARCHAR(20),
    equipment_name VARCHAR(80),
    staff_id VARCHAR(20),
    staff_name VARCHAR(100),
    checkout_date DATE,
    due_date DATE,
    status VARCHAR(20),
    extended BOOLEAN,
    notes TEXT,
    return_location VARCHAR(150),
    return_date DATE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (equipment_id) REFERENCES movable_equipment(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

INSERT INTO checkouts (checkout_id, hospital_id, equipment_id, equipment_name, staff_id, staff_name, checkout_date, due_date, status, extended, notes) VALUES
('CHK-001', 'HOSP-001', 'MV-1003', 'Portable Ultrasound', 'ST-101', 'Nurse Bindu', '2026-02-10', '2026-02-18', 'active', FALSE, 'Emergency Backup Unit #2'),
('CHK-002', 'HOSP-001', 'MV-1002', 'Infusion Pump', 'ST-104', 'Nurse Kavitha', '2026-02-25', CURDATE(), 'active', FALSE, 'Trauma Resus'),
('CHK-003', 'HOSP-001', 'MV-1006', 'C-Arm Machine', 'ST-103', 'Dr. Ramesh', '2026-02-26', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'active', FALSE, 'Ortho Surgery Slot-A');

-- 6. Bookings (Immovable)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(20) PRIMARY KEY,
    hospital_id VARCHAR(20),
    equipment_id VARCHAR(20),
    equipment_name VARCHAR(80),
    patient_name VARCHAR(100),
    staff_id VARCHAR(20),
    staff_name VARCHAR(100),
    date DATE,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    priority VARCHAR(30),
    department VARCHAR(60),
    status VARCHAR(20),
    pushed_to VARCHAR(10),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (equipment_id) REFERENCES immovable_equipment(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

INSERT INTO bookings (booking_id, hospital_id, equipment_id, equipment_name, patient_name, staff_id, staff_name, date, start_time, end_time, priority, department, status) VALUES 
('BKG-001', 'HOSP-001', 'IM-2001', 'MRI Scanner', 'Rajesh', 'ST-102', 'Arun', CURDATE(), '09:00', '09:45', 'Normal', 'Radiology', 'confirmed'),
('BKG-002', 'HOSP-001', 'IM-2003', 'Operating Theatre', 'Sunita', 'ST-103', 'Dr. Ramesh', CURDATE(), '10:00', '12:00', 'High Emergency', 'Surgery', 'confirmed');

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(20) PRIMARY KEY,
    hospital_id VARCHAR(20),
    target_staff_id VARCHAR(20),
    type VARCHAR(30),
    severity VARCHAR(20),
    message TEXT,
    timestamp DATETIME,
    is_read BOOLEAN,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (target_staff_id) REFERENCES staff(id)
);

INSERT INTO notifications (id, hospital_id, target_staff_id, type, severity, message, timestamp, is_read) VALUES
('NOTIF-001', 'HOSP-001', 'ST-101', 'overdue_alert', 'critical', 'OVERDUE: ICU Monitor (CHK-001) was due yesterday.', NOW(), FALSE);

-- 8. Extension Requests
CREATE TABLE IF NOT EXISTS extension_requests (
    id VARCHAR(20) PRIMARY KEY,
    checkout_id VARCHAR(20),
    hospital_id VARCHAR(20),
    staff_id VARCHAR(20),
    staff_name VARCHAR(100),
    equipment_name VARCHAR(80),
    current_due DATE,
    requested_due DATE,
    reason TEXT,
    status VARCHAR(20),
    timestamp DATETIME,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (checkout_id) REFERENCES checkouts(checkout_id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

INSERT INTO extension_requests (id, checkout_id, hospital_id, staff_id, staff_name, equipment_name, current_due, requested_due, reason, status, timestamp) VALUES
('EXT-001', 'CHK-001', 'HOSP-001', 'ST-101', 'Nurse Bindu', 'Portable Ultrasound', '2026-02-18', '2026-03-05', 'Scheduled follow-up scans...', 'pending', NOW());
