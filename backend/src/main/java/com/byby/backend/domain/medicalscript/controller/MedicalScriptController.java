package com.byby.backend.domain.medicalscript.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.medicalscript.dto.ScriptRequest;
import com.byby.backend.domain.medicalscript.dto.ScriptResponse;
import com.byby.backend.domain.medicalscript.service.MedicalScriptService;
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
@RequestMapping("/api/v1/scripts")
@RequiredArgsConstructor
@Tag(name = "MedicalScripts", description = "의료 대본 API")
public class MedicalScriptController {

    private final MedicalScriptService scriptService;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('patient', 'interpreter')")
    @Operation(summary = "의료 대본 생성")
    public ResponseEntity<Response<ScriptResponse.Detail>> generate(
            @Valid @RequestBody ScriptRequest.Generate req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, scriptService.generate(req, principal)));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "환자별 의료 대본 조회")
    public ResponseEntity<Response<List<ScriptResponse.Summary>>> getByPatient(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, scriptService.getByPatient(patientId, pageable, principal)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "의료 대본 상세 조회")
    public ResponseEntity<Response<ScriptResponse.Detail>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, scriptService.getById(id, principal)));
    }
}
