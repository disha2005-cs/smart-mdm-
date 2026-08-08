# API Documentation - School & User Management

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All endpoints require Bearer token authentication except `/auth/login`

Header:
```
Authorization: Bearer <token>
```

---

## Schools Management (Government Admin Only)

### 1. Get All Schools
```http
GET /schools
```

**Response:**
```json
[
  {
    "id": 1,
    "udise_code": "29070123456",
    "school_name": "Karnataka Public School",
    "district": "Bagalkot",
    "taluk": "Bagalkot",
    "village": "Bagalkot City",
    "address": "Main Road, Bagalkot",
    "pin_code": "587101",
    "principal_name": "Mr. Kumar",
    "principal_phone": "+91-98765-43210",
    "email": "kps@school.edu",
    "phone": "+91-98765-43211",
    "latitude": 16.1850,
    "longitude": 75.6960,
    "status": "Active",
    "created_at": "2026-08-07T10:00:00Z",
    "updated_at": null,
    "has_admin": false,
    "admin_name": null,
    "admin_employee_id": null
  }
]
```

### 2. Create School
```http
POST /schools
```

**Request Body:**
```json
{
  "udise_code": "29070123456",
  "school_name": "Karnataka Public School",
  "district": "Bagalkot",
  "taluk": "Bagalkot",
  "village": "Bagalkot City",
  "address": "Main Road, Bagalkot",
  "pin_code": "587101",
  "principal_name": "Mr. Kumar",
  "principal_phone": "+91-98765-43210",
  "email": "kps@school.edu",
  "phone": "+91-98765-43211",
  "latitude": 16.1850,
  "longitude": 75.6960,
  "status": "Active"
}
```

**Response:** Same as Get School

### 3. Get School by ID
```http
GET /schools/{id}
```

### 4. Update School
```http
PUT /schools/{id}
```

**Request Body:** Same as Create (all fields optional)

### 5. Delete School
```http
DELETE /schools/{id}
```

**Response:** 204 No Content

---

## Users Management (Government Admin Only)

### 1. Get All Users
```http
GET /users?role=SCHOOL&skip=0&limit=100
```

**Query Parameters:**
- `role` (optional): Filter by "SCHOOL" or "GOVERNMENT"
- `skip` (optional): Pagination offset (default: 0)
- `limit` (optional): Page size (default: 100)

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": "SCH-KA-BAG-001",
    "email": "admin@kps.edu",
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "phone": "+91-98765-43210",
    "role": "SCHOOL",
    "school_id": 1,
    "designation": "School Administrator",
    "is_active": true,
    "created_at": "2026-08-07T10:00:00Z",
    "school_name": "Karnataka Public School",
    "school_udise": "29070123456"
  }
]
```

### 2. Get User by ID
```http
GET /users/{user_id}
```

### 3. Create School Admin
```http
POST /users
```

**Request Body:**
```json
{
  "first_name": "Rajesh",
  "last_name": "Kumar",
  "email": "rajesh.kumar@school.edu",
  "phone": "+91-98765-43210",
  "password": "SecurePass123!",
  "school_id": 1,
  "designation": "School Administrator"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "employee_id": "SCH-KA-BAG-001",
    "email": "rajesh.kumar@school.edu",
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "phone": "+91-98765-43210",
    "role": "SCHOOL",
    "school_id": 1,
    "designation": "School Administrator",
    "is_active": true,
    "created_at": "2026-08-07T10:00:00Z"
  },
  "employee_id": "SCH-KA-BAG-001",
  "password": "SecurePass123!",
  "message": "School admin created successfully for Karnataka Public School"
}
```

**Notes:**
- Employee ID is auto-generated based on district: `SCH-KA-{DISTRICT}-{NUMBER}`
- Only one admin per school is allowed
- Returns plain password once for copying/sharing

### 4. Update User
```http
PUT /users/{user_id}?first_name=John&last_name=Doe&is_active=true
```

**Query Parameters:**
- `first_name` (optional)
- `last_name` (optional)
- `email` (optional)
- `phone` (optional)
- `designation` (optional)
- `is_active` (optional): true/false

### 5. Delete User
```http
DELETE /users/{user_id}
```

**Response:** 204 No Content

**Note:** Cannot delete your own account

### 6. Generate Password
```http
POST /users/generate-password
```

**Response:**
```json
{
  "password": "aB3$xYz9!mN2"
}
```

### 7. Reset User Password
```http
POST /users/{user_id}/reset-password?new_password=NewPass123!
```

**Response:**
```json
{
  "message": "Password reset successfully",
  "employee_id": "SCH-KA-BAG-001",
  "new_password": "NewPass123!"
}
```

---

## Complete Workflow Example

### Step 1: Login as Government Admin
```http
POST /auth/login
Content-Type: application/json

{
  "employee_id": "GOV-001",
  "password": "password123",
  "role": "GOVERNMENT"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "role": "GOVERNMENT"
}
```

### Step 2: Create a School
```http
POST /schools
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "udise_code": "29070123456",
  "school_name": "Karnataka Public School",
  "district": "Bagalkot",
  "taluk": "Bagalkot",
  "village": "Bagalkot City",
  "principal_name": "Mr. Kumar",
  "email": "kps@school.edu",
  "phone": "+91-98765-43211"
}
```

### Step 3: Get All Schools (Verify Creation)
```http
GET /schools
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Step 4: Create School Admin for the School
```http
POST /users
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "first_name": "Rajesh",
  "last_name": "Kumar",
  "email": "rajesh.kumar@school.edu",
  "phone": "+91-98765-43210",
  "password": "SecurePass123!",
  "school_id": 1
}
```

**Response includes:**
- Auto-generated Employee ID: `SCH-KA-BAG-001`
- Password (shown once): `SecurePass123!`

### Step 5: School Admin Login
```http
POST /auth/login
Content-Type: application/json

{
  "employee_id": "SCH-KA-BAG-001",
  "password": "SecurePass123!",
  "role": "SCHOOL"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "A school with this UDISE code already exists"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

### 404 Not Found
```json
{
  "detail": "School not found"
}
```

---

## Business Rules

### Schools
1. ✅ UDISE code must be unique
2. ✅ Only Government Admin can create/update/delete schools
3. ✅ School Admin can only view their assigned school

### Users/Admins
1. ✅ One school can have only ONE admin (enforced by database constraint)
2. ✅ Employee ID is auto-generated: `SCH-KA-{DISTRICT}-{NUMBER}`
3. ✅ Email must be unique across all users
4. ✅ Only Government Admin can create/update/delete users
5. ✅ School Admin role automatically gets `school_id` assigned
6. ✅ Cannot delete your own account
7. ✅ Password is hashed with bcrypt

### Authentication
1. ✅ JWT token expires after 24 hours (configurable)
2. ✅ Role must match user's role in database
3. ✅ Last login timestamp is updated on each login
4. ✅ Inactive users cannot login

---

## Database Schema

### users table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    phone VARCHAR,
    profile_image VARCHAR,
    role VARCHAR NOT NULL, -- 'GOVERNMENT' or 'SCHOOL'
    school_id INTEGER UNIQUE, -- Foreign key to schools, UNIQUE enforces 1-to-1
    designation VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);
```

### schools table
```sql
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    udise_code VARCHAR UNIQUE NOT NULL,
    school_name VARCHAR NOT NULL,
    district VARCHAR NOT NULL,
    taluk VARCHAR NOT NULL,
    village VARCHAR NOT NULL,
    address VARCHAR,
    pin_code VARCHAR,
    principal_name VARCHAR,
    principal_phone VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    latitude FLOAT,
    longitude FLOAT,
    status VARCHAR DEFAULT 'Active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```
