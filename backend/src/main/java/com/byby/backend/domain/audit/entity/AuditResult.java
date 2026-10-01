package com.byby.backend.domain.audit.entity;

public enum AuditResult {
    SUCCESS,
    /** 권한 없음 등으로 차단된 접근 — 오·남용 점검에 필요하므로 함께 남긴다 */
    DENIED,
    ERROR
}
