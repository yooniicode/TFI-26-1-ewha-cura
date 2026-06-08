package com.byby.backend.domain.consultation.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.common.service.GoogleSheetsExportService;
import com.byby.backend.domain.consultation.dto.ConsultationRequest;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.consultation.service.ConsultationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/consultations")
@RequiredArgsConstructor
@Tag(name = "Consultations", description = "상담/통역 보고서 API")
public class ConsultationController {

    private final ConsultationService consultationService;
    private final GoogleSheetsExportService googleSheetsExportService;

    @PostMapping("/request")
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "이주민 통번역 의뢰 제출")
    public ResponseEntity<Response<ConsultationResponse.Detail>> createRequest(
            @Valid @RequestBody ConsultationRequest.Create req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, consultationService.createByPatient(req, principal)));
    }

    @PostMapping
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "상담/통역 보고서 생성")
    public ResponseEntity<Response<ConsultationResponse.Detail>> create(
            @Valid @RequestBody ConsultationRequest.Create req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, consultationService.create(req, principal)));
    }

    @GetMapping
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "상담/통역 보고서 목록 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Summary>>> getAll(
            @RequestParam(required = false) String patientQuery,
            @PageableDefault(size = 20, sort = "consultationDate", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getAll(pageable, principal, patientQuery)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "상담/통역 보고서 상세 조회")
    public ResponseEntity<Response<Object>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getById(id, principal)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "상담/통역 보고서 수정")
    public ResponseEntity<Response<ConsultationResponse.Detail>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ConsultationRequest.Update req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.update(id, req, principal)));
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "상담/통역 보고서 확인 처리")
    public ResponseEntity<Response<ConsultationResponse.Detail>> confirm(
            @PathVariable UUID id,
            @Valid @RequestBody ConsultationRequest.Confirm req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.confirm(id, req, principal)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "환자별 상담/통역 보고서 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Summary>>> getByPatient(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getByPatient(patientId, pageable, principal)));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('interpreter', 'admin')")
    @Operation(summary = "상담/통역 보고서 구글 시트로 내보내기",
            description = "내 상담 보고서 전체를 Google Sheets 에 작성하고 URL 을 반환합니다. (최대 5,000건)")
    public ResponseEntity<Response<String>> exportToSheets(@AuthenticationPrincipal UserPrincipal principal) {
        ConsultationService.ExportData exportData = consultationService.getExportData(principal);
        String url = googleSheetsExportService.createSheet(
                "상담보고서", exportData.centerId(), exportData.centerName(), exportData.rows());
        return ResponseEntity.ok(Response.success(SuccessCode.OK, url));
    }

    @GetMapping("/interpreter/{interpreterId}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "통번역가별 상담/통역 보고서 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Summary>>> getByInterpreter(
            @PathVariable UUID interpreterId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getByInterpreter(interpreterId, pageable, principal)));
    }
}
