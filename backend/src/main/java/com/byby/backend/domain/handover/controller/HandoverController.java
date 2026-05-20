package com.byby.backend.domain.handover.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.handover.dto.HandoverRequest;
import com.byby.backend.domain.handover.dto.HandoverResponse;
import com.byby.backend.domain.handover.service.HandoverService;
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
@RequestMapping("/api/v1/handovers")
@RequiredArgsConstructor
@Tag(name = "Handovers", description = "인수인계 API")
public class HandoverController {

    private final HandoverService handoverService;

    @PostMapping
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "인수인계 생성")
    public ResponseEntity<Response<HandoverResponse.Detail>> create(
            @Valid @RequestBody HandoverRequest.Create req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, handoverService.create(req, principal)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "환자별 인수인계 조회")
    public ResponseEntity<Response<List<HandoverResponse.Detail>>> getByPatient(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, handoverService.getByPatient(patientId, pageable, principal)));
    }

    // IA 미포함: admin이 인수인계 담당자를 직접 배정하는 flow 없음
    // @PatchMapping("/{id}/assign")
    // @PreAuthorize("hasRole('admin')")
    // @Operation(summary = "인수인계 담당 통번역가 배정")
    // public ResponseEntity<Response<HandoverResponse.Detail>> assign(
    //         @PathVariable UUID id,
    //         @Valid @RequestBody HandoverRequest.Assign req,
    //         @AuthenticationPrincipal UserPrincipal principal) {
    //     return ResponseEntity.ok(
    //             Response.success(SuccessCode.OK, handoverService.assign(id, req, principal)));
    // }
}
