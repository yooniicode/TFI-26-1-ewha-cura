package com.byby.backend.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;

/** AD-보고서 관리 요청 DTO */
public class AdminReportRequest {

    /** AD-보고서-3 반려 — 통번역가에게 사유가 전달된다. */
    public record Reject(
            @NotBlank String reason
    ) {}
}
