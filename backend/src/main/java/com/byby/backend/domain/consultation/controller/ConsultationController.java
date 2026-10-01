package com.byby.backend.domain.consultation.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
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

    @GetMapping("/pending")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "센터 내 미배정 통번역 요청 목록")
    public ResponseEntity<Response<List<ConsultationResponse.PendingItem>>> getPending(
            @PageableDefault(size = 50) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getPending(pageable, principal).getContent()));
    }

    @PatchMapping("/{id}/accept")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "통번역 요청 수락 (담당 배정)")
    public ResponseEntity<Response<ConsultationResponse.Detail>> accept(
            @PathVariable UUID id,
            @RequestBody ConsultationRequest.Accept req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.accept(id, req, principal)));
    }

    @GetMapping("/assignments")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "센터장이 나에게 배정한 요청 (수락 대기)")
    public ResponseEntity<Response<List<ConsultationResponse.AssignmentItem>>> getAssignments(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, consultationService.getAssignments(principal)));
    }

    @PatchMapping("/{id}/assignment/accept")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "센터장이 배정한 요청 수락", description = "수락 대기 → 배정 확정")
    public ResponseEntity<Response<ConsultationResponse.Detail>> acceptAssignment(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.acceptAssignment(id, principal)));
    }

    @PatchMapping("/{id}/assignment/decline")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "센터장이 배정한 요청 거절", description = "배정이 해제되고 센터에 '재배정 필요'로 표시됩니다.")
    public ResponseEntity<Response<Void>> declineAssignment(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        consultationService.declineAssignment(id, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('interpreter', 'admin')")
    @Operation(summary = "상담/통역 보고서 목록 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Summary>>> getAll(
            @RequestParam(required = false) String patientQuery,
            @PageableDefault(size = 20, sort = "consultationDate", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getAll(pageable, principal, patientQuery)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient', 'admin')")
    @Operation(summary = "상담/통역 보고서 상세 조회")
    public ResponseEntity<Response<Object>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getById(id, principal)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('interpreter', 'admin')")
    @Operation(summary = "상담/통역 보고서 수정")
    public ResponseEntity<Response<ConsultationResponse.Detail>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ConsultationRequest.Update req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.update(id, req, principal)));
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "상담/통역 보고서 확인 처리 (센터장)",
            description = "승인 워크플로는 `/api/v1/admin/reports/{id}/approve` 를 사용하세요. 이 엔드포인트는 확인자 정보를 직접 기입할 때 사용합니다.")
    public ResponseEntity<Response<ConsultationResponse.Detail>> confirm(
            @PathVariable UUID id,
            @Valid @RequestBody ConsultationRequest.Confirm req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.confirm(id, req, principal)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient', 'admin')")
    @Operation(summary = "환자별 상담/통역 보고서 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Detail>>> getByPatient(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getByPatient(patientId, pageable, principal)));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('interpreter', 'admin')")
    @Operation(summary = "상담/통역 보고서 구글 시트로 내보내기",
            description = """
                    내 상담 보고서 전체를 Google Sheets 에 작성하고 URL 을 반환합니다. (최대 5,000건)

                    구글(제3자)로 나가는 데이터이므로 **기본적으로 실명·생년월일·사업장을 마스킹**합니다.
                    원본이 필요하면 `unmasked=true` 를 명시하세요 — 접속기록에 제3자 제공으로 남습니다.
                    """)
    public ResponseEntity<Response<String>> exportToSheets(
            @RequestParam(defaultValue = "false") boolean unmasked,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                consultationService.exportToSheets(unmasked, principal)));
    }

    @GetMapping("/interpreter/{interpreterId}")
    @PreAuthorize("hasAnyRole('interpreter', 'admin')")
    @Operation(summary = "통번역가별 상담/통역 보고서 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Summary>>> getByInterpreter(
            @PathVariable UUID interpreterId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getByInterpreter(interpreterId, pageable, principal)));
    }
}
