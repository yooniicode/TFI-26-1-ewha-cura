package com.byby.backend.common.privacy;

import org.springframework.util.StringUtils;

import java.time.LocalDate;

/**
 * 외부로 내보내는 표(구글 시트 등)에서 개인을 특정하기 어렵게 만드는 마스킹.
 * 통계·정산 목적에는 충분하면서 실명·생년월일 조합으로 개인이 특정되는 것을 막는다.
 */
public final class PiiMasker {

    private PiiMasker() {}

    /** 홍길동 → 홍*동, 김철 → 김*, 응우옌티엔 → 응***엔 */
    public static String maskName(String name) {
        if (!StringUtils.hasText(name)) return "";
        String trimmed = name.trim();
        if (trimmed.length() == 1) return trimmed;
        if (trimmed.length() == 2) return trimmed.charAt(0) + "*";
        return trimmed.charAt(0)
                + "*".repeat(trimmed.length() - 2)
                + trimmed.charAt(trimmed.length() - 1);
    }

    /** 1990-05-03 → 1990 (출생연도만 남긴다) */
    public static String maskBirthDate(LocalDate birthDate) {
        return birthDate == null ? "" : String.valueOf(birthDate.getYear());
    }

    /** 01012345678 → 010****5678 */
    public static String maskPhone(String phone) {
        if (!StringUtils.hasText(phone)) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.length() < 7) return "*".repeat(digits.length());
        return digits.substring(0, 3) + "****" + digits.substring(digits.length() - 4);
    }

    /** 자유입력 텍스트는 통째로 가린다 (사업장명 등 재식별 가능한 값). */
    public static String maskFreeText(String value) {
        return StringUtils.hasText(value) ? "***" : "";
    }
}
