package com.byby.backend.common.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;

/**
 * JWT를 httpOnly 쿠키로 전달한다.
 *
 * <p>프론트엔드(Next.js)가 {@code /api/v1/*} 를 백엔드로 리라이트하므로 브라우저 기준으로는
 * 동일 출처다. 따라서 {@code SameSite=Lax} 로도 쿠키가 정상 전달되며, 상태를 변경하는
 * POST/PUT/PATCH/DELETE 요청에는 교차 사이트 쿠키가 실리지 않아 CSRF 방어가 함께 걸린다.
 */
@Component
public class AuthCookieManager {

    public static final String ACCESS_TOKEN_COOKIE = "byby_access_token";

    @Value("${byby.security.cookie.secure:true}")
    private boolean secure;

    @Value("${byby.security.cookie.same-site:Lax}")
    private String sameSite;

    @Value("${byby.security.jwt.expiration-ms:86400000}")
    private long expirationMs;

    /** 로그인·회원가입 성공 시 토큰 쿠키를 심는다. */
    public void write(HttpServletResponse response, String token) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(token, Duration.ofMillis(expirationMs)).toString());
    }

    /** 로그아웃·탈퇴 시 토큰 쿠키를 만료시킨다. */
    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, build("", Duration.ZERO).toString());
    }

    /** 쿠키 → Authorization 헤더 순으로 토큰을 찾는다. 헤더는 Swagger·서버 간 호출용으로 남겨둔다. */
    public String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (ACCESS_TOKEN_COOKIE.equals(cookie.getName()) && StringUtils.hasText(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(ACCESS_TOKEN_COOKIE, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
