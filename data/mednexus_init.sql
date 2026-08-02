-- MedNexus Database Initialization Script
CREATE DATABASE IF NOT EXISTS mednexus_db;
USE mednexus_db;

-- 1. Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    timezone VARCHAR(100)
);

INSERT INTO hospitals (id, name, city, timezone) VALUES 
('HOSP-001', 'Apex Care Hospital', 'Chennai', 'Asia/Kolkata');

-- 2. Staff
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    department VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    hospital_id VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    professional_summary TEXT,
    address TEXT,
    emergency_contact TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO staff (id, name, role, department, password, hospital_id, phone, email, professional_summary, address, emergency_contact) VALUES
('ADM-001', 'Dr. Aniruddh', 'Admin', 'Administration', 'admin123', 'HOSP-001', '+91 98401 23456', 'aniruddh.admin@mednexus.com', 'Chief Administrator with 20+ years in healthcare operations.', '12, Harrington Road, Chetpet, Chennai 600031', 'Mrs. Priya S. - +91 98401 22233'),
('ADM-002', 'Dr. Meera', 'Admin', 'Administration', 'admin123', 'HOSP-001', '+91 98402 33445', 'meera.v@mednexus.com', 'Senior Quality Controller and Operations Manager.', 'Apartment 5B, Skyview, Anna Nagar, Chennai 600102', 'Vasudevan R. - +91 98402 11111'),
('ST-101', 'Nurse Bindu', 'Nurse', 'ICU', 'staff123', 'HOSP-001', '+91 91761 11001', 'bindu.n@mednexus.com', 'Senior Critical Care Nurse.', 'Plot 45, Anna Nagar East, Chennai 600102', 'Mohan Nair - +91 91761 22222'),
('ST-102', 'Arun', 'Technician', 'Radiology', 'staff123', 'HOSP-001', '+91 91762 22001', 'arun.p@mednexus.com', 'Chief Radiographer.', 'T.Nagar, Chennai 600017', 'Leela Pillai - +91 91762 00000'),
('ST-103', 'Dr. Ramesh', 'Surgeon', 'Surgery', 'staff123', 'HOSP-001', '+91 99401 55001', 'ramesh.v@mednexus.com', 'Senior Cardiothoracic Surgeon.', 'Poes Garden, Chennai 600086', 'Gita V. - +91 99401 00000'),
('ST-104', 'Nurse Kavitha', 'Nurse', 'Emergency', 'staff123', 'HOSP-001', '+91 98840 88001', 'kavitha.m@mednexus.com', 'Trauma Care Specialist.', 'Sardar Patel Road, Adyar, Chennai 600020', 'Murugan G. - +91 98840 00000'),
('ST-105', 'Vijay', 'Support', 'Emergency', 'staff123', 'HOSP-001', '+91 94440 44001', 'vijay.r@mednexus.com', 'Patient Flow Coordinator.', 'Rose Garden, Velachery, Chennai 600042', 'Anitha R. - +91 94440 00000'),
('ST-106', 'Nurse Mary', 'Nurse', 'Cardiology', 'staff123', 'HOSP-001', '+91 91763 33001', 'mary.k@mednexus.com', 'Cardiac Ward Supervisor.', 'Choolaimedu, Chennai 600094', 'Thomas K. - +91 91763 00000'),
('ST-107', 'Dr. Senthil', 'Physician', 'Orthopaedics', 'staff123', 'HOSP-001', '+91 99620 66001', 'senthil.k@mednexus.com', 'Orthopaedic Consultant.', 'Besant Nagar, Chennai 600090', 'Meena K. - +91 99620 00000'),
('ST-108', 'Nikhil', 'Technician', 'Dialysis', 'staff123', 'HOSP-001', '+91 98410 77001', 'nikhil.d@mednexus.com', 'Senior Dialysis Technician.', 'Porur, Chennai 600116', 'Sunita D. - +91 98410 00000'),
('ST-109', 'Dr. Lakshmi', 'Physician', 'Gynae/Obs', 'staff123', 'HOSP-001', '+91 98405 55001', 'lakshmi.p@mednexus.com', 'Obstetrics Specialist.', 'Kalakshetra Colony, Chennai 600090', 'Raghavan P. - +91 98405 00000'),
('ST-110', 'Nurse Rajesh', 'Nurse', 'General Medicine', 'staff123', 'HOSP-001', '+91 91764 44001', 'rajesh.k@mednexus.com', 'Ward Charge Nurse.', 'K.K. Nagar, Chennai 600078', 'Usha K. - +91 91764 00000'),
('ST-111', 'Ananya', 'Physiotherapist', 'Orthopaedics', 'staff123', 'HOSP-001', '+91 91765 55001', 'ananya.s@mednexus.com', 'Rehabilitation specialist focused on post-operative recovery and mobility training.', 'Mylapore, Chennai 600004', 'Sharma R. - +91 91765 00000'),
('ST-112', 'Dr. Vikram', 'Surgeon', 'Orthopaedics', 'staff123', 'HOSP-001', '+91 98411 22334', 'vikram.s@mednexus.com', 'Orthopaedic Surgeon focused on joint replacement.', 'RA Puram, Chennai 600028', 'Neha S. - +91 98411 00011'),
('ST-113', 'Nurse Alice', 'Nurse', 'Paediatrics', 'staff123', 'HOSP-001', '+91 98412 33445', 'alice.t@mednexus.com', 'Compassionate paediatric nurse dedicated to newborn and infant care.', 'Kilpauk, Chennai 600010', 'Thomas J. - +91 98412 00022'),
('ST-114', 'Dr. Pradeep', 'Physician', 'General Medicine', 'staff123', 'HOSP-001', '+91 98413 44556', 'pradeep.r@mednexus.com', 'Internal Medicine Consultant.', 'Nungambakkam, Chennai 600034', 'Rau S. - +91 98413 00033'),
('ST-115', 'Nurse Samuel', 'Nurse', 'ICU', 'staff123', 'HOSP-001', '+91 98414 55667', 'samuel.j@mednexus.com', 'ICU Support Specialist.', 'Perungudi, Chennai 600096', 'Samuel R. - +91 98414 00044'),
('ST-116', 'Dr. Shalini', 'Radiologist', 'Radiology', 'staff123', 'HOSP-001', '+91 98415 66778', 'shalini.v@mednexus.com', 'Interventional Radiologist.', 'Egmore, Chennai 600008', 'Vasanth K. - +91 98415 00055'),
('ST-117', 'Karthik', 'Technician', 'Pathology', 'staff123', 'HOSP-001', '+91 98416 77889', 'karthik.r@mednexus.com', 'Lab Services Lead.', 'Saidapet, Chennai 600015', 'Raja M. - +91 98416 00066'),
('ST-118', 'Nurse Geetha', 'Nurse', 'Surgery', 'staff123', 'HOSP-001', '+91 98417 88990', 'geetha.v@mednexus.com', 'OT Scrub Nurse.', 'Kodambakkam, Chennai 60024', 'Vasanthan T. - +91 98417 00077'),
('ST-119', 'Dr. Arun', 'Physician', 'Cardiology', 'staff123', 'HOSP-001', '+91 98418 99001', 'arun.p@mednexus.com', 'Junior Resident, Cardiology.', 'Madipakkam, Chennai 600091', 'Prasath S. - +91 98418 00088'),
('ST-120', 'Suresh', 'Support', 'Radiology', 'staff123', 'HOSP-001', '+91 98419 00112', 'suresh.g@mednexus.com', 'Dedicated support staff ensuring smooth radiology department operations.', 'Tambaram, Chennai 600045', 'Ganesan R. - +91 98419 00099'),
('ST-121', 'Dr. Neha', 'Physician', 'Paediatrics', 'staff123', 'HOSP-001', '+91 98420 11223', 'neha.k@mednexus.com', 'Neonathologist specializing in critical care for premature infants.', 'Triplicane, Chennai 600005', 'Kapoor R. - +91 98420 00100'),
('ST-122', 'Nurse Prema', 'Nurse', 'Gynae/Obs', 'staff123', 'HOSP-001', '+91 98421 22334', 'prema.l@mednexus.com', 'Maternity Ward Nurse.', 'Royapettah, Chennai 600014', 'Loganathan M. - +91 98421 00111'),
('ST-123', 'Mani', 'Support', 'General Medicine', 'staff123', 'HOSP-001', '+91 98422 33445', 'mani.k@mednexus.com', 'Experienced ward assistant providing essential patient care and support.', 'Sowcarpet, Chennai 600079', 'Mani S. - +91 98422 00122'),
('ST-124', 'Nurse Rani', 'Nurse', 'Emergency', 'staff123', 'HOSP-001', '+91 98423 44556', 'rani.m@mednexus.com', 'High-pressure emergency room nurse with trauma certification.', 'Ayanavaram, Chennai 600023', 'Muthu P. - +91 98423 00133'),
('ST-125', 'Dr. Balaji', 'Surgeon', 'Surgery', 'staff123', 'HOSP-001', '+91 98424 55667', 'balaji.v@mednexus.com', 'Board-certified general surgeon with 10+ years of operating experience.', 'Purasawalkam, Chennai 600007', 'Balaji R. - +91 98424 00144'),
('ST-126', 'Kumaran', 'Technician', 'OT', 'staff123', 'HOSP-001', '+91 98425 66778', 'kumaran.s@mednexus.com', 'OT Technician.', 'Manapakkam, Chennai 600125', 'Selvam P. - +91 98425 00155'),
('ST-127', 'Nurse Daisy', 'Nurse', 'ICU', 'staff123', 'HOSP-001', '+91 98426 77889', 'daisy.r@mednexus.com', 'High-dependency ward nurse.', 'Vadapalani, Chennai 600026', 'Roy S. - +91 98426 00166'),
('ST-128', 'Dr. Divya', 'Physician', 'Emergency', 'staff123', 'HOSP-001', '+91 98427 88990', 'divya.s@mednexus.com', 'Trauma Physician.', 'Ullagaram, Chennai 600091', 'Santhanam S. - +91 98427 00177'),
('ST-129', 'Babu', 'Support', 'Orthopaedics', 'staff123', 'HOSP-001', '+91 98428 99001', 'babu.v@mednexus.com', 'Ortho Ward Boy.', 'Ambattur, Chennai 600053', 'Vasu P. - +91 98428 00188'),
('ST-130', 'Nurse Shanti', 'Nurse', 'Radiology', 'staff123', 'HOSP-001', '+91 98429 00112', 'shanti.p@mednexus.com', 'Diagnostic Ward Nurse.', 'Chromepet, Chennai 600044', 'Prakash R. - +91 98429 00199'),
('ST-131', 'Dr. Javed', 'Physician', 'ICU', 'staff123', 'HOSP-001', '+91 98430 11223', 'javed.k@mednexus.com', 'Intensivist.', 'Triplicane, Chennai 600005', 'Khan S. - +91 98430 00200'),
('ST-132', 'Nurse Sofia', 'Nurse', 'Emergency', 'staff123', 'HOSP-001', '+91 98431 22334', 'sofia.m@mednexus.com', 'Acute Care Nurse.', 'Pallavaram, Chennai 600043', 'Mathew P. - +91 98431 00211'),
('ST-133', 'Raghav', 'Technician', 'Pathology', 'staff123', 'HOSP-001', '+91 98432 33445', 'raghav.s@mednexus.com', 'Senior Lab Tech.', 'Sholinganallur, Chennai 600119', 'Sundar R. - +91 98432 00222'),
('ST-134', 'Nurse Kavita', 'Nurse', 'Surgery', 'staff123', 'HOSP-001', '+91 98433 44556', 'kavita.d@mednexus.com', 'Surgical Recovery Nurse.', 'Avadi, Chennai 600054', 'Dinesh G. - +91 98433 00233'),
('ST-135', 'Aman', 'Technician', 'Dialysis', 'staff123', 'HOSP-001', '+91 98434 55667', 'aman.r@mednexus.com', 'Dialysis Unit Assistant.', 'Medavakkam, Chennai 600100', 'Aman G. - +91 98434 00244'),
('ST-136', 'Dr. Priyanka', 'Physician', 'Paediatrics', 'staff123', 'HOSP-001', '+91 98435 66778', 'priyanka.g@mednexus.com', 'Paediatric Consultant.', 'Chetpet, Chennai 60031', 'Gowtham S. - +91 98435 00255');

-- 3. Movable Equipment
CREATE TABLE IF NOT EXISTS movable_equipment (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    location VARCHAR(100),
    hospital_id VARCHAR(50),
    manufacturer VARCHAR(100),
    serial_number VARCHAR(100),
    status VARCHAR(50),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO movable_equipment (id, name, category, location, hospital_id, manufacturer, serial_number, status) VALUES
('MV-1001', 'ICU Monitor', 'Monitoring', 'ICU Storage', 'HOSP-001', 'BPL', 'MN-M001', 'available'),
('MV-1002', 'Infusion Pump', 'Infusion', 'ER Main', 'HOSP-001', 'Mindray', 'MN-I002', 'available'),
('MV-1003', 'Portable Ultrasound', 'Imaging', 'Radio-GF', 'HOSP-001', 'Philips', 'MN-U003', 'available'),
('MV-1004', 'Ventilator', 'Life Support', 'ICU Storage', 'HOSP-001', 'Hamilton', 'MN-V004', 'available'),
('MV-1005', 'Oxygen Concentrator', 'Oxygen', 'Ward A', 'HOSP-001', 'BPL', 'MN-O005', 'available'),
('MV-1006', 'C-Arm Machine', 'Surgery', 'OT Storage', 'HOSP-001', 'GE', 'MN-C006', 'available'),
('MV-1007', 'Defibrillator', 'Emergency', 'ER Crash Cart', 'HOSP-001', 'Philips', 'MN-D007', 'available'),
('MV-1008', 'Syringe Pump', 'Infusion', 'NICU', 'HOSP-001', 'BPL', 'MN-S008', 'available'),
('MV-1009', 'Fetal Doppler', 'Gynae', 'Obs-Ward', 'HOSP-001', 'BPL', 'MN-F009', 'available'),
('MV-1010', 'Nebulizer', 'Therapeutic', 'Paeds Ward', 'HOSP-001', 'Beurer', 'MN-N010', 'available'),
('MV-1011', 'Suction Machine', 'Emergency', 'ER Treatment', 'HOSP-001', 'Allied', 'MN-S011', 'available'),
('MV-1012', 'Phototherapy Unit', 'Therapeutic', 'NICU', 'HOSP-001', 'Zeal', 'MN-P012', 'available'),
('MV-1013', 'Mobile X-Ray', 'Imaging', 'Radio Storage', 'HOSP-001', 'Allengers', 'MN-X013', 'available'),
('MV-1014', 'ECG Machine', 'Diagnostics', 'Cardio-Room', 'HOSP-001', 'Schiller', 'MN-E014', 'available'),
('MV-1015', 'BIPAP Machine', 'Life Support', 'ICU Storage', 'HOSP-001', 'Philips', 'MN-B015', 'available'),
('MV-1016', 'Infant Incubator', 'Therapeutic', 'NICU', 'HOSP-001', 'Zeal', 'MN-I016', 'available'),
('MV-1017', 'Pulse Oximeter', 'Monitoring', 'Nursing Station', 'HOSP-001', 'BPL', 'MN-P017', 'available'),
('MV-1018', 'Electric Wheelchair', 'Mobility', 'Lobby', 'HOSP-001', 'Philco', 'MN-W018', 'available'),
('MV-1019', 'Patient Stretcher', 'Mobility', 'ER Entrance', 'HOSP-001', 'Arjo', 'MN-S019', 'available'),
('MV-1020', 'Laryngoscope', 'Emergency', 'OT Storage', 'HOSP-001', 'Welch Allyn', 'MN-L020', 'available'),
('MV-1021', 'Anesthesia Cart', 'Surgery', 'OT-1', 'HOSP-001', 'GE', 'MN-A021', 'available'),
('MV-1022', 'Glucometer', 'Diagnostics', 'Ward Store', 'HOSP-001', 'Accu-Chek', 'MN-G022', 'available'),
('MV-1023', 'Multipara Monitor', 'Monitoring', 'Recovery', 'HOSP-001', 'Mindray', 'MN-M023', 'available'),
('MV-1024', 'Patient Lift', 'Mobility', 'Ortho Ward', 'HOSP-001', 'Arjo', 'MN-L024', 'available'),
('MV-1025', 'Endoscopy Probe', 'Diagnostics', 'Lab Store', 'HOSP-001', 'Olympus', 'MN-E025', 'available'),
('MV-1026', 'Maternity Bed', 'Furniture', 'Labour Room', 'HOSP-001', 'Hill-Rom', 'MN-B026', 'available'),
('MV-1027', 'Volumetric Pump', 'Infusion', 'ICU Storage', 'HOSP-001', 'BPL', 'MN-V027', 'available'),
('MV-1028', 'Digital X-Ray Station', 'Imaging', 'Radio-GF', 'HOSP-001', 'Allengers', 'MN-X028', 'available'),
('MV-1029', 'Heart-Lung Machine', 'Surgery', 'OT Complex', 'HOSP-001', 'Terumo', 'MN-H029', 'available'),
('MV-1030', 'ABG Machine', 'Diagnostics', 'ICU Lab', 'HOSP-001', 'Roche', 'MN-A030', 'available');

-- 4. Immovable Equipment
CREATE TABLE IF NOT EXISTS immovable_equipment (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    location VARCHAR(100),
    hospital_id VARCHAR(50),
    manufacturer VARCHAR(100),
    slot_duration_mins INT,
    operating_start TIME,
    operating_end TIME,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

INSERT INTO immovable_equipment (id, name, category, location, hospital_id, manufacturer, slot_duration_mins, operating_start, operating_end) VALUES
('IM-2001', 'MRI Scanner', 'Imaging', 'Radio-GF, A', 'HOSP-001', 'GE', 45, '08:00:00', '22:00:00'),
('IM-2002', 'CT Scanner', 'Imaging', 'Radio-GF, B', 'HOSP-001', 'Siemens', 30, '08:00:00', '22:00:00'),
('IM-2003', 'Operating Theatre', 'Surgery', 'OT Complex, 2F', 'HOSP-001', 'Steris', 120, '00:00:00', '23:59:00'),
('IM-2004', 'Cardiac OT', 'Surgery', 'OT Complex, 2F', 'HOSP-001', 'Steris', 180, '00:00:00', '23:59:00'),
('IM-2005', 'Dialysis Unit', 'Renal', '1F, Renal Wing', 'HOSP-001', 'Fresenius', 240, '07:00:00', '21:00:00'),
('IM-2006', 'Cath Lab Suite', 'Cardiology', '1F, Cardiac Unit', 'HOSP-001', 'Philips', 90, '00:00:00', '23:59:00'),
('IM-2007', 'TMT Machine', 'Cardiology', 'OPD Cardio', 'HOSP-001', 'Schiller', 30, '09:00:00', '18:00:00'),
('IM-2008', 'Mammography Unit', 'Imaging', 'Specialty Radio', 'HOSP-001', 'Hologic', 30, '09:00:00', '17:00:00'),
('IM-2009', 'Dental Chair Unit', 'Dental', 'Dental Wing GF', 'HOSP-001', 'Sirona', 60, '10:00:00', '19:00:00'),
('IM-2010', 'Echo Machine', 'Cardiology', 'Echo Room, 1F', 'HOSP-001', 'GE', 30, '08:00:00', '20:00:00'),
('IM-2011', 'Hematology Analyzer', 'Lab', 'Main Lab', 'HOSP-001', 'Beckman', 15, '00:00:00', '23:59:00'),
('IM-2012', 'CSSD Autoclave', 'Sterilization', 'CSSD Block', 'HOSP-001', 'Tuttnauer', 90, '08:00:00', '22:00:00');

-- 5. Checkouts (Movable)
CREATE TABLE IF NOT EXISTS checkouts (
    checkout_id VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50),
    equipment_id VARCHAR(50),
    staff_id VARCHAR(50),
    checkout_date DATE,
    due_date DATE,
    status VARCHAR(50),
    extended BOOLEAN DEFAULT FALSE,
    notes TEXT,
    return_location VARCHAR(100),
    return_date DATE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (equipment_id) REFERENCES movable_equipment(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Note: __TODAY__ tokens resolved to CURDATE() in active records
INSERT INTO checkouts (checkout_id, hospital_id, equipment_id, staff_id, checkout_date, due_date, status, extended, notes) VALUES
('CHK-001', 'HOSP-001', 'MV-1001', 'ST-101', '2026-02-22', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'active', FALSE, 'Patient monitoring ICU-04'),
('CHK-002', 'HOSP-001', 'MV-1002', 'ST-104', '2026-02-25', CURDATE(), 'active', FALSE, 'Trauma Resus'),
('CHK-003', 'HOSP-001', 'MV-1006', 'ST-103', '2026-02-26', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'active', FALSE, 'Ortho Surgery Slot-A'),
('CHK-004', 'HOSP-001', 'MV-1009', 'ST-109', '2026-02-26', '2026-03-01', 'active', FALSE, 'Ward Round'),
('CHK-005', 'HOSP-001', 'MV-1011', 'ST-124', '2026-02-20', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'active', FALSE, 'Emergency Backup');

-- Historical Checkouts
INSERT INTO checkouts (checkout_id, hospital_id, equipment_id, staff_id, checkout_date, due_date, status, extended, notes) VALUES
('CHK-H100', 'HOSP-001', 'MV-1018', 'ST-108', '2026-02-14', '2026-02-16', 'completed', FALSE, 'Historical record'),
('CHK-H101', 'HOSP-001', 'MV-1011', 'ST-126', '2026-02-17', '2026-02-18', 'completed', FALSE, 'Historical record'),
('CHK-H102', 'HOSP-001', 'MV-1022', 'ST-104', '2026-02-14', '2026-02-17', 'completed', FALSE, 'Historical record'),
('CHK-H103', 'HOSP-001', 'MV-1001', 'ST-127', '2026-02-08', '2026-02-11', 'completed', FALSE, 'Historical record'),
('CHK-H104', 'HOSP-001', 'MV-1006', 'ST-134', '2026-02-19', '2026-02-20', 'completed', FALSE, 'Historical record'),
('CHK-H105', 'HOSP-001', 'MV-1017', 'ST-117', '2026-02-11', '2026-02-14', 'completed', FALSE, 'Historical record'),
('CHK-H106', 'HOSP-001', 'MV-1001', 'ST-122', '2026-02-23', '2026-02-26', 'completed', FALSE, 'Historical record');

-- 6. Bookings (Immovable)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50),
    equipment_id VARCHAR(50),
    patient_name VARCHAR(255),
    staff_id VARCHAR(50),
    date DATE,
    start_time TIME,
    end_time TIME,
    priority VARCHAR(50),
    department VARCHAR(100),
    status VARCHAR(50),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (equipment_id) REFERENCES immovable_equipment(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

INSERT INTO bookings (booking_id, hospital_id, equipment_id, patient_name, staff_id, date, start_time, end_time, priority, department, status) VALUES 
('BKG-001', 'HOSP-001', 'IM-2001', 'Rajesh', 'ST-102', CURDATE(), '09:00:00', '09:45:00', 'Normal', 'Radiology', 'confirmed'),
('BKG-002', 'HOSP-001', 'IM-2003', 'Sunita', 'ST-103', CURDATE(), '10:00:00', '12:00:00', 'High Emergency', 'Surgery', 'confirmed'),
('BKG-003', 'HOSP-001', 'IM-2006', 'Venkatesh', 'ST-106', CURDATE(), '11:00:00', '12:30:00', 'Emergency', 'Cardiology', 'confirmed');

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    hospital_id VARCHAR(50),
    target_staff_id VARCHAR(50),
    type VARCHAR(100),
    severity VARCHAR(50),
    message TEXT,
    timestamp DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (target_staff_id) REFERENCES staff(id)
);

INSERT INTO notifications (id, hospital_id, target_staff_id, type, severity, message, timestamp, is_read) VALUES
('NOTIF-001', 'HOSP-001', 'ST-101', 'overdue_alert', 'critical', 'OVERDUE: ICU Monitor (CHK-001) was due yesterday.', '2026-02-27 06:00:00', FALSE),
('NOTIF-002', 'HOSP-001', 'ST-124', 'overdue_alert', 'critical', 'CRITICAL OVERDUE: Suction Machine (CHK-005) is 2 days late.', '2026-02-27 07:30:00', FALSE);
