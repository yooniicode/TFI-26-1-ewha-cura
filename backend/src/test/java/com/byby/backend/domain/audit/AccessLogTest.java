package com.byby.backend.domain.audit;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.audit.entity.AccessLog;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;
import com.byby.backend.domain.audit.repository.AccessLogRepository;
import com.byby.backend.domain.audit.repository.AccessLogSpecs;
import com.byby.backend.domain.audit.service.AuditService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** 접속기록 적재·조회 검증 (Criteria 필터는 실행해봐야 검증된다) */
@SpringBootTest
class AccessLogTest {

    @Autowired AuditService auditService;
    @Autowired AccessLogRepository accessLogRepository;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @Test
    @DisplayName("접속기록이 저장되고 취급자·정보주체로 조회된다")
    void recordsAndSearchesAccess() {
        UUID actor = UUID.randomUUID();
        UUID patient = UUID.randomUUID();

        auditService.recordAccess(actor, UserRole.admin, AuditAction.VIEW, "CONSULTATION",
                UUID.randomUUID(), patient, "/api/v1/consultations/123", "GET",
                "203.0.113.9", "JUnit", 200, AuditResult.SUCCESS);

        LocalDateTime from = LocalDateTime.now().minusMinutes(5);
        LocalDateTime to = LocalDateTime.now().plusMinutes(5);

        Specification<AccessLog> spec = AccessLogSpecs.allOf(
                AccessLogSpecs.occurredBetween(from, to),
                AccessLogSpecs.authUserId(actor),
                AccessLogSpecs.subjectPatientId(patient),
                AccessLogSpecs.action(AuditAction.VIEW),
                AccessLogSpecs.result(AuditResult.SUCCESS),
                AccessLogSpecs.resourceType("consultation"));

        var found = accessLogRepository.findAll(spec, PageRequest.of(0, 10));
        assertThat(found.getTotalElements()).isEqualTo(1);

        AccessLog log = found.getContent().get(0);
        assertThat(log.getIpAddress()).isEqualTo("203.0.113.9");
        assertThat(log.getOccurredAt()).isNotNull();
        // 요청 본문은 절대 남기지 않는다
        assertThat(log.getDetail()).isNull();
    }

    @Test
    @DisplayName("차단된 접근(DENIED)도 오·남용 점검을 위해 남는다")
    void recordsDeniedAccess() {
        UUID actor = UUID.randomUUID();

        auditService.recordAccess(actor, UserRole.interpreter, AuditAction.VIEW, "PATIENT",
                null, UUID.randomUUID(), "/api/v1/patients/x", "GET",
                "203.0.113.10", "JUnit", 403, AuditResult.DENIED);

        Specification<AccessLog> spec = AccessLogSpecs.allOf(
                AccessLogSpecs.occurredBetween(LocalDateTime.now().minusMinutes(5), LocalDateTime.now().plusMinutes(5)),
                AccessLogSpecs.authUserId(actor),
                AccessLogSpecs.result(AuditResult.DENIED));

        assertThat(accessLogRepository.count(spec)).isEqualTo(1);
    }

    @Test
    @DisplayName("제3자 제공(국외 이전)이 수신자와 함께 기록된다")
    void recordsThirdPartyTransfer() {
        UUID actor = UUID.randomUUID();
        UUID patient = UUID.randomUUID();

        auditService.recordThirdPartyTransfer(actor, UserRole.interpreter, "OpenAI API (국외)",
                "CONSULTATION", UUID.randomUUID(), patient, "목적=번역 / 가명처리 적용");

        Specification<AccessLog> spec = AccessLogSpecs.allOf(
                AccessLogSpecs.occurredBetween(LocalDateTime.now().minusMinutes(5), LocalDateTime.now().plusMinutes(5)),
                AccessLogSpecs.authUserId(actor),
                AccessLogSpecs.action(AuditAction.THIRD_PARTY_TRANSFER));

        var found = accessLogRepository.findAll(spec, PageRequest.of(0, 10)).getContent();
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getDetail())
                .contains("수신자=OpenAI API (국외)")
                .contains("가명처리");
        assertThat(found.get(0).getSubjectPatientId()).isEqualTo(patient);
    }

    @Test
    @DisplayName("보관기간 경과 기록만 삭제된다")
    void purgesOnlyExpiredLogs() {
        UUID actor = UUID.randomUUID();
        auditService.recordAccess(actor, UserRole.admin, AuditAction.VIEW, "PATIENT",
                null, null, "/api/v1/patients", "GET", "127.0.0.1", "JUnit", 200, AuditResult.SUCCESS);

        long before = accessLogRepository.count();
        // 보관기간(하루 전) 이전 기록만 지우므로 방금 남긴 기록은 유지되어야 한다
        int deleted = transactionTemplate.execute(
                status -> accessLogRepository.deleteByOccurredAtBefore(LocalDateTime.now().minusDays(1)));

        assertThat(deleted).isZero();
        assertThat(accessLogRepository.count()).isEqualTo(before);
    }
}
