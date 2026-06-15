package com.byby.backend.domain.auth.dto;

import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.UserRole;

import java.util.UUID;

public class AuthResponse {

    public record Me(
            UUID authUserId,
            UserRole role,
            String name,
            UUID entityId,
            UUID centerId,
            String centerName,
            String nickname,
            String avatarUrl
    ) {
        public Me(UUID authUserId, UserRole role, String name, UUID entityId) {
            this(authUserId, role, name, entityId, null, null, null, null);
        }
    }

    public record Member(
            UUID authUserId,
            String email,
            String name,
            String phone,
            UserRole role,
            InterpreterRole interpreterRole,
            UUID interpreterId,
            UUID centerId,
            String centerName,
            boolean profileRegistered,
            boolean approved
    ) {}

    public record EmailExists(
            boolean exists
    ) {}

    public record TokenMe(
            String token,
            Me me
    ) {}

    public record PhoneVerification(
            String receiveNumber,
            String code
    ) {}

    public record PhoneVerified(boolean verified) {}

    /** /auth/phone/login 응답 — exists=true 면 token/me 포함, false 면 둘 다 null */
    public record PhoneLoginResult(boolean exists, String token, Me me) {}

    /** 마이페이지 "계정 연동" 현황 — email/hasPassword는 실제 사용 가능한 이메일 로그인 여부를 의미 */
    public record LinkedAccounts(
            String email,
            boolean hasPassword,
            boolean hasKakao,
            String phone
    ) {}
}
