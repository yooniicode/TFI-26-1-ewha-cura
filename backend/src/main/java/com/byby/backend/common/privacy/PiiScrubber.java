package com.byby.backend.common.privacy;

import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 외부(번역 API 등)로 텍스트를 보내기 전에 식별정보를 치환한다.
 *
 * <p>진료 자유입력란에는 "응우옌 씨가 010-1234-5678로 연락" 같은 식별정보가 섞여 들어올 수 있다.
 * 번역 품질에 영향을 주지 않으면서 개인을 특정할 수 없게 만드는 것이 목적이다.
 */
public final class PiiScrubber {

    /** 주민등록번호·외국인등록번호 (고유식별정보) */
    private static final Pattern RESIDENT_NUMBER =
            Pattern.compile("\\b\\d{6}\\s*-?\\s*[1-8]\\d{6}\\b");

    /** 국내 휴대전화·유선번호 */
    private static final Pattern PHONE_NUMBER =
            Pattern.compile("\\b0\\d{1,2}[-.\\s]?\\d{3,4}[-.\\s]?\\d{4}\\b");

    private static final Pattern EMAIL =
            Pattern.compile("\\b[\\w.+-]+@[\\w-]+\\.[\\w.-]+\\b");

    /** 여권번호 (영문 1~2자 + 숫자 7~8자) */
    private static final Pattern PASSPORT =
            Pattern.compile("\\b[A-Z]{1,2}\\d{7,8}\\b");

    private PiiScrubber() {}

    /**
     * @param text      원문
     * @param namesToMask 문서에 등장할 수 있는 실명 (환자·통번역가·의사 등). null·공백은 무시된다.
     */
    public static String scrub(String text, String... namesToMask) {
        if (!StringUtils.hasText(text)) return text;

        String result = text;
        // 패턴 기반 — 번호류를 먼저 지운다
        result = RESIDENT_NUMBER.matcher(result).replaceAll("[등록번호]");
        result = PASSPORT.matcher(result).replaceAll("[여권번호]");
        result = PHONE_NUMBER.matcher(result).replaceAll("[연락처]");
        result = EMAIL.matcher(result).replaceAll("[이메일]");

        // 실명 — 긴 이름부터 치환해야 부분 일치로 잘리지 않는다
        for (String name : sortedByLengthDesc(namesToMask)) {
            result = result.replace(name, "[이름]");
        }
        return result;
    }

    private static List<String> sortedByLengthDesc(String... names) {
        List<String> valid = new ArrayList<>();
        if (names != null) {
            for (String name : names) {
                // 1글자 이름은 일반 명사를 잘못 지울 위험이 커서 제외한다
                if (StringUtils.hasText(name) && name.trim().length() >= 2) valid.add(name.trim());
            }
        }
        valid.sort((a, b) -> Integer.compare(b.length(), a.length()));
        return valid;
    }
}
