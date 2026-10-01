package com.byby.backend.domain.audit.service;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.audit.entity.AccessLog;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;
import com.byby.backend.domain.audit.repository.AccessLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 접속기록 적재.
 *
 * <p>업무 트랜잭션이 롤백돼도 "접근이 있었다"는 사실은 남아야 하므로 항상 별도 트랜잭션에서 기록한다.
 * 기록 실패가 본 요청을 깨뜨리지 않도록 예외는 삼키고 경고만 남긴다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private static final int MAX_USER_AGENT = 300;
    private static final int MAX_URI = 500;

    private final AccessLogRepository accessLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AccessLog.AccessLogBuilder builder) {
        try {
            accessLogRepository.save(builder.build());
        } catch (Exception e) {
            log.warn("[audit] 접속기록 저장 실패: {}", e.getMessage());
        }
    }

    /** 요청 인터셉터용 — 취급자/대상/결과를 한 번에 남긴다. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAccess(UUID authUserId, UserRole role, AuditAction action, String resourceType,
                             UUID resourceId, UUID subjectPatientId, String requestUri, String httpMethod,
                             String ipAddress, String userAgent, int statusCode, AuditResult result) {
        try {
            accessLogRepository.save(AccessLog.builder()
                    .authUserId(authUserId)
                    .role(role)
                    .action(action)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .subjectPatientId(subjectPatientId)
                    .requestUri(truncate(requestUri, MAX_URI))
                    .httpMethod(httpMethod)
                    .ipAddress(ipAddress)
                    .userAgent(truncate(userAgent, MAX_USER_AGENT))
                    .statusCode(statusCode)
                    .result(result)
                    .build());
        } catch (Exception e) {
            log.warn("[audit] 접속기록 저장 실패: {}", e.getMessage());
        }
    }

    /**
     * 제3자 제공·국외 이전 기록 (개인정보보호법 제17조·제28조의8).
     * 번역 API 호출, 구글 시트 내보내기처럼 데이터가 외부로 나가는 시점에 남긴다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordThirdPartyTransfer(UUID authUserId, UserRole role, String recipient,
                                         String resourceType, UUID resourceId, UUID subjectPatientId,
                                         String detail) {
        try {
            accessLogRepository.save(AccessLog.builder()
                    .authUserId(authUserId)
                    .role(role)
                    .action(AuditAction.THIRD_PARTY_TRANSFER)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .subjectPatientId(subjectPatientId)
                    .result(AuditResult.SUCCESS)
                    .detail("수신자=" + recipient + (detail != null ? " / " + detail : ""))
                    .build());
        } catch (Exception e) {
            log.warn("[audit] 제3자 제공 기록 저장 실패: {}", e.getMessage());
        }
    }

    private String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
