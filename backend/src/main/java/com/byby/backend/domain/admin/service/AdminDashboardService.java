package com.byby.backend.domain.admin.service;

import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.enums.ReportStatus;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminDashboardResponse;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/** AD-홈 어드민 현황판 (웹) */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final int ALERT_LIMIT = 10;

    private final AdminService adminService;
    private final ConsultationRepository consultationRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientCenterRepository patientCenterRepository;

    public AdminDashboardResponse.Overview getOverview(UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);

        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.atTime(23, 59, 59);

        YearMonth month = YearMonth.now();
        LocalDateTime monthStart = month.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = month.atEndOfMonth().atTime(23, 59, 59);

        AdminDashboardResponse.Today todayStats = new AdminDashboardResponse.Today(
                consultationRepository.countByCenterAndCreatedAtBetween(center.getId(), dayStart, dayEnd),
                consultationRepository.countByCenterAndMatchingStatusIn(
                        center.getId(), List.of(MatchingStatus.PENDING)),
                consultationRepository.countByCenterAndMatchingStatusInAndDateBetween(
                        center.getId(), List.of(MatchingStatus.ASSIGNED), dayStart, dayEnd));

        AdminDashboardResponse.Approval approval = new AdminDashboardResponse.Approval(
                consultationRepository.countByCenterAndReportStatusIn(
                        center.getId(), List.of(ReportStatus.PENDING)),
                consultationRepository.countByCenterAndReportStatusIn(
                        center.getId(), List.of(ReportStatus.REJECTED)));

        AdminDashboardResponse.Monthly monthly = new AdminDashboardResponse.Monthly(
                month.getYear(), month.getMonthValue(),
                consultationRepository.countByCenterAndReportStatusInAndDateBetween(
                        center.getId(), List.of(ReportStatus.APPROVED), monthStart, monthEnd),
                interpreterRepository.countByCenter_IdAndActiveTrue(center.getId()),
                patientCenterRepository.countByCenterId(center.getId()));

        return new AdminDashboardResponse.Overview(
                center.getId(), center.getName(), todayStats, approval, monthly, buildAlerts(center));
    }

    private List<AdminDashboardResponse.Alert> buildAlerts(Center center) {
        List<AdminDashboardResponse.Alert> alerts = new ArrayList<>();
        PageRequest limit = PageRequest.of(0, ALERT_LIMIT);

        // 수정 요청 — 반려되어 통번역가가 다시 작성해야 하는 보고서
        consultationRepository
                .findByCenterAndReportStatusIn(center.getId(), List.of(ReportStatus.REJECTED), limit)
                .forEach(c -> alerts.add(toAlert(c, "REPORT_REJECTED",
                        "반려된 보고서입니다. 통번역가의 재작성이 필요합니다.",
                        c.getReportReviewedAt() != null ? c.getReportReviewedAt() : c.getUpdatedAt())));

        // 미응답 통번역가 — 일정이 지났는데 보고서가 작성되지 않은 건
        consultationRepository
                .findOverdueReportsByCenter(center.getId(), LocalDateTime.now(), limit)
                .forEach(c -> alerts.add(toAlert(c, "REPORT_OVERDUE",
                        "진료 일정이 지났으나 보고서가 제출되지 않았습니다.",
                        c.getConsultationDate())));

        return alerts;
    }

    private AdminDashboardResponse.Alert toAlert(Consultation c, String type, String message,
                                                 LocalDateTime occurredAt) {
        return new AdminDashboardResponse.Alert(
                type, message, c.getId(),
                c.getPatient().getId(), c.getPatient().getName(),
                c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                occurredAt);
    }
}
