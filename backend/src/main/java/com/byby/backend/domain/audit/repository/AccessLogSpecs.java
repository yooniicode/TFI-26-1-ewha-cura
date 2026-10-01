package com.byby.backend.domain.audit.repository;

import com.byby.backend.domain.audit.entity.AccessLog;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

/** 접속기록 점검 화면의 선택 필터 조합 */
public final class AccessLogSpecs {

    private AccessLogSpecs() {}

    @SafeVarargs
    public static Specification<AccessLog> allOf(Specification<AccessLog>... specs) {
        Specification<AccessLog> result = null;
        for (Specification<AccessLog> spec : specs) {
            if (spec == null) continue;
            result = (result == null) ? spec : result.and(spec);
        }
        return result;
    }

    public static Specification<AccessLog> occurredBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> cb.between(root.get("occurredAt"), from, to);
    }

    public static Specification<AccessLog> authUserId(UUID authUserId) {
        if (authUserId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("authUserId"), authUserId);
    }

    public static Specification<AccessLog> subjectPatientId(UUID patientId) {
        if (patientId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("subjectPatientId"), patientId);
    }

    public static Specification<AccessLog> action(AuditAction action) {
        if (action == null) return null;
        return (root, query, cb) -> cb.equal(root.get("action"), action);
    }

    public static Specification<AccessLog> result(AuditResult result) {
        if (result == null) return null;
        return (root, query, cb) -> cb.equal(root.get("result"), result);
    }

    public static Specification<AccessLog> resourceType(String resourceType) {
        if (resourceType == null || resourceType.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("resourceType"), resourceType.trim().toUpperCase());
    }
}
