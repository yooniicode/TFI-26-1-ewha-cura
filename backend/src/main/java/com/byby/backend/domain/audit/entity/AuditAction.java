package com.byby.backend.domain.audit.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 접속기록의 "수행업무" 구분 */
@Getter
@RequiredArgsConstructor
public enum AuditAction {
    VIEW("조회"),
    CREATE("생성"),
    UPDATE("수정"),
    DELETE("삭제"),
    EXPORT("내보내기"),
    /** 국외 이전을 포함한 제3자 제공 */
    THIRD_PARTY_TRANSFER("제3자 제공"),
    LOGIN("로그인"),
    LOGOUT("로그아웃");

    private final String label;
}
