package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminRequest;
import com.byby.backend.domain.admin.dto.AdminResponse;
import com.byby.backend.domain.admin.service.AdminService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "센터 관리자 API")
public class AdminController {

    private final AdminService adminService;

    /*
     * Admin-only profile/stat/work-log endpoints disabled.
     *
    @GetMapping("/stats")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "센터 통계 조회 (이주민·동번역가·활성 매칭 수)")
    public ResponseEntity<Response<AdminResponse.CenterStats>> getStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminService.getStats(principal)));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "내 센터 관리자 프로필 조회")
    public ResponseEntity<Response<AdminResponse.Profile>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminService.getProfile(principal)));
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "내 센터 관리자 프로필 수정")
    public ResponseEntity<Response<AdminResponse.Profile>> updateProfile(
            @Valid @RequestBody AdminRequest.UpdateProfile req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminService.updateProfile(req, principal)));
    }

    @GetMapping("/work-logs")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "내 센터장 근무일지 목록 조회")
    public ResponseEntity<Response<List<AdminResponse.WorkLog>>> getWorkLogs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminService.getWorkLogs(from, to, pageable, principal)));
    }

    @PostMapping("/work-logs")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "센터장 근무일지 작성")
    public ResponseEntity<Response<AdminResponse.WorkLog>> createWorkLog(
            @Valid @RequestBody AdminRequest.UpsertWorkLog req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, adminService.createWorkLog(req, principal)));
    }

    @PutMapping("/work-logs/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "센터장 근무일지 수정")
    public ResponseEntity<Response<AdminResponse.WorkLog>> updateWorkLog(
            @PathVariable UUID id,
            @Valid @RequestBody AdminRequest.UpsertWorkLog req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminService.updateWorkLog(id, req, principal)));
    }

    @DeleteMapping("/work-logs/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "센터장 근무일지 삭제")
    public ResponseEntity<Response<Void>> deleteWorkLog(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        adminService.deleteWorkLog(id, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }
    */

    @GetMapping("/patients/{patientId}/memos")
    @PreAuthorize("hasAnyRole('admin', 'interpreter')")
    @Operation(summary = "이주민 센터 메모 조회")
    public ResponseEntity<Response<List<AdminResponse.PatientMemo>>> getPatientMemos(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminService.getPatientMemos(patientId, pageable, principal)));
    }

    @PostMapping("/patients/{patientId}/memos")
    @PreAuthorize("hasAnyRole('admin', 'interpreter')")
    @Operation(summary = "이주민 센터 메모 작성")
    public ResponseEntity<Response<AdminResponse.PatientMemo>> createPatientMemo(
            @PathVariable UUID patientId,
            @Valid @RequestBody AdminRequest.UpsertPatientMemo req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED,
                        adminService.createPatientMemo(patientId, req, principal)));
    }

    @PutMapping("/patient-memos/{memoId}")
    @PreAuthorize("hasAnyRole('admin', 'interpreter')")
    @Operation(summary = "이주민 센터 메모 수정")
    public ResponseEntity<Response<AdminResponse.PatientMemo>> updatePatientMemo(
            @PathVariable UUID memoId,
            @Valid @RequestBody AdminRequest.UpsertPatientMemo req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminService.updatePatientMemo(memoId, req, principal)));
    }

    @DeleteMapping("/patient-memos/{memoId}")
    @PreAuthorize("hasAnyRole('admin', 'interpreter')")
    @Operation(summary = "이주민 센터 메모 삭제")
    public ResponseEntity<Response<Void>> deletePatientMemo(
            @PathVariable UUID memoId,
            @AuthenticationPrincipal UserPrincipal principal) {
        adminService.deletePatientMemo(memoId, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }
}
