package com.byby.backend.common.security;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.auth.entity.UserCredential;
import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 로그아웃·비밀번호 변경 시 기존 토큰이 실제로 무효화되는지 검증한다.
 * (session_version 이 검증되지 않으면 로그아웃해도 토큰이 만료까지 살아있다.)
 */
@SpringBootTest
class SessionRevocationTest {

    @Autowired JwtUtil jwtUtil;
    @Autowired AuthRoleResolver authRoleResolver;
    @Autowired AuthCookieManager authCookieManager;
    @Autowired SessionVersionValidator sessionVersionValidator;
    @Autowired UserCredentialRepository userCredentialRepository;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    private JwtAuthFilter filter;
    private UUID authUserId;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthFilter(jwtUtil, authRoleResolver, authCookieManager, sessionVersionValidator);
        SecurityContextHolder.clearContext();

        authUserId = UUID.randomUUID();
        userCredentialRepository.save(UserCredential.builder()
                .email("revoke-" + authUserId + "@test.local")
                .passwordHash("x")
                .authUserId(authUserId)
                .requestedRole(UserRole.patient)
                .sessionVersion(3L)
                .build());
    }

    private MockHttpServletResponse runFilter(String token, boolean asCookie) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/patients");
        request.setRequestURI("/api/v1/patients");
        if (asCookie) {
            request.setCookies(new jakarta.servlet.http.Cookie(
                    AuthCookieManager.ACCESS_TOKEN_COOKIE, token));
        } else {
            request.addHeader("Authorization", "Bearer " + token);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    @DisplayName("현재 session_version 을 가진 토큰은 인증된다 — 쿠키/헤더 both")
    void currentTokenAuthenticates() throws Exception {
        String token = jwtUtil.generate(authUserId, UserRole.patient, 3L);

        assertThat(runFilter(token, true).getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();

        SecurityContextHolder.clearContext();
        assertThat(runFilter(token, false).getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    @DisplayName("로그아웃으로 session_version 이 올라가면 기존 토큰은 401")
    void staleTokenIsRejectedAfterRevocation() throws Exception {
        String token = jwtUtil.generate(authUserId, UserRole.patient, 3L);

        // 로그아웃/비밀번호 변경이 하는 일 (별도 트랜잭션에서 커밋되어야 필터가 새 값을 읽는다)
        transactionTemplate.executeWithoutResult(
                status -> userCredentialRepository.incrementSessionVersion(authUserId));

        MockHttpServletResponse response = runFilter(token, true);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        // 무효 토큰 쿠키는 즉시 만료시켜 401 루프를 막는다
        assertThat(response.getHeader("Set-Cookie"))
                .contains(AuthCookieManager.ACCESS_TOKEN_COOKIE)
                .contains("Max-Age=0");
    }

    @Test
    @DisplayName("session_version 클레임이 없는 토큰은 거부된다")
    void tokenWithoutSessionVersionIsRejected() throws Exception {
        Claims claims = jwtUtil.parse(jwtUtil.generate(authUserId, UserRole.patient, 3L));
        assertThat(claims.get(JwtUtil.SESSION_VERSION_CLAIM)).isNotNull();

        assertThat(sessionVersionValidator.isCurrent(authUserId, null)).isFalse();
    }

    @Test
    @DisplayName("발급 쿠키는 httpOnly + SameSite 로 내려간다")
    void issuedCookieIsHttpOnly() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        authCookieManager.write(response, "dummy-token");

        String setCookie = response.getHeader("Set-Cookie");
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
    }
}
