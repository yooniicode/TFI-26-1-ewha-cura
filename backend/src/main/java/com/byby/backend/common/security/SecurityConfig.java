package com.byby.backend.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.stream.Stream;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final AuthRoleResolver authRoleResolver;
    private final AuthCookieManager authCookieManager;
    private final SessionVersionValidator sessionVersionValidator;

    private final Environment environment;

    /**
     * 관리자 콘솔 출처 — 환경변수로 덮어쓴 허용 목록에도 항상 더한다.
     * (Railway 의 BYBY_SECURITY_CORS_ALLOWED_ORIGINS 는 YAML 목록 전체를 대체하므로 따로 둔다)
     */
    @Value("${byby.security.cors.admin-origins:https://admin.cura-ewha.kr,http://localhost:3001}")
    private List<String> adminOrigins;

    /** 로컬 개발은 http 로 띄우므로 프로필별로 끌 수 있게 한다. */
    @Value("${byby.security.require-https:true}")
    private boolean requireHttps;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // 인증 쿠키가 SameSite=Lax 라 교차 사이트 상태변경 요청에는 실리지 않는다.
                // (프론트는 동일 출처 리라이트로 API를 호출한다)
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requiresChannel(channel -> {
                    if (!requireHttps) return;
                    // actuator 는 제외 — Railway 헬스체크가 컨테이너 내부로 평문 HTTP 호출하므로
                    // 리다이렉트되면 배포가 실패한다. 나머지 경로만 HTTPS 를 강제한다.
                    channel.requestMatchers("/api/**", "/swagger-ui/**", "/v3/api-docs/**")
                            .requiresSecure();
                })
                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(withDefaults())
                        .referrerPolicy(referrer -> referrer.policy(
                                ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"))
                        // 진료정보 응답이 중간 캐시나 브라우저 디스크에 남지 않도록 한다
                        .cacheControl(withDefaults()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(
                                "/swagger-ui/**", "/v3/api-docs/**",
                                "/swagger-ui.html", "/swagger-resources/**"
                        ).permitAll()
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/hospitals/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/centers/**").permitAll()
                        .requestMatchers("/api/v1/centers/dev", "/api/v1/centers/dev/**").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        new JwtAuthFilter(jwtUtil, authRoleResolver, authCookieManager, sessionVersionValidator),
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(resolveAllowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * @Value 는 YAML 목록(allowed-origins[0], [1] …)을 읽지 못하므로 Binder 로 바인딩한다.
     * Binder 는 YAML 목록과 쉼표로 구분한 환경변수를 모두 지원한다.
     */
    List<String> resolveAllowedOrigins() {
        List<String> configured = Binder.get(environment)
                .bind("byby.security.cors.allowed-origins", Bindable.listOf(String.class))
                .orElse(List.of());
        List<String> origins = Stream.concat(configured.stream(), adminOrigins.stream())
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
        return origins.isEmpty() ? List.of("http://localhost:3000") : origins;
    }
}
