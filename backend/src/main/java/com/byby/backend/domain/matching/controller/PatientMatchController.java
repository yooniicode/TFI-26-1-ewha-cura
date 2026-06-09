package com.byby.backend.domain.matching.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.matching.dto.MatchResponse;
import com.byby.backend.domain.matching.service.PatientMatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matching")
@RequiredArgsConstructor
@Tag(name = "Matching", description = "이주민-통번역가 매칭 API")
public class PatientMatchController {

    private final PatientMatchService patientMatchService;

    /*
     * Admin matching management endpoints disabled.
     *
    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "매칭 생성/재배정")
    public ResponseEntity<Response<MatchResponse.Detail>> create(
            @Valid @RequestBody MatchRequest.Create req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, patientMatchService.create(req, principal)));
    }

    @GetMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "활성 매칭 목록 조회")
    public ResponseEntity<Response<List<MatchResponse.Detail>>> getAll(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientMatchService.getAll(pageable, principal)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "환자별 활성 매칭 조회")
    public ResponseEntity<Response<MatchResponse.Detail>> getByPatient(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientMatchService.getByPatient(patientId, principal)));
    }
    */

    @GetMapping("/me")
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "내 담당 통번역가 목록 조회 (환자)")
    public ResponseEntity<Response<List<MatchResponse.Detail>>> getMyMatch(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientMatchService.getMyMatch(principal)));
    }

    @GetMapping("/my-count")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "담당 이주민 수 조회 (통번역가)")
    public ResponseEntity<Response<MatchResponse.AssignedCount>> getMyAssignedCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientMatchService.getMyAssignedCount(principal)));
    }

    @PostMapping("/self/{patientId}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "센터 내 이주민을 내 담당으로 등록")
    public ResponseEntity<Response<MatchResponse.Detail>> selfAssign(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, patientMatchService.selfAssign(patientId, principal)));
    }

    @DeleteMapping("/self/{patientId}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "내 담당 해제")
    public ResponseEntity<Response<Void>> selfUnassign(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        patientMatchService.selfUnassign(patientId, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }

    /*
     * Admin matching deactivation endpoint disabled.
     *
    @DeleteMapping("/{matchId}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "매칭 비활성화")
    public ResponseEntity<Response<Void>> deactivate(
            @PathVariable UUID matchId,
            @AuthenticationPrincipal UserPrincipal principal) {
        patientMatchService.deactivate(matchId, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }
    */
}
