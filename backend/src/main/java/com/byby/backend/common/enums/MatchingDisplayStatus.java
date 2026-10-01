package com.byby.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * AD-06 매칭 관리 화면에 보이는 상태.
 * 배정 상태(MatchingStatus) · 재배정 필요 여부 · 보고서 상태를 조합해 결정한다.
 * 거절(REJECTED) · 취소(CANCELLED)된 요청은 매칭 관리 목록에 노출하지 않는다.
 */
@Getter
@RequiredArgsConstructor
public enum MatchingDisplayStatus {
    NEEDS_ASSIGNMENT("배정 필요"),
    NEEDS_REASSIGNMENT("재배정 필요"),
    AWAITING_ACCEPTANCE("수락 대기"),
    ASSIGNED("배정 완료"),
    COMPLETED("진료 완료");

    private final String label;

    public static MatchingDisplayStatus of(MatchingStatus status, boolean reassignmentRequired,
                                           ReportStatus reportStatus) {
        if (status == null) return null;
        return switch (status) {
            case PENDING -> reassignmentRequired ? NEEDS_REASSIGNMENT : NEEDS_ASSIGNMENT;
            case AWAITING_ACCEPTANCE -> AWAITING_ACCEPTANCE;
            // 보고서가 제출된 이후(승인 대기 · 승인 · 반려)는 진료가 끝난 것으로 본다
            case ASSIGNED -> reportStatus == null || reportStatus == ReportStatus.DRAFT ? ASSIGNED : COMPLETED;
            case REJECTED, CANCELLED -> null;
        };
    }
}
