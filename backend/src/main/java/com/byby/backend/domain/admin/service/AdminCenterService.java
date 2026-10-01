package com.byby.backend.domain.admin.service;

import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminCenterResponse;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.service.CenterService;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.consultation.service.ConsultationService;
import com.byby.backend.domain.audit.service.AuditService;
import com.byby.backend.domain.consultation.service.GoogleSheetsExportService;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** AD-02 센터 목록 · AD-03 시트 데이터 · AD-설정 센터 기본정보 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCenterService {

    private final AdminService adminService;
    private final CenterService centerService;
    private final ConsultationService consultationService;
    private final GoogleSheetsExportService googleSheetsExportService;
    private final AuditService auditService;
    private final PatientCenterRepository patientCenterRepository;
    private final InterpreterRepository interpreterRepository;

    public AdminCenterResponse.Profile getCenter(UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        return AdminCenterResponse.Profile.from(
                center,
                adminService.getOrCreateProfile(principal.getAuthUserId()).getNickname(),
                patientCenterRepository.countByCenterId(center.getId()),
                interpreterRepository.countByCenter_Id(center.getId()));
    }

    @Transactional
    public CenterResponse.Summary updateCenter(CenterRequest.Upsert req, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        return centerService.update(center.getId(), req, principal);
    }

    public AdminCenterResponse.SheetLink getSheetLink(UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        return AdminCenterResponse.SheetLink.of(center.getId(), center.getSpreadsheetId());
    }

    /**
     * AD-03 센터 전체 보고서를 구글 시트로 내보낸다. 연결된 시트가 없으면 새로 만들고 ID를 저장한다.
     *
     * <p>구글(제3자)로 개인정보가 이전되므로 기본은 마스킹이며, 원본 내보내기(unmasked)는
     * 접속기록에 제3자 제공으로 남는다.
     */
    public AdminCenterResponse.SheetLink exportToSheet(boolean unmasked, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        UUID centerId = center.getId();
        String existingSpreadsheetId = center.getSpreadsheetId();
        List<ConsultationResponse.Detail> rows = consultationService.getDetailsByCenter(centerId);

        // 트랜잭션 밖에서 호출한다 — 구글 API 응답을 기다리는 동안 DB 커넥션을 붙잡지 않기 위함
        GoogleSheetsExportService.ExportResult result = googleSheetsExportService.createSheet(
                "상담보고서", center.getName(), existingSpreadsheetId, rows, !unmasked);

        if (existingSpreadsheetId == null) {
            centerService.updateSpreadsheetId(centerId, result.spreadsheetId());
        }

        auditService.recordThirdPartyTransfer(
                principal.getAuthUserId(), principal.getRole(), "Google Sheets",
                "CONSULTATION_EXPORT", center.getId(), null,
                "건수=" + rows.size()
                        + " / 개인정보=" + (unmasked ? "원본(비마스킹)" : "마스킹")
                        + " / spreadsheetId=" + result.spreadsheetId());

        return AdminCenterResponse.SheetLink.of(center.getId(), result.spreadsheetId());
    }
}
