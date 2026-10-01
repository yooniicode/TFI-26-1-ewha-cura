package com.byby.backend.domain.admin.service;

import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.ReportStatus;
import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminReportRequest;
import com.byby.backend.domain.admin.dto.AdminReportResponse;
import com.byby.backend.domain.admin.entity.AdminProfile;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.consultation.repository.ConsultationSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** AD-보고서 관리 — 승인 대기 · 승인 완료 · 반려 · 필터링 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportService {

    private final AdminService adminService;
    private final ConsultationRepository consultationRepository;

    /**
     * AD-보고서 목록.
     * status 미지정 시 센터 전체 보고서를 반환하며, 정렬 기본값은 작성일자(진료일) 최신순이다.
     * AD-보고서-4 필터: 환자 국적 / 요청 언어 / 병원 / 통번역가 / 기간 / 이름 검색.
     */
    public Page<AdminReportResponse.Item> getReports(
            List<ReportStatus> statuses, List<String> languages, String query,
            Nationality nationality, UUID hospitalId, String hospitalName,
            UUID interpreterId, LocalDate from, LocalDate to, String patientQuery,
            Pageable pageable, UserPrincipal principal) {

        Center center = adminService.getAdminCenter(principal);

        Specification<Consultation> spec = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(center.getId()),
                ConsultationSpecs.reportStatusIn(statuses),
                ConsultationSpecs.languageIn(languages),
                ConsultationSpecs.patientOrInterpreterName(query),
                ConsultationSpecs.nationality(nationality),
                ConsultationSpecs.hospitalId(hospitalId),
                ConsultationSpecs.hospitalNameLike(hospitalName),
                ConsultationSpecs.interpreterId(interpreterId),
                ConsultationSpecs.dateFrom(from != null ? from.atStartOfDay() : null),
                ConsultationSpecs.dateTo(to != null ? to.atTime(23, 59, 59) : null),
                ConsultationSpecs.patientQuery(patientQuery));

        return consultationRepository.findAll(spec, withDefaultSort(pageable))
                .map(AdminReportResponse.Item::from);
    }

    public AdminReportResponse.StatusSummary getSummary(UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        return new AdminReportResponse.StatusSummary(
                consultationRepository.countByCenterAndReportStatusIn(center.getId(), List.of(ReportStatus.DRAFT)),
                consultationRepository.countByCenterAndReportStatusIn(center.getId(), List.of(ReportStatus.PENDING)),
                consultationRepository.countByCenterAndReportStatusIn(center.getId(), List.of(ReportStatus.APPROVED)),
                consultationRepository.countByCenterAndReportStatusIn(center.getId(), List.of(ReportStatus.REJECTED)));
    }

    /** 센터장 상세 열람 — 통번역가 뷰와 동일한 전체 필드 */
    public ConsultationResponse.Detail getDetail(UUID consultationId, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        return ConsultationResponse.Detail.from(findInCenter(consultationId, center));
    }

    /** AD-보고서-2 승인 — 확인 일자·확인 관리자명이 기록된다. */
    @Transactional
    public AdminReportResponse.Item approve(UUID consultationId, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Consultation consultation = findInCenter(consultationId, center);
        requireSubmitted(consultation);

        String reviewerName = resolveReviewerName(principal);
        consultation.approveReport(principal.getAuthUserId(), reviewerName);
        // 기존 확인(confirmed) 필드도 함께 채워 하위 호환을 유지한다
        if (!consultation.isConfirmed()) {
            consultation.confirm(reviewerName, null);
        }
        return AdminReportResponse.Item.from(consultation);
    }

    /** AD-보고서-3 반려 — 통번역가에게 사유가 전달된다. */
    @Transactional
    public AdminReportResponse.Item reject(UUID consultationId, AdminReportRequest.Reject req,
                                           UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Consultation consultation = findInCenter(consultationId, center);
        requireSubmitted(consultation);

        consultation.rejectReport(principal.getAuthUserId(), resolveReviewerName(principal), req.reason().trim());
        return AdminReportResponse.Item.from(consultation);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private void requireSubmitted(Consultation consultation) {
        if (consultation.getReportStatus() == ReportStatus.DRAFT) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "아직 제출되지 않은 보고서입니다");
        }
    }

    private String resolveReviewerName(UserPrincipal principal) {
        AdminProfile profile = adminService.getOrCreateProfile(principal.getAuthUserId());
        return profile.getNickname() != null ? profile.getNickname() : "센터 관리자";
    }

    private Consultation findInCenter(UUID consultationId, Center center) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.CONSULTATION_NOT_FOUND));
        boolean byInterpreter = consultation.getInterpreter() != null
                && consultation.getInterpreter().getCenter() != null
                && consultation.getInterpreter().getCenter().getId().equals(center.getId());
        boolean byPatient = consultation.getPatient().getPatientCenters().stream()
                .anyMatch(pc -> pc.getCenter().getId().equals(center.getId()));
        if (!byInterpreter && !byPatient) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "다른 센터의 보고서입니다");
        }
        return consultation;
    }

    private Pageable withDefaultSort(Pageable pageable) {
        if (pageable.getSort().isSorted()) return pageable;
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "consultationDate"));
    }
}
