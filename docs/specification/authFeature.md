### Sprint 1 — Authentication
Goal
A user can:
Sign up
Log in
Receive JWT token
Access protected endpoints
Use the React UI

---

### Feature 1: Authentication

### Story 1: User Registration

As a user
I want to create an account
So that I can use the Grocery Management system.

Acceptance Criteria
User enters:
Name
Email
Password
Email must be unique
Password is encrypted using BCrypt
User record saved in PostgreSQL
Success response returned


### Story 2: User Login

As a user
I want to login
So that I can access protected features.

Acceptance Criteria
User enters:
Email
Password
Credentials validated
JWT token generated
Token returned

### Story 3: Protected Routes

As a user
I should only access grocery features after login.

Acceptance Criteria
JWT required
Unauthorized returns 401

---

### Database Design
users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

---

### Backend Structure
backend/

src/main/java/com/lifeos

├── auth
│   ├── controller
│   │   └── AuthController.java
│   │
│   ├── service
│   │   └── AuthService.java
│   │
│   ├── repository
│   │   └── UserRepository.java
│   │
│   ├── entity
│   │   └── User.java
│   │
│   ├── dto
│   │   ├── LoginRequest.java
│   │   ├── SignupRequest.java
│   │   ├── AuthResponse.java
│   │
│   └── security
│       ├── JwtService.java
│       ├── JwtFilter.java
│       └── SecurityConfig.java
│
└── common

### REST APIs
Signup
POST /api/auth/signup

Request

{
  "name": "John",
  "email": "john@gmail.com",
  "password": "password123"
}

Response

{
  "message": "User registered successfully"
}
Login
POST /api/auth/login

Request

{
  "email": "john@gmail.com",
  "password": "password123"
}

Response

{
  "token": "jwt-token"
}

---

### React Structure
frontend/

src

├── features
│
│   └── auth
│       ├── pages
│       │   ├── LoginPage.tsx
│       │   └── SignupPage.tsx
│       │
│       ├── components
│       │   ├── LoginForm.tsx
│       │   └── SignupForm.tsx
│       │
│       ├── services
│       │   └── authApi.ts
│       │
│       └── hooks
│           └── useAuth.ts
│
├── routes
│
├── layouts
│
└── shared

### Login Page Components

LoginPage
 └── LoginForm
      ├── EmailInput
      ├── PasswordInput
      └── LoginButton

### Signup Page Components

SignupPage
 └── SignupForm
      ├── NameInput
      ├── EmailInput
      ├── PasswordInput
      └── SignupButton
