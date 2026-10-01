package com.byby.backend.domain.admin.dto;

import com.byby.backend.common.enums.IssueType;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.ReportStatus;
import com.byby.backend.domain.consultation.entity.Consultation;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** AD-보고서 관리 응답 DTO */
public class AdminReportResponse {

    /** AD-보고서 목록 행 */
    public record Item(
            UUID consultationId,
            LocalDateTime consultationDate,
            UUID patientId,
            String patientName,
            Nationality patientNationality,
            UUID interpreterId,
            String interpreterName,
            UUID hospitalId,
            String hospitalName,
            String department,
            IssueType issueType,
            String workDescription,
            BigDecimal durationHours,
            ReportStatus reportStatus,
            LocalDateTime reportSubmittedAt,
            LocalDateTime reportReviewedAt,
            String reportReviewerName,
            String reportRejectReason,
            LocalDateTime createdAt
    ) {
        public static Item from(Consultation c) {
            return new Item(
                    c.getId(), c.getConsultationDate(),
                    c.getPatient().getId(), c.getPatient().getName(), c.getPatient().getNationality(),
                    c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getHospital() != null ? c.getHospital().getId() : null,
                    c.getResolvedHospitalName(), c.getDepartment(),
                    c.getIssueType(), c.getWorkDescription(), c.getDurationHours(),
                    c.getReportStatus(), c.getReportSubmittedAt(), c.getReportReviewedAt(),
                    c.getReportReviewerName(), c.getReportRejectReason(),
                    c.getCreatedAt());
        }
    }

    /** 상태별 건수 — 탭 배지용 */
    public record StatusSummary(
            long draftCount,
            long pendingCount,
            long approvedCount,
            long rejectedCount
    ) {}
}
