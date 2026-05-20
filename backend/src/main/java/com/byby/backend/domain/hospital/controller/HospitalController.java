package com.byby.backend.domain.hospital.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.domain.hospital.dto.HospitalRequest;
import com.byby.backend.domain.hospital.dto.HospitalResponse;
import com.byby.backend.domain.hospital.service.HospitalService;
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
    public ResponseEntity<Response<List<HospitalResponse.Summary>>> search(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, hospitalService.search(name, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Response<HospitalResponse.Summary>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, hospitalService.getById(id)));
    }
}
