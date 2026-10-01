package com.byby.backend.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

/**
 * Swagger UI / v3/api-docs 경로에 HTTP Basic 인증을 추가합니다.
 *
 * <p>사용자명: swagger (고정) / 비밀번호: SWAGGER_SECRET 값.
 * SWAGGER_SECRET 미설정 시 로컬에서는 그대로 열어두지만, 운영(prod)에서는 문서를 아예 차단합니다.
 * API 스펙이 공개되면 이주민·진료정보 엔드포인트 구조가 그대로 노출되기 때문입니다.
 */
@Slf4j
@Component
@Order(1)
public class SwaggerSecurityFilter extends OncePerRequestFilter {

    private static final String SWAGGER_USER = "swagger";

    @Value("${byby.security.swagger-secret:}")
    private String swaggerSecret;

    private final boolean productionProfile;

    public SwaggerSecurityFilter(org.springframework.core.env.Environment environment) {
        this.productionProfile = List.of(environment.getActiveProfiles()).contains("prod");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        boolean swaggerPath = path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs");
        if (!swaggerPath) return true;

        // 시크릿 미설정: 운영에서는 계속 필터를 태워 차단하고, 로컬에서만 통과시킨다
        return !StringUtils.hasText(swaggerSecret) && !productionProfile;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (!StringUtils.hasText(swaggerSecret)) {
            log.warn("SWAGGER_SECRET 미설정 — 운영 환경에서 API 문서 접근을 차단했습니다");
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Not found\"}");
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (isValidBasicAuth(authHeader)) {
            chain.doFilter(request, response);
            return;
        }

        // 인증 요구 응답
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setHeader("WWW-Authenticate", "Basic realm=\"Swagger UI\"");
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"Swagger UI requires authentication. Set Authorization: Basic header.\"}");
    }

    private boolean isValidBasicAuth(String authHeader) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Basic ")) return false;
        try {
            String decoded = new String(Base64.getDecoder().decode(authHeader.substring(6)), StandardCharsets.UTF_8);
            String[] parts = decoded.split(":", 2);
            if (parts.length != 2) return false;
            return SWAGGER_USER.equals(parts[0]) && swaggerSecret.equals(parts[1]);
        } catch (Exception e) {
            return false;
        }
    }
}
