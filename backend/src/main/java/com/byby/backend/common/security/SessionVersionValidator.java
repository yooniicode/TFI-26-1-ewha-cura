package com.byby.backend.common.security;

import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 토큰에 실린 session_version 을 DB 값과 대조한다.
 *
 * <p>로그아웃·비밀번호 변경·재로그인 시 {@code AuthService.rotateSessionVersion} 이 DB 값을 올리므로,
 * 이전에 발급된 토큰은 여기서 걸러진다. 이 검증이 없으면 로그아웃해도 토큰이 만료까지 살아있다.
 */
@Component
@RequiredArgsConstructor
public class SessionVersionValidator {

    private final UserCredentialRepository userCredentialRepository;

    @Transactional(readOnly = true)
    public boolean isCurrent(UUID authUserId, Long tokenSessionVersion) {
        if (tokenSessionVersion == null) return false;
        // 자격 증명 행이 없는 계정(레거시/외부 발급)은 0을 기준으로 본다
        long current = userCredentialRepository.findSessionVersionByAuthUserId(authUserId).orElse(0L);
        return tokenSessionVersion == current;
    }
}
