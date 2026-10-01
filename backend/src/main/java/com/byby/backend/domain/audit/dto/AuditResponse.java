package com.byby.backend.domain.audit.dto;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.audit.entity.AccessLog;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuditResponse {

    /** 접속기록 1행 */
    public record Entry(
            UUID id,
            UUID authUserId,
            UserRole role,
            String actorName,
            AuditAction action,
            String actionLabel,
            String resourceType,
            UUID resourceId,
            UUID subjectPatientId,
            String subjectPatientName,
            String requestUri,
            String httpMethod,
            String ipAddress,
            Integer statusCode,
            AuditResult result,
            String detail,
            LocalDateTime occurredAt
    ) {
        public static Entry from(AccessLog log, String actorName, String subjectPatientName) {
            return new Entry(
                    log.getId(), log.getAuthUserId(), log.getRole(), actorName,
                    log.getAction(), log.getAction().getLabel(),
                    log.getResourceType(), log.getResourceId(),
                    log.getSubjectPatientId(), subjectPatientName,
                    log.getRequestUri(), log.getHttpMethod(), log.getIpAddress(),
                    log.getStatusCode(), log.getResult(), log.getDetail(), log.getOccurredAt());
        }
    }

    /** 월 1회 이상 점검 의무(안전성 확보조치 기준 제8조 제2항) 대응용 요약 */
    public record InspectionSummary(
            LocalDateTime from,
            LocalDateTime to,
            long totalCount,
            long deniedCount,
            long exportCount,
            long thirdPartyTransferCount
    ) {}
}
