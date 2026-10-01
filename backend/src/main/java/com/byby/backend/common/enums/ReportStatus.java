package com.byby.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 활동 보고서 승인 상태 (AD-보고서) */
@Getter
@RequiredArgsConstructor
public enum ReportStatus {
    DRAFT("작성중"),
    PENDING("승인 대기"),
    APPROVED("승인 완료"),
    REJECTED("반려");

    private final String label;
}
