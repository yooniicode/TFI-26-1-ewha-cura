package com.byby.backend.domain.admin.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** AD-홈 어드민 현황판 (웹) */
public class AdminDashboardResponse {

    public record Overview(
            UUID centerId,
            String centerName,
            Today today,
            Approval approval,
            Monthly monthly,
            List<Alert> alerts
    ) {}

    /** AD-홈-1 오늘 현황 — 매칭 요청 N건 / 진행 중 N건 */
    public record Today(
            long newRequestCount,
            long unassignedCount,
            long inProgressCount
    ) {}

    /** AD-홈-2 승인 대기 — 보고서 승인 대기 N건 */
    public record Approval(
            long pendingReportCount,
            long rejectedReportCount
    ) {}

    /** AD-홈-3 이달 통계 — 완료 건수 · 활동 통번역가 수 */
    public record Monthly(
            int year,
            int month,
            long completedCount,
            long activeInterpreterCount,
            long patientCount
    ) {}

    /**
     * AD-홈-4 알림.
     * type: REPORT_REJECTED(수정 요청) | REPORT_OVERDUE(미응답 통번역가) | REQUEST_UNASSIGNED(미배정 요청)
     */
    public record Alert(
            String type,
            String message,
            UUID consultationId,
            UUID patientId,
            String patientName,
            UUID interpreterId,
            String interpreterName,
            LocalDateTime occurredAt
    ) {}
}
