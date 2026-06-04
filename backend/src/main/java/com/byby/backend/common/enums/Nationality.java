package com.byby.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Nationality {
    KOREA("한국"),
    UNITED_STATES("미국"),
    VIETNAM("베트남"),
    CHINA("중국"),
    CAMBODIA("캄보디아"),
    MYANMAR("미얀마"),
    PHILIPPINES("필리핀"),
    INDONESIA("인도네시아"),
    THAILAND("태국"),
    NEPAL("네팔"),
    MONGOLIA("몽골"),
    UZBEKISTAN("우즈베키스탄"),
    SRI_LANKA("스리랑카"),
    BANGLADESH("방글라데시"),
    PAKISTAN("파키스탄"),
    OTHER("기타");

    private final String label;
}
