package com.byby.backend.domain.auth.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_credentials",
       indexes = @Index(name = "idx_user_credentials_email", columnList = "email", unique = true))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserCredential extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, length = 320)
    private String email;

    /** 이메일/비밀번호 로그인용 (OAuth 사용자는 null) */
    @Column
    private String passwordHash;

    /** Kakao OAuth2 사용자 ID */
    @Column(unique = true, length = 50)
    private String kakaoId;

    /** 정규화된 연락처 (숫자만). 중복 가입 방지 및 계정 연동에 사용 */
    @Column(length = 20)
    private String phone;

    @Column(nullable = false, unique = true)
    private UUID authUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole requestedRole;

    @Column(length = 1024)
    private String avatarUrl;

    @Builder.Default
    @Column(nullable = false)
    private long sessionVersion = 0L;

    public boolean isOAuthUser() {
        return this.kakaoId != null;
    }

    public void updateAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public void updatePhone(String phone) {
        this.phone = phone;
    }

    public void linkKakao(String kakaoId) {
        this.kakaoId = kakaoId;
    }

    public void unlinkKakao() {
        this.kakaoId = null;
    }

    public void setupEmailPassword(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }
}
