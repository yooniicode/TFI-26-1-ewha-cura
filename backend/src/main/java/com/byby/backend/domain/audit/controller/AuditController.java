package com.byby.backend.domain.audit.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.audit.dto.AuditResponse;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.entity.AuditResult;
import com.byby.backend.domain.audit.service.AuditQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/access-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('admin')")
@Tag(name = "Admin - Access Logs", description = "개인정보 접속기록 점검 API (센터장)")
public class AuditController {

    private final AuditQueryService auditQueryService;

    @GetMapping
    @Operation(summary = "접속기록 조회",
            description = """
                    누가·언제·어디서·누구의 정보를·무슨 업무로 처리했는지 조회합니다.
                    기간 미지정 시 최근 30일. 필터: `authUserId`(취급자), `subjectPatientId`(정보주체),
                    `action`, `result`, `resourceType`.
                    """)
    public ResponseEntity<Response<List<AuditResponse.Entry>>> search(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID authUserId,
            @RequestParam(required = false) UUID subjectPatientId,
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) AuditResult result,
            @RequestParam(required = false) String resourceType,
            @PageableDefault(size = 50) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                auditQueryService.search(from, to, authUserId, subjectPatientId,
                        action, result, resourceType, pageable, principal)));
    }

    @GetMapping("/summary")
    @Operation(summary = "접속기록 점검 요약",
            description = "월 1회 이상 점검 의무 대응용. 기간 미지정 시 이번 달. "
                    + "차단(DENIED)·내보내기·제3자 제공 건수를 함께 반환합니다.")
    public ResponseEntity<Response<AuditResponse.InspectionSummary>> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                auditQueryService.summarize(from, to, principal)));
    }
}
