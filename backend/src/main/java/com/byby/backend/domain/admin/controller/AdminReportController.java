package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.ReportStatus;
import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminReportRequest;
import com.byby.backend.domain.admin.dto.AdminReportResponse;
import com.byby.backend.domain.admin.service.AdminReportService;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Reports", description = "AD-보고서 관리 API (센터장)")
public class AdminReportController {

    private final AdminReportService adminReportService;

    @GetMapping
    @Operation(summary = "AD-보고서 목록 조회",
            description = """
                    센터 전체 보고서를 조회합니다.
                    - `status` : PENDING(승인 대기) / APPROVED(승인 완료) / REJECTED(반려) / DRAFT(작성중), 여러 개 가능
                    - AD-보고서-4 필터: `nationality`, `hospitalId`, `hospitalName`, `interpreterId`, `from`, `to`, `patientQuery`
                    - `language` : 요청 언어 코드 (여러 개 가능, 예: mn, vi)
                    - `query` : 이주민 또는 통번역가 이름
                    - 정렬 미지정 시 작성일자(진료일) 최신순
                    """)
    public ResponseEntity<Response<List<AdminReportResponse.Item>>> getReports(
            @RequestParam(required = false) List<ReportStatus> status,
            @RequestParam(required = false) List<String> language,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Nationality nationality,
            @RequestParam(required = false) UUID hospitalId,
            @RequestParam(required = false) String hospitalName,
            @RequestParam(required = false) UUID interpreterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String patientQuery,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminReportService.getReports(status, language, query, nationality, hospitalId, hospitalName,
                        interpreterId, from, to, patientQuery, pageable, principal)));
    }

    @GetMapping("/summary")
    @Operation(summary = "보고서 상태별 건수 (승인 대기·승인 완료·반려)")
    public ResponseEntity<Response<AdminReportResponse.StatusSummary>> getSummary(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminReportService.getSummary(principal)));
    }

    @GetMapping("/{consultationId}")
    @Operation(summary = "보고서 상세 조회 (센터장 뷰)")
    public ResponseEntity<Response<ConsultationResponse.Detail>> getDetail(
            @PathVariable UUID consultationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminReportService.getDetail(consultationId, principal)));
    }

    @PatchMapping("/{consultationId}/approve")
    @Operation(summary = "AD-보고서-2 승인", description = "확인 일자와 확인 관리자명이 기록됩니다.")
    public ResponseEntity<Response<AdminReportResponse.Item>> approve(
            @PathVariable UUID consultationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminReportService.approve(consultationId, principal)));
    }

    @PatchMapping("/{consultationId}/reject")
    @Operation(summary = "AD-보고서-3 반려", description = "반려 사유가 통번역가에게 전달됩니다.")
    public ResponseEntity<Response<AdminReportResponse.Item>> reject(
            @PathVariable UUID consultationId,
            @Valid @RequestBody AdminReportRequest.Reject req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminReportService.reject(consultationId, req, principal)));
    }
}
