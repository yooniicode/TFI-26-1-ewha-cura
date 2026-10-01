package com.byby.backend.domain.audit.service;

import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.repository.AdminProfileRepository;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.audit.dto.AuditResponse;
import com.byby.backend.domain.audit.entity.AccessLog;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;
import com.byby.backend.domain.audit.repository.AccessLogRepository;
import com.byby.backend.domain.audit.repository.AccessLogSpecs;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** 센터장 접속기록 점검 조회 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditQueryService {

    private final AccessLogRepository accessLogRepository;
    private final AdminService adminService;
    private final AdminProfileRepository adminProfileRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientRepository patientRepository;

    public Page<AuditResponse.Entry> search(LocalDate from, LocalDate to, UUID authUserId,
                                            UUID subjectPatientId, AuditAction action,
                                            AuditResult result, String resourceType,
                                            Pageable pageable, UserPrincipal principal) {
        adminService.getAdminCenter(principal);   // 센터장 권한 및 센터 설정 확인

        LocalDateTime start = (from != null ? from : LocalDate.now().minusDays(30)).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(23, 59, 59);

        Specification<AccessLog> spec = AccessLogSpecs.allOf(
                AccessLogSpecs.occurredBetween(start, end),
                AccessLogSpecs.authUserId(authUserId),
                AccessLogSpecs.subjectPatientId(subjectPatientId),
                AccessLogSpecs.action(action),
                AccessLogSpecs.result(result),
                AccessLogSpecs.resourceType(resourceType));

        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "occurredAt"));

        Map<UUID, String> actorNames = new HashMap<>();
        Map<UUID, String> patientNames = new HashMap<>();
        return accessLogRepository.findAll(spec, sorted)
                .map(log -> AuditResponse.Entry.from(log,
                        resolveActorName(log.getAuthUserId(), actorNames),
                        resolvePatientName(log.getSubjectPatientId(), patientNames)));
    }

    public AuditResponse.InspectionSummary summarize(LocalDate from, LocalDate to, UserPrincipal principal) {
        adminService.getAdminCenter(principal);

        LocalDateTime start = (from != null ? from : LocalDate.now().withDayOfMonth(1)).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(23, 59, 59);
        Specification<AccessLog> period = AccessLogSpecs.occurredBetween(start, end);

        return new AuditResponse.InspectionSummary(
                start, end,
                accessLogRepository.count(period),
                accessLogRepository.count(period.and(AccessLogSpecs.result(AuditResult.DENIED))),
                accessLogRepository.count(period.and(AccessLogSpecs.action(AuditAction.EXPORT))),
                accessLogRepository.count(period.and(
                        AccessLogSpecs.action(AuditAction.THIRD_PARTY_TRANSFER))));
    }

    // ─── 이름 해석 (요청당 캐시) ────────────────────────────────────────────

    private String resolveActorName(UUID authUserId, Map<UUID, String> cache) {
        if (authUserId == null) return null;
        return cache.computeIfAbsent(authUserId, id -> adminProfileRepository.findByAuthUserId(id)
                .map(p -> p.getNickname() != null ? p.getNickname() : "센터 관리자")
                .or(() -> interpreterRepository.findByAuthUserId(id).map(i -> i.getName()))
                .or(() -> patientRepository.findByAuthUserId(id).map(Patient::getName))
                .orElse(null));
    }

    private String resolvePatientName(UUID patientId, Map<UUID, String> cache) {
        if (patientId == null) return null;
        return cache.computeIfAbsent(patientId,
                id -> patientRepository.findById(id).map(Patient::getName).orElse(null));
    }
}
