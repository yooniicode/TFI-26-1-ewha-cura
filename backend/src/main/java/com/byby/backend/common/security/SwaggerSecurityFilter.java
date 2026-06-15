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

/**
 * Swagger UI / v3/api-docs 경로에 HTTP Basic 인증을 추가합니다.
 * 환경변수 SWAGGER_SECRET 이 설정된 경우에만 활성화됩니다.
 *
 * 사용자명: swagger (고정)
 * 비밀번호: SWAGGER_SECRET 값
 */
@Slf4j
@Component
@Order(1)
public class SwaggerSecurityFilter extends OncePerRequestFilter {

    private static final String SWAGGER_USER = "swagger";

    @Value("${byby.security.swagger-secret:}")
    private String swaggerSecret;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // SWAGGER_SECRET 미설정 → 필터 비활성화 (로컬 개발 편의)
        if (!StringUtils.hasText(swaggerSecret)) return true;

        String path = request.getRequestURI();
        return !path.startsWith("/swagger-ui") && !path.startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
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
