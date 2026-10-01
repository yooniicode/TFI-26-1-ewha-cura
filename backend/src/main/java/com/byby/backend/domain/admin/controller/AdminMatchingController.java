package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.enums.MatchingDisplayStatus;
import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminMatchingRequest;
import com.byby.backend.domain.admin.dto.AdminMatchingResponse;
import com.byby.backend.domain.admin.service.AdminMatchingService;
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
@RequestMapping("/api/v1/admin/matching")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Matching", description = "AD-06 매칭 관리 API (센터장)")
public class AdminMatchingController {

    private final AdminMatchingService adminMatchingService;

    @GetMapping("/requests")
    @Operation(summary = "AD-06-1 요청 목록",
            description = """
                    이주민 통번역 요청을 요청 순서대로(최신순) 조회합니다.
                    - status: 화면 상태 (여러 개 가능, 미지정 시 거절·취소 제외 전체)
                    - language: 요청 언어 코드 (여러 개 가능, 예: mn, vi)
                    - query: 환자 또는 통번역가 이름
                    """)
    public ResponseEntity<Response<List<AdminMatchingResponse.RequestItem>>> getRequests(
            @RequestParam(required = false) List<MatchingDisplayStatus> status,
            @RequestParam(required = false) List<String> language,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 9) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.getRequests(status, language, query, from, to, pageable, principal)));
    }

    @GetMapping("/candidates")
    @Operation(summary = "AD-06-2 배정 후보 통번역가 조회",
            description = "요청의 언어를 기준으로 후보를 정렬합니다. consultationId 또는 language 중 하나를 지정하세요.")
    public ResponseEntity<Response<List<AdminMatchingResponse.InterpreterCandidate>>> getCandidates(
            @RequestParam(required = false) UUID consultationId,
            @RequestParam(required = false) String language,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.getCandidates(consultationId, language, principal)));
    }

    @PostMapping("/requests/{consultationId}/assign")
    @Operation(summary = "AD-06-2 통번역가 배정")
    public ResponseEntity<Response<AdminMatchingResponse.RequestItem>> assign(
            @PathVariable UUID consultationId,
            @Valid @RequestBody AdminMatchingRequest.Assign req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.assign(consultationId, req, principal)));
    }

    @PatchMapping("/requests/{consultationId}/reassign")
    @Operation(summary = "AD-06-2 배정 통번역가 교체")
    public ResponseEntity<Response<AdminMatchingResponse.RequestItem>> reassign(
            @PathVariable UUID consultationId,
            @Valid @RequestBody AdminMatchingRequest.Assign req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.reassign(consultationId, req, principal)));
    }

    @PatchMapping("/requests/{consultationId}/reject")
    @Operation(summary = "AD-06-3 요청 거절")
    public ResponseEntity<Response<AdminMatchingResponse.RequestItem>> reject(
            @PathVariable UUID consultationId,
            @Valid @RequestBody AdminMatchingRequest.Reject req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.reject(consultationId, req, principal)));
    }

    @DeleteMapping("/requests/{consultationId}/assign")
    @Operation(summary = "AD-06-3 배정 취소", description = "요청을 다시 미배정 상태로 되돌립니다.")
    public ResponseEntity<Response<AdminMatchingResponse.RequestItem>> unassign(
            @PathVariable UUID consultationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.unassign(consultationId, principal)));
    }

    @GetMapping("/summary")
    @Operation(summary = "AD-06-3 매칭 현황 요약 (확정·대기·거절)")
    public ResponseEntity<Response<AdminMatchingResponse.StatusSummary>> getSummary(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.getStatusSummary(principal)));
    }

    @GetMapping("/calendar")
    @Operation(summary = "AD-06-4 일정 캘린더", description = "기간 미지정 시 이번 달을 반환합니다.")
    public ResponseEntity<Response<List<AdminMatchingResponse.CalendarDay>>> getCalendar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminMatchingService.getCalendar(from, to, principal)));
    }
}
