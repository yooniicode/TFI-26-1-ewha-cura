package com.byby.backend.common.security;

import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JwtSessionValidator {

    private final UserCredentialRepository userCredentialRepository;

    public void validate(Claims claims) {
        UUID authUserId = UUID.fromString(claims.getSubject());
        long tokenSessionVersion = readSessionVersion(claims);
        long currentSessionVersion = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new JwtException("JWT account no longer exists"))
                .getSessionVersion();

        if (tokenSessionVersion != currentSessionVersion) {
            throw new JwtException("JWT session has expired");
        }
    }

    private long readSessionVersion(Claims claims) {
        Object value = claims.get(JwtUtil.SESSION_VERSION_CLAIM);
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                throw new JwtException("JWT session version is invalid");
            }
        }
        throw new JwtException("JWT session version is missing");
    }
}
