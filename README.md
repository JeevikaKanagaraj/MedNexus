# MedNexus - Centralized Clinical Asset & Workflow Management System

## 📌 Project Overview
Modern healthcare facilities face critical challenges in tracking the availability and location of essential medical equipment. Delays in locating movable assets (like infusion pumps or wheelchairs) or scheduling conflicts for immovable assets (like MRI machines or surgical theaters) directly impact patient care and hospital efficiency.

**MedNexus** is a centralized clinical asset tracking and workflow management system designed to solve these bottlenecks. By unifying the scheduling of fixed-location assets and the checkout process for movable equipment into a single pane of glass, MedNexus empowers hospital staff to quickly allocate resources while providing administrators with real-time oversight, automated triage for emergency scheduling conflicts, and proactive alerting for overdue returns. 

---

## ✨ Features
- **Intelligent Triage & Scheduling Escalation:** Advanced cascading logic automatically detects high-priority booking conflicts (e.g., two overlapping High Emergency ICU requests) and flags them as `PENDING_TRIAGE` for immediate administrative resolution. 
- **Movable Asset Checkouts:** Real-time tracking of portable equipment checked out by staff, including due dates, return processing, and dynamic availability updating.
- **Extension Request Workflows:** Staff can request duration extensions for in-use movable equipment, which admins can seamlessly approve or reject through the dashboard.
- **Overdue & Failsafe Alerting:** A background system scheduler continuously monitors active bookings and checkouts, generating automated notifications for overdue assets and pushback failsafes.
- **Role-Based Access Control (RBAC):** Distinct dashboards and access tiers for Administrators (system-wide oversight, inventory management, triage resolution) and Staff (booking assets, returning equipment, requesting extensions).
- **Glassmorphism UI:** A modern, highly responsive frontend utilizing sleek glassmorphic design principles for an intuitive user experience.

---

## 🛠️ Technology Stack

### Frontend
- **Languages:** HTML5, CSS3, JavaScript (ES6+)
- **Architecture:** Vanilla JavaScript client communicating via REST APIs
- **Styling:** Custom Vanilla CSS with a responsive Glassmorphism design system
- **Server:** Node.js (Express used via `server.js` for local static file serving)

### Backend
- **Programming Language:** Java 21
- **Framework:** Spring Boot (3.2.3)
- **Important Dependencies:**
  - Spring Web (REST API development)
  - Spring Data JPA (Hibernate ORM)
  - Lombok (Boilerplate reduction)
  - Jackson (JSON serialization)

### Database
- **Database Technology:** MySQL
- **Database-related Tools:** Spring Data JPA auto-DDL configuration, custom `schema.sql` for initial structure.

### Development Tools
- **Version Control:** Git
- **Build Tool:** Maven (Backend), npm (Frontend environment management)
- **Containerization:** Docker (Eclipse Temurin 17 JDK Alpine image)

---

## 🏗️ System Architecture

**Frontend → Spring Boot Backend → Database**

- **Frontend:** A decoupled, vanilla JavaScript application running on the client's browser (or served locally via Node.js). It handles all UI rendering, user interactions, input validation, and asynchronous `fetch` calls.
- **Spring Boot Backend APIs:** Acts as the central logic engine. It exposes secure RESTful endpoints, processes complex business logic (such as the triage scheduling algorithms), handles cross-origin requests (CORS), and translates DTOs to Entity models.
- **Database:** A relational MySQL database that acts as the single source of truth for equipment inventory, staff identities, and transactional records (bookings, checkouts).
- **Communication:** The frontend communicates with the Spring Boot backend exclusively via JSON over HTTP REST requests. The backend communicates with MySQL using Hibernate/JPA over a JDBC connection.

---

## 📁 Project Structure

```text
mednexus/
│
├── backend/                             # Spring Boot Java Application
│   ├── .mvn/                            # Maven Wrapper
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/mednexus/backend/
│   │   │   │   ├── config/              # CORS and App Configuration
│   │   │   │   ├── controller/          # REST API Controllers
│   │   │   │   ├── dto/                 # Data Transfer Objects
│   │   │   │   ├── entity/              # JPA Database Entities
│   │   │   │   ├── repository/          # Data Access Layer
│   │   │   │   ├── scheduler/           # Automated Background Tasks
│   │   │   │   └── service/             # Business Logic Layer
│   │   │   └── resources/
│   │   │       ├── application.properties # Spring Configuration
│   │   │       └── schema.sql           # Database Initialization
│   │   └── test/                        # Unit and Integration Tests
│   └── pom.xml                          # Maven Dependencies
│
├── css/                                 # Frontend Stylesheets
│   ├── index.css
│   ├── layout.css
│   └── glass.css
│
├── js/                                  # Frontend Logic
│   ├── admin.js                         # Admin Dashboard Scripts
│   ├── staff.js                         # Staff Dashboard Scripts
│   └── auth.js                          # Authentication & Utility Scripts
│
├── data/                                # SQL Seed Data & Mock JSONs
├── admin-dashboard.html                 # Admin UI
├── staff-dashboard.html                 # Staff UI
├── login.html                           # Authentication UI
├── server.js                            # Node.js Static File Server
├── package.json                         # Node Dependencies
├── Dockerfile                           # Backend Container Configuration
└── README.md                            # Project Documentation
```

---

## 👥 User Roles

### 1. Administrator (`ADMIN`)
- **Responsibilities:** Total oversight of hospital assets and conflict resolution.
- **Permissions:** 
  - View real-time analytics for hospital-wide utilization.
  - Add, update, or remove inventory (Movable and Immovable).
  - Manage Staff profiles.
  - Resolve scheduling conflicts via the Triage Dashboard.
  - Approve or reject equipment extension requests.

### 2. Staff (`STAFF`)
- **Responsibilities:** Day-to-day clinical operations and asset utilization.
- **Permissions:**
  - View available inventory by department.
  - Book immovable equipment (MRI, Surgery) for specific time slots.
  - Checkout movable equipment and mark it as returned.
  - Request time extensions for in-use movable equipment.
  - Edit or cancel their own pending bookings.

---

## 🔑 Demo Login Credentials

The following accounts are provided for demonstration purposes.

### Administrator Accounts

| Role | User ID | Password |
|---|---|---|
| Admin | ADM-001 | admin123 |
| Admin | ADM-002 | admin123 |

### Staff Accounts

| Role | User ID | Password |
|---|---|---|
| Nurse | ST-101 | staff123 |
| Doctor | ST-102 | staff123 |

> Additional staff and administrator accounts are available in the database seed data for testing different workflows.

---

## 🗄️ Database

- **Database Used:** MySQL (Relational Database Management System)
- **Purpose:** Persistent storage for Users, Equipment (Movable & Immovable), Bookings, Checkouts, Extension Requests, and Notifications.
- **Initialization:** The schema definition is located at `backend/src/main/resources/schema.sql`. Initial mock data for testing is provided in the `data/` directory (`mednexus_init.sql`).
- **Configuration:** Managed via `application.properties` in the backend using standard JDBC properties (`spring.datasource.*`).
- **Important Setup:** The database (`mednexus_db`) must exist, or the JDBC URL must include `createDatabaseIfNotExist=true`. Spring JPA is configured to `update` the DDL automatically.

---

## ⚙️ Installation and Setup

### Prerequisites
- **Java:** JDK 17 or higher
- **Maven:** 3.8+ (or use the provided Maven Wrapper `./mvnw`)
- **Database:** MySQL Server 8.0+
- **Node.js:** v16+ (Optional, for running the frontend static server)

### Database Setup
1. Start your MySQL Server.
2. The application will attempt to create the `mednexus_db` schema automatically if it does not exist based on the connection string. Alternatively, execute the `schema.sql` and `mednexus_init.sql` directly into your MySQL instance to seed testing data.

### Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd mednexus/backend
   ```
2. Configure your database credentials. Either set the environment variables (`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`) or temporarily update `src/main/resources/application.properties`.
3. Build and run the Spring Boot application:
   ```bash
   # Windows
   .\mvnw.cmd clean spring-boot:run
   
   # Mac/Linux
   ./mvnw clean spring-boot:run
   ```
4. The backend will start on `http://localhost:8080`.

### Frontend Setup
1. Open a new terminal in the root `mednexus` directory.
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the static file server:
   ```bash
   node server.js
   ```
4. Access the application in your browser at `http://localhost:8000`.

*(Alternatively, you can open `login.html` directly in your browser or use an extension like VS Code Live Server).*

---

## 🔌 API Documentation

The backend exposes a comprehensive set of RESTful APIs, prefixed with `/api`. Key endpoints include:

- **Auth Controller:**
  - `POST /api/auth/login` - Authenticate users and return session context.
- **Booking Controller:**
  - `GET /api/bookings` - Retrieve all bookings.
  - `POST /api/bookings` - Create a new immovable asset booking (triggers triage logic).
  - `PUT /api/bookings/{id}` - Update a booking.
  - `POST /api/bookings/{id}/triage` - Admin resolution for booking conflicts.
- **Checkout Controller:**
  - `GET /api/checkouts` - Track active movable equipment.
  - `POST /api/checkouts` - Process a new checkout.
  - `PUT /api/checkouts/{id}/return` - Mark equipment as returned.
- **Equipment Controller:**
  - `GET /api/equipment/movable` - List movable inventory.
  - `GET /api/equipment/immovable` - List immovable inventory.
- **Extension Controller:**
  - `POST /api/extensions` - Submit an extension request.
  - `PUT /api/extensions/{id}/status` - Approve/reject extension.
- **Notification Controller:**
  - `GET /api/notifications` - Fetch failsafe and overdue alerts for the dashboard.

---

## 🔐 Environment Variables

For security and flexibility, the application relies on the following environment variables (defined with fallbacks in `application.properties`):

- `SPRING_DATASOURCE_URL` - JDBC connection string (e.g., `jdbc:mysql://localhost:3306/mednexus_db`)
- `SPRING_DATASOURCE_USERNAME` - MySQL database user.
- `SPRING_DATASOURCE_PASSWORD` - MySQL database password.
- `PORT` - Port for the Spring Boot application (Default: `8080`).
- `ALLOWED_ORIGINS` - Used to configure CORS policies (e.g., `http://localhost:8000`).

---

## 🚀 Deployment

The MedNexus project is architected to be deployed in a decoupled manner:

- **Backend Deployment:** The Spring Boot backend can be packaged into an executable JAR (`mvn clean package`) and containerized using the provided `Dockerfile`. It is suitable for deployment on cloud platforms like AWS ECS, Heroku, or Render. 
- **Frontend Deployment:** The static Vanilla JS, HTML, and CSS files can be deployed independently to static hosting services like Vercel, Netlify, or AWS S3/CloudFront. 
- **Requirements:** 
  1. Set the `ALLOWED_ORIGINS` environment variable in the backend container to point to the frontend's deployed URL to prevent CORS blocks.
  2. Ensure a managed MySQL instance (like AWS RDS) is provisioned and injected into the backend via `SPRING_DATASOURCE_*` variables.
  3. *(Optional)* To deploy as a single monolithic container, the frontend files must be migrated into `backend/src/main/resources/static/` prior to the Docker build.

---

## 🔮 Future Enhancements
- **JWT Authentication:** Upgrade the current authentication layer to utilize stateless JSON Web Tokens for hardened security.
- **WebSocket Integration:** Implement real-time dashboard updates via STOMP/WebSockets, eliminating the need for client-side polling.
- **Advanced Data Analytics:** Add PDF/CSV export capabilities for hospital utilization reports.
- **Docker Compose:** Create a `docker-compose.yml` configuration to orchestrate the Node server, Spring Boot application, and MySQL database simultaneously for rapid local deployment.

---

## 📄 License
This project was developed for academic and portfolio purposes. \
&copy; 2026 MedNexus Project. All rights reserved.
