package com.byby.backend.common.enums;

/** 진료기록 한국어 번역의 진행 상태. 번역은 요청과 다른 시점에 백그라운드에서 끝난다. */
public enum TranslationStatus {
    /** 번역 대상이 아니거나(한국어 환자) 아직 요청된 적 없음 */
    NONE,
    /** 번역 작업이 큐에 들어갔고 아직 끝나지 않음 */
    PENDING,
    /** translated* 필드에 번역본이 들어 있음 */
    DONE,
    /** 번역 실패 — 원문만 표시한다. 다음 저장 때 다시 시도된다 */
    FAILED
}
