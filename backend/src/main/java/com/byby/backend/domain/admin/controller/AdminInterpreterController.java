package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminInterpreterRequest;
import com.byby.backend.domain.admin.dto.AdminInterpreterResponse;
import com.byby.backend.domain.admin.service.AdminInterpreterService;
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
@RequestMapping("/api/v1/admin/interpreters")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Interpreters", description = "AD-05 통번역가 관리 API (센터장)")
public class AdminInterpreterController {

    private final AdminInterpreterService adminInterpreterService;

    @GetMapping
    @Operation(summary = "AD-05-1 통번역가 목록·검색",
            description = """
                    `active` 미지정 시 비활성 통번역가까지 모두 조회합니다.
                    - language : 언어 코드 (여러 개 가능, 예: mn, vi) — 한국어 이름으로 저장된 언어도 함께 찾습니다
                    - gender : MALE / FEMALE / OTHER (여러 개 가능)
                    """)
    public ResponseEntity<Response<List<AdminInterpreterResponse.Item>>> getInterpreters(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) List<String> language,
            @RequestParam(required = false) List<Gender> gender,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.getInterpreters(query, language, gender, active, pageable, principal)));
    }

    @GetMapping("/{interpreterId}/consultations")
    @Operation(summary = "AD-05-4 통번역 이력", description = "배정 확정된 진료를 최신순으로 반환합니다.")
    public ResponseEntity<Response<List<AdminInterpreterResponse.ConsultationHistoryItem>>> getConsultations(
            @PathVariable UUID interpreterId,
            @PageableDefault(size = 50) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.getConsultations(interpreterId, pageable, principal)));
    }

    @GetMapping("/{interpreterId}")
    @Operation(summary = "AD-05-2/3 프로필 · 활동정보 조회")
    public ResponseEntity<Response<AdminInterpreterResponse.Detail>> getDetail(
            @PathVariable UUID interpreterId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.getDetail(interpreterId, principal)));
    }

    @PutMapping("/{interpreterId}")
    @Operation(summary = "AD-05-2/3 프로필 · 활동정보 수정")
    public ResponseEntity<Response<AdminInterpreterResponse.Detail>> updateProfile(
            @PathVariable UUID interpreterId,
            @Valid @RequestBody AdminInterpreterRequest.UpdateProfile req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.updateProfile(interpreterId, req, principal)));
    }

    @GetMapping("/{interpreterId}/activity")
    @Operation(summary = "AD-05-4 월별 통번역 시간", description = "`months` 미지정 시 최근 6개월 (최대 24)")
    public ResponseEntity<Response<List<AdminInterpreterResponse.MonthlyActivity>>> getActivity(
            @PathVariable UUID interpreterId,
            @RequestParam(required = false) Integer months,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.getMonthlyActivity(interpreterId, months, principal)));
    }

    @GetMapping("/{interpreterId}/patients")
    @Operation(summary = "AD-05-4 담당 환자 이력 (해제분 포함)")
    public ResponseEntity<Response<List<AdminInterpreterResponse.AssignedPatient>>> getAssignedPatients(
            @PathVariable UUID interpreterId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.getAssignedPatients(interpreterId, principal)));
    }

    @GetMapping("/{interpreterId}/status")
    @Operation(summary = "AD-05-5 활동 가능 여부 · 이번 달 배정 현황")
    public ResponseEntity<Response<AdminInterpreterResponse.StatusView>> getStatus(
            @PathVariable UUID interpreterId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.getStatus(interpreterId, principal)));
    }

    @PatchMapping("/{interpreterId}/status")
    @Operation(summary = "AD-05-5 활동 가능 여부 변경")
    public ResponseEntity<Response<AdminInterpreterResponse.StatusView>> updateStatus(
            @PathVariable UUID interpreterId,
            @Valid @RequestBody AdminInterpreterRequest.UpdateStatus req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminInterpreterService.updateStatus(interpreterId, req, principal)));
    }
}
