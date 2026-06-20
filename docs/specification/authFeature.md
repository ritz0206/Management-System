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
Backend folder structure: Authentication module

backend/
├── src/main/java/com/managementsystem/
│ ├── auth/
│ │ ├── controller/
│ │ │ └── AuthController.java # POST /register, /login, /refresh, /logout
│ │ │
│ │ ├── service/
│ │ │ ├── AuthService.java # orchestrates register/login flow
│ │ │ ├── JwtService.java # token generation, validation, parsing
│ │ │ └── CustomUserDetailsService.java # bridges User entity → Spring Security
│ │ │
│ │ ├── repository/
│ │ │ ├── UserRepository.java
│ │ │ └── RefreshTokenRepository.java
│ │ │
│ │ ├── model/
│ │ │ ├── User.java
│ │ │ ├── Role.java # enum: USER, ADMIN
│ │ │ └── RefreshToken.java
│ │ │
│ │ ├── dto/
│ │ │ ├── RegisterRequest.java
│ │ │ ├── LoginRequest.java
│ │ │ ├── AuthResponse.java # accessToken, refreshToken, expiresIn
│ │ │ └── RefreshTokenRequest.java
│ │ │
│ │ ├── security/
│ │ │ ├── JwtAuthFilter.java # OncePerRequestFilter — runs on every request
│ │ │ └── JwtAuthEntryPoint.java # handles unauthorized (401) responses
│ │ │
│ │ └── exception/
│ │ ├── InvalidCredentialsException.java
│ │ ├── TokenExpiredException.java
│ │ └── UserAlreadyExistsException.java

auth/ is a single domain package — merges what would otherwise be a separate user/ module, since user management and authentication change together at this stage. Will split into profile/ only when profile-specific features (avatar, preferences) grow large enough to justify it.
Follows the same MVC layering as grocery/: controller/ → service/ → repository/ → model/. Controller handles request/response only; all business logic lives in service; repository is pure persistence.
Key isolation decisions:

JwtService owns all token logic (signing key, algorithm, expiry) — the only file that changes if the signing algorithm changes (e.g. HS256 → RS256).
CustomUserDetailsService is the sole bridge between the User entity and Spring Security's UserDetails — Spring Security never touches User directly.
RefreshToken is persisted separately from the access token, since access tokens are stateless JWTs (never stored) while refresh tokens need server-side rotation/revocation support.
DTOs (AuthResponse, etc.) are mandatory at the API boundary — User entity is never serialized directly, since it carries the password hash.

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
│ └── auth
│ ├── pages
│ │ ├── LoginPage.tsx
│ │ └── SignupPage.tsx
│ │
│ ├── components
│ │ ├── LoginForm.tsx
│ │ └── SignupForm.tsx
│ │
│ ├── services
│ │ └── authApi.ts
│ │
│ └── hooks
│ └── useAuth.ts
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
