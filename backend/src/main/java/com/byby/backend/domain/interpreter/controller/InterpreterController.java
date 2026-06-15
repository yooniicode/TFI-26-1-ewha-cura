package com.byby.backend.domain.interpreter.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.interpreter.dto.InterpreterRequest;
import com.byby.backend.domain.interpreter.dto.InterpreterResponse;
import com.byby.backend.domain.interpreter.service.InterpreterService;
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
@RequestMapping("/api/v1/interpreters")
@RequiredArgsConstructor
@Tag(name = "Interpreters", description = "통번역가(Interpreter) API")
public class InterpreterController {

    private final InterpreterService interpreterService;

    @PostMapping
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "통번역가 생성")
    public ResponseEntity<Response<InterpreterResponse.Detail>> create(
            @Valid @RequestBody InterpreterRequest.Create req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, interpreterService.create(req, principal)));
    }

    @GetMapping
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "통번역가 목록 조회")
    public ResponseEntity<Response<List<InterpreterResponse.Summary>>> getAll(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String language,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, interpreterService.getAll(query, language, pageable, principal)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "통번역가 상세 조회")
    public ResponseEntity<Response<InterpreterResponse.Detail>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, interpreterService.getById(id, principal)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "통번역가 정보 수정 (본인 또는 ADMIN)")
    public ResponseEntity<Response<InterpreterResponse.Detail>> update(
            @PathVariable UUID id,
            @Valid @RequestBody InterpreterRequest.Update req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, interpreterService.update(id, req, principal)));
    }

    /*
     * Admin interpreter deactivation endpoint disabled.
     *
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "통번역가 비활성화")
    public ResponseEntity<Response<Void>> deactivate(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        interpreterService.deactivate(id, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }
    */
}
