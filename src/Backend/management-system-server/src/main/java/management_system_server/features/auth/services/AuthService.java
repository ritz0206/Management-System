package management_system_server.features.auth.services;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import management_system_server.features.auth.dto.AuthResponse;
import management_system_server.features.auth.dto.LoginRequest;
import management_system_server.features.auth.dto.RegisterRequest;
import management_system_server.features.auth.exception.InvalidCredentialsException;
import management_system_server.features.auth.exception.UserAlreadyExistsException;
import management_system_server.features.auth.model.Role;
import management_system_server.features.auth.model.User;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    // In-memory user store — replaces database until PostgreSQL is connected
    private final Map<String, User> userStore = new ConcurrentHashMap<>();

    @PostConstruct
    public void seedTestUser() {
        User testUser = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .createdAt(LocalDateTime.now())
                .build();
        userStore.put(testUser.getEmail(), testUser);
    }

    public AuthResponse register(RegisterRequest request) {
        if (userStore.containsKey(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered");
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .createdAt(LocalDateTime.now())
                .build();

        userStore.put(user.getEmail(), user);

        return AuthResponse.builder()
                .message("User registered successfully")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userStore.get(request.getEmail());

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .message("Login successful")
                .build();
    }

    public User findByEmail(String email) {
        return userStore.get(email);
    }
}
