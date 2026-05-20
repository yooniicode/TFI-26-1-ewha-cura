package com.byby.backend.domain.center.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import com.byby.backend.domain.center.service.CenterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/centers")
@RequiredArgsConstructor
@Tag(name = "Centers", description = "센터 API")
public class CenterController {

    private final CenterService centerService;

    @GetMapping
    @Operation(summary = "센터 목록 조회")
    public ResponseEntity<Response<List<CenterResponse.Summary>>> list(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 100) Pageable pageable) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, centerService.list(query, pageable)));
    }

    /*
     * Admin center create/update endpoints disabled.
     *
    @PostMapping
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "센터 생성")
    public ResponseEntity<Response<CenterResponse.Summary>> create(
            @Valid @RequestBody CenterRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, centerService.create(req, principal)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "센터 수정")
    public ResponseEntity<Response<CenterResponse.Summary>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CenterRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, centerService.update(id, req, principal)));
    }
    */
}
