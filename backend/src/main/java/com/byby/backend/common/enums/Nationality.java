package com.byby.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Nationality {
    KOREA("한국", "ko"),
    UNITED_STATES("미국", "en"),
    VIETNAM("베트남", "vi"),
    CHINA("중국", "zh"),
    CAMBODIA("캄보디아", "km"),
    MYANMAR("미얀마", "my"),
    PHILIPPINES("필리핀", "fil"),
    INDONESIA("인도네시아", "id"),
    THAILAND("태국", "th"),
    NEPAL("네팔", "ne"),
    MONGOLIA("몽골", "mn"),
    UZBEKISTAN("우즈베키스탄", "uz"),
    SRI_LANKA("스리랑카", "si"),
    BANGLADESH("방글라데시", "bn"),
    PAKISTAN("파키스탄", "ur"),
    OTHER("기타", "en");

    private final String label;
    private final String languageCode;
}
