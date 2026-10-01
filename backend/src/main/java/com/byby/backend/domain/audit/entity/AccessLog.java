package com.byby.backend.domain.audit.entity;

import com.byby.backend.common.enums.UserRole;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 개인정보 접속기록 (「개인정보의 안전성 확보조치 기준」 제8조).
 *
 * <p>기록 항목: 계정(authUserId) · 접속일시(occurredAt) · 접속지 정보(ipAddress) ·
 * 처리한 정보주체 정보(subjectPatientId) · 수행업무(action/resourceType/requestUri).
 *
 * <p>위·변조 방지를 위해 append-only 로 다룬다. 수정 메서드를 두지 않으며
 * {@code updatedAt} 이 있는 BaseEntity 도 상속하지 않는다.
 */
@Entity
@Table(name = "access_log", indexes = {
        @Index(name = "idx_access_log_occurred_at", columnList = "occurred_at"),
        @Index(name = "idx_access_log_auth_user", columnList = "auth_user_id"),
        @Index(name = "idx_access_log_subject", columnList = "subject_patient_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** 개인정보취급자 계정 */
    @Column(name = "auth_user_id")
    private UUID authUserId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditAction action;

    /** CONSULTATION / PATIENT / INTERPRETER / CHAT / ANNOUNCEMENT / AUTH ... */
    @Column(name = "resource_type", length = 50)
    private String resourceType;

    @Column(name = "resource_id")
    private UUID resourceId;

    /** 처리 대상이 된 정보주체(이주민) */
    @Column(name = "subject_patient_id")
    private UUID subjectPatientId;

    @Column(name = "request_uri", length = 500)
    private String requestUri;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    /** 접속지 정보 */
    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 300)
    private String userAgent;

    @Column(name = "status_code")
    private Integer statusCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditResult result;

    /** 제3자 제공 대상, 내보낸 건수 등 부가 정보 */
    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Builder
    public AccessLog(UUID authUserId, UserRole role, AuditAction action, String resourceType,
                     UUID resourceId, UUID subjectPatientId, String requestUri, String httpMethod,
                     String ipAddress, String userAgent, Integer statusCode, AuditResult result,
                     String detail) {
        this.authUserId = authUserId;
        this.role = role;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.subjectPatientId = subjectPatientId;
        this.requestUri = requestUri;
        this.httpMethod = httpMethod;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.statusCode = statusCode;
        this.result = result != null ? result : AuditResult.SUCCESS;
        this.detail = detail;
        this.occurredAt = LocalDateTime.now();
    }
}
