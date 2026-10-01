package com.byby.backend.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Set<String> AUTH_ENDPOINTS_ALLOWING_STALE_TOKEN = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/signup",
            "/api/v1/auth/kakao",
            "/api/v1/auth/register-admin",
            "/api/v1/auth/email-exists"
    );

    private final JwtUtil jwtUtil;
    private final AuthRoleResolver authRoleResolver;
    private final AuthCookieManager authCookieManager;
    private final SessionVersionValidator sessionVersionValidator;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = authCookieManager.read(request);
        if (StringUtils.hasText(token)) {
            try {
                Claims claims = jwtUtil.parse(token);
                UserPrincipal parsed = jwtUtil.toPrincipal(claims);
                requireCurrentSession(claims, parsed.getAuthUserId());

                UserPrincipal principal = authRoleResolver.resolve(parsed);
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
                if (allowsStaleToken(request)) {
                    log.debug("JWT ignored on public auth endpoint: {}", e.getMessage());
                } else {
                    log.debug("JWT principal extraction failed: {}", e.getMessage());
                    // 무효 토큰이 브라우저에 남아 401 루프가 나지 않도록 쿠키를 정리한다
                    authCookieManager.clear(response);
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
                    return;
                }
            }
        }
        chain.doFilter(request, response);
    }

    /** 로그아웃·비밀번호 변경 이후 발급된 토큰만 통과시킨다. */
    private void requireCurrentSession(Claims claims, UUID authUserId) {
        // JJWT는 작은 정수를 Integer로 역직렬화하므로 Number로 받아 변환한다
        Object raw = claims.get(JwtUtil.SESSION_VERSION_CLAIM);
        Long tokenVersion = (raw instanceof Number number) ? number.longValue() : null;
        if (!sessionVersionValidator.isCurrent(authUserId, tokenVersion)) {
            throw new IllegalStateException("session revoked");
        }
    }

    private boolean allowsStaleToken(HttpServletRequest request) {
        return AUTH_ENDPOINTS_ALLOWING_STALE_TOKEN.contains(request.getRequestURI());
    }
}
