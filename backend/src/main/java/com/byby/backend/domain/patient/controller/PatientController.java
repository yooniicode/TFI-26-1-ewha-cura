package com.byby.backend.domain.patient.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.consultation.service.ConsultationService;
import com.byby.backend.domain.patient.dto.PatientRequest;
import com.byby.backend.domain.patient.dto.PatientResponse;
import com.byby.backend.domain.patient.service.PatientService;
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
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Tag(name = "Patients", description = "이주민(Patient) API")
public class PatientController {

    private final PatientService patientService;
    private final ConsultationService consultationService;

    @PostMapping
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "이주민 생성")
    public ResponseEntity<Response<PatientResponse.Detail>> create(
            @Valid @RequestBody PatientRequest.Create req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, patientService.create(req, principal)));
    }

    @GetMapping
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "이주민 목록 조회")
    public ResponseEntity<Response<List<PatientResponse.Summary>>> getAll(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientService.getAll(query, pageable, principal)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "이주민 상세 조회")
    public ResponseEntity<Response<PatientResponse.Detail>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientService.getById(id, principal)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "이주민 정보 수정")
    public ResponseEntity<Response<PatientResponse.Detail>> update(
            @PathVariable UUID id,
            @Valid @RequestBody PatientRequest.Update req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientService.update(id, req, principal)));
    }

    @PostMapping("/me/centers/{centerId}")
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "내 센터 추가")
    public ResponseEntity<Response<PatientResponse.Detail>> addMyCenter(
            @PathVariable UUID centerId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientService.addMyCenter(centerId, principal)));
    }

    @PostMapping("/{id}/centers/{centerId}")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "이주민 센터 추가")
    public ResponseEntity<Response<PatientResponse.Detail>> addCenter(
            @PathVariable UUID id,
            @PathVariable UUID centerId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientService.addCenter(id, centerId, principal)));
    }

    @DeleteMapping("/{id}/centers/{centerId}")
    @PreAuthorize("hasRole('interpreter')")
    @Operation(summary = "이주민 센터 제거")
    public ResponseEntity<Response<PatientResponse.Detail>> removeCenter(
            @PathVariable UUID id,
            @PathVariable UUID centerId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, patientService.removeCenter(id, centerId, principal)));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "이주민 상담 이력 조회")
    public ResponseEntity<Response<List<ConsultationResponse.Detail>>> getHistory(
            @PathVariable UUID id,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, consultationService.getByPatient(id, pageable, principal)));
    }

    @GetMapping("/{id}/my-records")
    @PreAuthorize("hasAnyRole('interpreter', 'patient')")
    @Operation(summary = "이주민 본인용 기록 조회")
    public ResponseEntity<Response<List<ConsultationResponse.PatientView>>> getMyRecords(
            @PathVariable UUID id,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK,
                        consultationService.getPatientView(id, pageable, principal)));
    }
}
