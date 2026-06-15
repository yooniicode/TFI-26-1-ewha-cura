package com.byby.backend.domain.center.controller;

import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import com.byby.backend.domain.center.service.CenterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/centers")
@RequiredArgsConstructor
@Tag(name = "Centers", description = "센터 API")
public class CenterController {

    private final CenterService centerService;

    @Value("${CENTER_DEV_SECRET:${byby.center.dev-secret:}}")
    private String centerDevSecret;

    // ─── 공개 조회 ────────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "센터 목록 조회 (공개)")
    public ResponseEntity<Response<List<CenterResponse.Summary>>> list(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 100) Pageable pageable) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, centerService.list(query, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "센터 상세 조회 (공개)")
    public ResponseEntity<Response<CenterResponse.Summary>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                CenterResponse.Summary.from(centerService.find(id))));
    }

    // ─── 개발자 전용 — devSecret 을 body 에 포함해야 함 ──────────────────────────

    @PostMapping("/dev")
    @Operation(
        summary = "센터 등록 [개발자 전용]",
        description = """
            **Swagger에서 센터를 직접 등록할 때 사용합니다.**

            - `devSecret` 필드에 환경변수 `CENTER_DEV_SECRET` 값을 입력해야 합니다.
            - 미설정 시(`CENTER_DEV_SECRET` 가 비어있으면) 이 API는 항상 403을 반환합니다.
            - 이름이 기존 센터와 유사하면(88% 이상 일치) 자동으로 기존 센터가 업서트됩니다.
            """
    )
    public ResponseEntity<Response<CenterResponse.Summary>> devCreate(
            @Valid @RequestBody CenterRequest.DevUpsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        validateDevSecret(req.devSecret());
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, centerService.create(req.toUpsert(), principal)));
    }

    @PutMapping("/dev/{id}")
    @Operation(
        summary = "센터 정보 수정 [개발자 전용]",
        description = """
            **Swagger에서 센터 정보를 직접 수정할 때 사용합니다.**

            - `devSecret` 필드에 환경변수 `CENTER_DEV_SECRET` 값을 입력해야 합니다.
            - 미설정 시(`CENTER_DEV_SECRET` 가 비어있으면) 이 API는 항상 403을 반환합니다.
            - `spreadsheetId` 를 설정하면 내보내기 시 새 시트 생성 대신 해당 시트에 탭을 추가합니다.
            """
    )
    public ResponseEntity<Response<CenterResponse.Summary>> devUpdate(
            @PathVariable UUID id,
            @Valid @RequestBody CenterRequest.DevUpsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        validateDevSecret(req.devSecret());
        CenterResponse.Summary result = centerService.update(id, req.toUpsert(), principal);
        if (org.springframework.util.StringUtils.hasText(req.spreadsheetId())) {
            centerService.updateSpreadsheetId(id, req.spreadsheetId());
        }
        return ResponseEntity.ok(Response.success(SuccessCode.OK, result));
    }

    // ─── 기존 admin JWT 전용 엔드포인트 ──────────────────────────────────────────

    @PostMapping
    @Operation(
        summary = "센터 생성 (admin JWT 전용)",
        description = "센터 담당자 역할의 JWT Bearer 토큰이 필요합니다."
    )
    public ResponseEntity<Response<CenterResponse.Summary>> create(
            @Valid @RequestBody CenterRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAdminJwt(principal);
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, centerService.create(req, principal)));
    }

    @PutMapping("/{id}")
    @Operation(
        summary = "센터 정보 수정 (admin JWT 전용)",
        description = "센터 담당자 역할의 JWT Bearer 토큰이 필요합니다."
    )
    public ResponseEntity<Response<CenterResponse.Summary>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CenterRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAdminJwt(principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK, centerService.update(id, req, principal)));
    }

    // ─── 헬퍼 ────────────────────────────────────────────────────────────────────

    private void validateDevSecret(String provided) {
        if (!StringUtils.hasText(centerDevSecret)) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN,
                    "CENTER_DEV_SECRET 환경변수가 설정되지 않았습니다.");
        }
        if (!centerDevSecret.equals(provided)) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN,
                    "devSecret이 올바르지 않습니다.");
        }
    }

    private void requireAdminJwt(UserPrincipal principal) {
        if (principal == null || !principal.isAdmin()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN,
                    "센터 담당자(admin) JWT가 필요합니다.");
        }
    }
}
