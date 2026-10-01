package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminPatientResponse;
import com.byby.backend.domain.admin.service.AdminPatientService;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.patient.dto.PatientRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/patients")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Patients", description = "AD-04 이주민 관리 API (센터장)")
public class AdminPatientController {

    private final AdminPatientService adminPatientService;

    @GetMapping
    @Operation(summary = "AD-04-1 이주민 목록·검색",
            description = """
                    이름·전화번호·거주지로 검색합니다.
                    - language : 요청 언어 코드 (여러 개 가능, 예: mn, vi)
                    - gender : MALE / FEMALE / OTHER (여러 개 가능)
                    """)
    public ResponseEntity<Response<List<AdminPatientResponse.Item>>> getPatients(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) List<String> language,
            @RequestParam(required = false) List<Gender> gender,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminPatientService.getPatients(query, language, gender, pageable, principal)));
    }

    @GetMapping("/{patientId}")
    @Operation(summary = "AD-04-2/3 기본정보 · 거주정보 조회")
    public ResponseEntity<Response<AdminPatientResponse.Detail>> getDetail(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminPatientService.getDetail(patientId, principal)));
    }

    @PutMapping("/{patientId}")
    @Operation(summary = "AD-04-2/3 이주민 정보 수정")
    public ResponseEntity<Response<AdminPatientResponse.Detail>> update(
            @PathVariable UUID patientId,
            @Valid @RequestBody PatientRequest.Update req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminPatientService.update(patientId, req, principal)));
    }

    @GetMapping("/{patientId}/usage")
    @Operation(summary = "AD-04-4 이용이력 요약")
    public ResponseEntity<Response<AdminPatientResponse.UsageSummary>> getUsage(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminPatientService.getUsageSummary(patientId, principal)));
    }

    @GetMapping("/{patientId}/consultations")
    @Operation(summary = "AD-04-4/6 통번역 서비스 이용 이력 · 케이스별 보고서 연결")
    public ResponseEntity<Response<List<ConsultationResponse.Detail>>> getConsultations(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminPatientService.getConsultations(patientId, pageable, principal)));
    }

    @GetMapping("/{patientId}/assignment-history")
    @Operation(summary = "AD-04-5 담당 통번역가 변경 이력")
    public ResponseEntity<Response<List<AdminPatientResponse.AssignmentHistoryItem>>> getAssignmentHistory(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminPatientService.getAssignmentHistory(patientId, principal)));
    }
}
