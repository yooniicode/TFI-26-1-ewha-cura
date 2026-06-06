package com.byby.backend.domain.hospital.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.domain.hospital.dto.HospitalRequest;
import com.byby.backend.domain.hospital.dto.HospitalResponse;
import com.byby.backend.domain.hospital.service.HospitalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hospitals")
@RequiredArgsConstructor
@Tag(name = "Hospitals", description = "병원 API")
public class HospitalController {

    private final HospitalService hospitalService;

    // IA 미포함: 병원 등록 화면 없음. GET(검색)만 보고서 작성 시 사용
    // @PostMapping
    // @PreAuthorize("hasAnyRole('interpreter', 'admin')")
    // public ResponseEntity<Response<HospitalResponse.Summary>> create(
    //         @Valid @RequestBody HospitalRequest.Create req) {
    //     return ResponseEntity.status(201)
    //             .body(Response.success(SuccessCode.CREATED, hospitalService.create(req)));
    // }

    @GetMapping
    @Operation(summary = "병원 검색", description = "이름으로 병원을 검색합니다. name 파라미터 미입력 시 전체 목록을 반환합니다.")
    public ResponseEntity<Response<List<HospitalResponse.Summary>>> search(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, hospitalService.search(name, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "병원 상세 조회")
    public ResponseEntity<Response<HospitalResponse.Summary>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, hospitalService.getById(id)));
    }
}
