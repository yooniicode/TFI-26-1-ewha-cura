package com.byby.backend.domain.admin.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminDashboardResponse;
import com.byby.backend.domain.admin.service.AdminDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Dashboard", description = "AD-홈 어드민 현황판 API (센터장)")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    @Operation(summary = "AD-홈 어드민 현황판",
            description = """
                    한 번의 호출로 현황판 전체를 반환합니다.
                    - AD-홈-1 오늘 현황: 신규 요청 / 미배정 / 오늘 진행 중
                    - AD-홈-2 승인 대기: 보고서 승인 대기 · 반려
                    - AD-홈-3 이달 통계: 완료 건수 · 활동 통번역가 수 · 이주민 수
                    - AD-홈-4 알림: 반려 보고서(수정 요청) · 미제출 보고서(미응답 통번역가)
                    """)
    public ResponseEntity<Response<AdminDashboardResponse.Overview>> getOverview(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                adminDashboardService.getOverview(principal)));
    }
}
