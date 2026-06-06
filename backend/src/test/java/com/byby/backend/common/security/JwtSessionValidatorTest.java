package com.byby.backend.common.security;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.auth.entity.UserCredential;
import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtSessionValidatorTest {

    private static final UUID AUTH_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String SECRET = "test-secret-key-minimum-256-bits-long-for-testing-only!!";

    @Mock
    private UserCredentialRepository userCredentialRepository;

    private JwtSessionValidator validator;
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        validator = new JwtSessionValidator(userCredentialRepository);
        jwtUtil = new JwtUtil(SECRET, 86_400_000);
    }

    @Test
    void acceptsTokenWithCurrentSessionVersion() {
        when(userCredentialRepository.findByAuthUserId(AUTH_USER_ID))
                .thenReturn(Optional.of(credential(3L)));

        assertThatCode(() -> validator.validate(claims(3L)))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsTokenWithOldSessionVersion() {
        when(userCredentialRepository.findByAuthUserId(AUTH_USER_ID))
                .thenReturn(Optional.of(credential(4L)));

        assertThatThrownBy(() -> validator.validate(claims(3L)))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokenWithoutSessionVersion() {
        assertThatThrownBy(() -> validator.validate(claims(null)))
                .isInstanceOf(JwtException.class);
    }

    private UserCredential credential(long sessionVersion) {
        return UserCredential.builder()
                .authUserId(AUTH_USER_ID)
                .requestedRole(UserRole.patient)
                .sessionVersion(sessionVersion)
                .build();
    }

    private Claims claims(Long sessionVersion) {
        JwtBuilder builder = Jwts.builder()
                .subject(AUTH_USER_ID.toString())
                .claim("app_role", UserRole.patient.name());
        if (sessionVersion != null) {
            builder.claim(JwtUtil.SESSION_VERSION_CLAIM, sessionVersion);
        }
        return jwtUtil.parse(builder
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact());
    }
}
