package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminCenterResponse;
import com.byby.backend.domain.admin.service.AdminCenterService;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/center")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Center", description = "AD-02/AD-03/AD-설정 센터 데이터 API (센터장)")
public class AdminCenterController {

    private final AdminCenterService adminCenterService;

    @GetMapping
    @Operation(summary = "AD-설정 내 센터 기본정보 조회 (센터명 · 담당자 · 연락처)")
    public ResponseEntity<Response<AdminCenterResponse.Profile>> getCenter(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminCenterService.getCenter(principal)));
    }

    @PutMapping
    @Operation(summary = "AD-설정 내 센터 기본정보 수정")
    public ResponseEntity<Response<CenterResponse.Summary>> updateCenter(
            @Valid @RequestBody CenterRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminCenterService.updateCenter(req, principal)));
    }

    @GetMapping("/sheet")
    @Operation(summary = "AD-03 구글 시트 연동 정보 조회",
            description = "센터에 연결된 스프레드시트 ID와 URL을 반환합니다. 연결 전이면 spreadsheetId 가 null 입니다.")
    public ResponseEntity<Response<AdminCenterResponse.SheetLink>> getSheet(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, adminCenterService.getSheetLink(principal)));
    }

    @PostMapping("/sheet/export")
    @Operation(summary = "AD-03 센터 전체 보고서를 구글 시트로 내보내기",
            description = """
                    센터에 연결된 시트가 없으면 새로 생성하고 ID를 저장합니다.

                    구글(제3자)로 나가는 데이터이므로 **기본적으로 실명·생년월일·사업장을 마스킹**합니다.
                    원본이 필요하면 `unmasked=true` 를 명시하세요 — 접속기록에 제3자 제공으로 남습니다.
                    """)
    public ResponseEntity<Response<AdminCenterResponse.SheetLink>> exportSheet(
            @RequestParam(defaultValue = "false") boolean unmasked,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminCenterService.exportToSheet(unmasked, principal)));
    }
}
