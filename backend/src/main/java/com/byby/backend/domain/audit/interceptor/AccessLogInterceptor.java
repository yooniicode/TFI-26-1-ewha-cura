package com.byby.backend.domain.audit.interceptor;

import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;
import com.byby.backend.domain.audit.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 개인정보를 다루는 API 요청을 접속기록으로 남긴다.
 *
 * <p>요청 본문은 절대 기록하지 않는다(비밀번호·진료내용이 로그에 복제되는 것을 막기 위함).
 * 대신 "누가 / 언제 / 어디서 / 누구의 정보를 / 무슨 업무로" 만 남긴다.
 */
@Component
@RequiredArgsConstructor
public class AccessLogInterceptor implements HandlerInterceptor {

    /** 개인정보를 다루지 않아 기록 가치가 없는 경로 */
    private static final List<String> SKIP_PREFIXES = List.of(
            "/api/v1/auth/phone/request",
            "/api/v1/auth/phone/verify",
            "/api/v1/auth/email-exists",
            "/api/v1/centers",
            "/api/v1/hospitals"
    );

    private final AuditService auditService;

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        String uri = request.getRequestURI();
        if (!uri.startsWith("/api/v1/") || isSkipped(uri)) return;

        UserPrincipal principal = currentPrincipal();
        int status = response.getStatus();

        // 비로그인 요청 중에는 로그인 시도만 남긴다 (인증 성공/실패 모두 접속기록 대상)
        boolean loginAttempt = isLoginAttempt(uri);
        if (principal == null && !loginAttempt) return;

        Map<String, String> pathVars = pathVariables(request);
        auditService.recordAccess(
                principal != null ? principal.getAuthUserId() : null,
                principal != null ? principal.getRole() : null,
                resolveAction(uri, request.getMethod()),
                resolveResourceType(uri),
                resolveResourceId(pathVars),
                resolveSubjectPatientId(pathVars),
                uri,
                request.getMethod(),
                clientIp(request),
                request.getHeader("User-Agent"),
                status,
                resolveResult(status));
    }

    // ─── 해석 헬퍼 ──────────────────────────────────────────────────────────

    private boolean isSkipped(String uri) {
        return SKIP_PREFIXES.stream().anyMatch(uri::startsWith);
    }

    private boolean isLoginAttempt(String uri) {
        return uri.startsWith("/api/v1/auth/login")
                || uri.startsWith("/api/v1/auth/kakao")
                || uri.startsWith("/api/v1/auth/phone/login")
                || uri.startsWith("/api/v1/auth/signup")
                || uri.startsWith("/api/v1/auth/phone/signup")
                || uri.startsWith("/api/v1/auth/register-admin");
    }

    private UserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) return null;
        return principal;
    }

    private AuditAction resolveAction(String uri, String method) {
        if (uri.startsWith("/api/v1/auth/logout")) return AuditAction.LOGOUT;
        if (isLoginAttempt(uri)) return AuditAction.LOGIN;
        if (uri.contains("/export") || uri.contains("/sheet")) return AuditAction.EXPORT;

        return switch (method) {
            case "POST" -> AuditAction.CREATE;
            case "PUT", "PATCH" -> AuditAction.UPDATE;
            case "DELETE" -> AuditAction.DELETE;
            default -> AuditAction.VIEW;
        };
    }

    /** /api/v1/{segment}/... 또는 /api/v1/admin/{segment}/... 에서 자원 종류를 뽑는다. */
    private String resolveResourceType(String uri) {
        String[] parts = uri.split("/");
        // ["", "api", "v1", seg, ...]
        if (parts.length < 4) return "UNKNOWN";
        String segment = parts[3];
        if ("admin".equals(segment) && parts.length >= 5) {
            return ("ADMIN_" + parts[4]).toUpperCase();
        }
        return segment.toUpperCase();
    }

    private UUID resolveResourceId(Map<String, String> pathVars) {
        for (String key : List.of("id", "consultationId", "matchId", "memoId", "roomId", "interpreterId")) {
            UUID value = parseUuid(pathVars.get(key));
            if (value != null) return value;
        }
        return null;
    }

    /** 처리한 정보주체 — 경로에 환자 식별자가 있으면 기록한다. */
    private UUID resolveSubjectPatientId(Map<String, String> pathVars) {
        return parseUuid(pathVars.get("patientId"));
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> pathVariables(HttpServletRequest request) {
        Object attr = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        return attr instanceof Map ? (Map<String, String>) attr : Map.of();
    }

    private UUID parseUuid(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private AuditResult resolveResult(int status) {
        if (status == 401 || status == 403) return AuditResult.DENIED;
        if (status >= 400) return AuditResult.ERROR;
        return AuditResult.SUCCESS;
    }

    /** 프록시(Vercel rewrite → Railway) 뒤에 있으므로 X-Forwarded-For 를 우선한다. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            String first = forwarded.split(",")[0].trim();
            if (StringUtils.hasText(first)) return first;
        }
        String realIp = request.getHeader("X-Real-IP");
        return StringUtils.hasText(realIp) ? realIp : request.getRemoteAddr();
    }
}
