package com.byby.backend.common.security;

import com.byby.backend.common.enums.UserRole;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.security.WeakKeyException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Component
public class JwtUtil {

    private final SecretKey signingKey;
    private final List<SecretKey> verificationKeys;
    private final long expirationMs;

    public JwtUtil(
            @Value("${byby.security.jwt.secret}") String secret,
            @Value("${byby.security.jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.verificationKeys = buildVerificationKeys(secret, signingKey);
        this.expirationMs = expirationMs;
    }

    public String generate(UUID authUserId, UserRole role) {
        return Jwts.builder()
                .subject(authUserId.toString())
                .claim("app_role", role.name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signingKey)
                .compact();
    }

    public Claims parse(String token) {
        SignatureException lastSigEx = null;
        for (SecretKey key : verificationKeys) {
            try {
                return Jwts.parser().verifyWith(key).build()
                        .parseSignedClaims(token).getPayload();
            } catch (SignatureException e) {
                lastSigEx = e;
            }
        }
        throw lastSigEx != null ? lastSigEx : new JwtException("JWT verification failed");
    }

    public UserPrincipal toPrincipal(String token) {
        Claims claims = parse(token);
        UUID authUserId = UUID.fromString(claims.getSubject());
        UserRole role = resolveRole(resolveRoleFromClaims(claims));
        return new UserPrincipal(authUserId, role);
    }

    public boolean isValid(String token) {
        try {
            toPrincipal(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT: {}", e.getMessage());
            return false;
        }
    }

    private List<SecretKey> buildVerificationKeys(String secret, SecretKey primaryKey) {
        List<SecretKey> keys = new ArrayList<>();
        keys.add(primaryKey);
        try {
            keys.add(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)));
        } catch (IllegalArgumentException | WeakKeyException | io.jsonwebtoken.io.DecodingException e) {
            log.debug("JWT secret not usable as Base64-decoded key: {}", e.getMessage());
        }
        return List.copyOf(keys);
    }

    private String resolveRoleFromClaims(Claims claims) {
        String roleStr = claims.get("app_role", String.class);
        if (roleStr != null) return roleStr;
        Object appMeta = claims.get("app_metadata");
        if (appMeta instanceof Map<?, ?> map) {
            Object r = map.get("app_role");
            if (r != null) return r.toString();
        }
        return null;
    }

    private UserRole resolveRole(String roleStr) {
        if (!StringUtils.hasText(roleStr)) return UserRole.patient;
        try {
            return UserRole.valueOf(roleStr.trim().toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return UserRole.patient;
        }
    }
}
