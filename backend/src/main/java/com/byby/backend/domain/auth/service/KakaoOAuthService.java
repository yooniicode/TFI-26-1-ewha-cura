package com.byby.backend.domain.auth.service;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.JwtUtil;
import com.byby.backend.domain.auth.dto.AuthResponse;
import com.byby.backend.domain.auth.entity.UserCredential;
import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoOAuthService {

    private final UserCredentialRepository credentialRepository;
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${byby.kakao.rest-api-key:}")
    private String restApiKey;

    @Value("${byby.kakao.redirect-uri:}")
    private String redirectUri;

    @Value("${byby.kakao.client-secret:}")
    private String clientSecret;

    /**
     * 카카오 인가 코드 → 우리 서비스 JWT 발급
     *
     * @param code        카카오에서 받은 인가 코드 (code grant)
     * @param clientRedirectUri 프론트엔드가 카카오에 전달한 redirect_uri (미입력 시 env 값 사용)
     */
    @Transactional
    public AuthResponse.TokenMe loginWithCode(String code, String clientRedirectUri) {
        if (!StringUtils.hasText(restApiKey)) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "KAKAO_REST_API_KEY 가 설정되지 않았습니다");
        }

        String effectiveRedirectUri = StringUtils.hasText(clientRedirectUri) ? clientRedirectUri : redirectUri;
        String kakaoAccessToken = fetchKakaoToken(code, effectiveRedirectUri);
        KakaoUserInfo userInfo     = fetchKakaoUserInfo(kakaoAccessToken);

        // 기존 계정 조회 (kakaoId 기준)
        UserCredential cred = credentialRepository.findByKakaoId(userInfo.id())
                .orElseGet(() -> createKakaoUser(userInfo));

        long sessionVersion = authService.rotateSessionVersion(cred.getAuthUserId());
        String token = jwtUtil.generate(cred.getAuthUserId(), cred.getRequestedRole(), sessionVersion);
        AuthResponse.Me me = authService.getMe(
                new com.byby.backend.common.security.UserPrincipal(cred.getAuthUserId(), cred.getRequestedRole()));
        return new AuthResponse.TokenMe(token, me);
    }

    /**
     * 마이페이지 "계정 연동" — 로그인된 사용자(authUserId)에 카카오 계정을 연동한다.
     *
     * @param code        카카오에서 받은 인가 코드 (code grant)
     * @param clientRedirectUri 프론트엔드가 카카오에 전달한 redirect_uri (미입력 시 env 값 사용)
     * @param authUserId  연동 대상 계정의 authUserId (로그인된 사용자)
     */
    @Transactional
    public AuthResponse.LinkedAccounts linkAccount(String code, String clientRedirectUri, UUID authUserId) {
        if (!StringUtils.hasText(restApiKey)) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "KAKAO_REST_API_KEY 가 설정되지 않았습니다");
        }

        String effectiveRedirectUri = StringUtils.hasText(clientRedirectUri) ? clientRedirectUri : redirectUri;
        String kakaoAccessToken = fetchKakaoToken(code, effectiveRedirectUri);
        KakaoUserInfo userInfo = fetchKakaoUserInfo(kakaoAccessToken);

        credentialRepository.findByKakaoId(userInfo.id()).ifPresent(existing -> {
            if (!existing.getAuthUserId().equals(authUserId)) {
                throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이미 다른 계정에 연동된 카카오 계정입니다");
            }
        });

        UserCredential cred = credentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
        if (cred.getKakaoId() != null && !cred.getKakaoId().equals(userInfo.id())) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이미 다른 카카오 계정이 연동되어 있습니다");
        }
        if (cred.getKakaoId() == null) {
            cred.linkKakao(userInfo.id());
        }
        return authService.getLinkedAccounts(authUserId);
    }

    // ─── 카카오 토큰 교환 ──────────────────────────────────────────────────────────

    private String fetchKakaoToken(String code, String effectiveRedirectUri) {
        try {
            String body = "grant_type=authorization_code"
                    + "&client_id=" + restApiKey
                    + "&redirect_uri=" + java.net.URLEncoder.encode(effectiveRedirectUri, StandardCharsets.UTF_8)
                    + "&code=" + code
                    + (StringUtils.hasText(clientSecret) ? "&client_secret=" + clientSecret : "");

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://kauth.kakao.com/oauth/token"))
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                throw new GeneralException(GeneralErrorCode.UNAUTHORIZED,
                        "카카오 토큰 교환 실패: " + res.body());
            }

            JsonNode json = objectMapper.readTree(res.body());
            String token = json.path("access_token").asText(null);
            if (!StringUtils.hasText(token)) {
                throw new GeneralException(GeneralErrorCode.UNAUTHORIZED, "카카오 access_token 없음");
            }
            return token;
        } catch (GeneralException e) {
            throw e;
        } catch (Exception e) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "카카오 토큰 요청 실패: " + e.getMessage());
        }
    }

    // ─── 카카오 사용자 정보 ────────────────────────────────────────────────────────

    private KakaoUserInfo fetchKakaoUserInfo(String accessToken) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://kapi.kakao.com/v2/user/me"))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                throw new GeneralException(GeneralErrorCode.UNAUTHORIZED,
                        "카카오 사용자 정보 요청 실패: " + res.body());
            }

            JsonNode json     = objectMapper.readTree(res.body());
            String id         = json.path("id").asText();
            JsonNode account  = json.path("kakao_account");
            String email      = account.path("email").asText(null);
            String nickname   = account.path("profile").path("nickname").asText(null);

            return new KakaoUserInfo(id, email, nickname);
        } catch (GeneralException e) {
            throw e;
        } catch (Exception e) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "카카오 사용자 정보 조회 실패: " + e.getMessage());
        }
    }

    // ─── 신규 사용자 생성 ─────────────────────────────────────────────────────────

    private UserCredential createKakaoUser(KakaoUserInfo info) {
        UUID authUserId = UUID.randomUUID();
        UserCredential cred = UserCredential.builder()
                .email(StringUtils.hasText(info.email()) ? info.email().toLowerCase() : null)
                .passwordHash(null)   // OAuth 사용자 — 비밀번호 없음
                .kakaoId(info.id())
                .authUserId(authUserId)
                .requestedRole(UserRole.patient) // 기본 역할: 이주민
                .build();
        return credentialRepository.save(cred);
    }

    private record KakaoUserInfo(String id, String email, String nickname) {}
}
