package com.byby.backend.common.enums;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * 언어 코드(Nationality.languageCode) ↔ 한국어 언어명.
 * 통번역가 사용 언어는 화면에서 "베트남어" 같은 한국어 이름으로 저장되고,
 * 이주민 요청 언어는 국적의 코드("vi")로 표현되므로 둘을 같은 언어로 맞춰 본다.
 */
public final class LanguageNames {

    private LanguageNames() {}

    private static final Map<String, String> KOREAN_NAMES = Map.ofEntries(
            Map.entry("ko", "한국어"),
            Map.entry("en", "영어"),
            Map.entry("vi", "베트남어"),
            Map.entry("zh", "중국어"),
            Map.entry("km", "캄보디아어"),
            Map.entry("my", "미얀마어"),
            Map.entry("fil", "필리핀어"),
            Map.entry("id", "인도네시아어"),
            Map.entry("th", "태국어"),
            Map.entry("ne", "네팔어"),
            Map.entry("mn", "몽골어"),
            Map.entry("uz", "우즈베크어"),
            Map.entry("si", "싱할라어"),
            Map.entry("bn", "벵골어"),
            Map.entry("ur", "우르두어"));

    /** 코드와 한국어 이름을 모두 소문자로 — 저장값과 비교할 후보 */
    public static List<String> aliases(String code) {
        if (code == null || code.isBlank()) return List.of();
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        String name = KOREAN_NAMES.get(normalized);
        return name != null ? List.of(normalized, name) : List.of(normalized);
    }

    public static List<String> aliases(Collection<String> codes) {
        if (codes == null) return List.of();
        return codes.stream().filter(Objects::nonNull).flatMap(c -> aliases(c).stream()).distinct().toList();
    }

    /** 저장된 언어 값(코드 또는 한국어 이름)이 해당 코드의 언어인지 */
    public static boolean matches(String stored, String code) {
        if (stored == null) return false;
        return aliases(code).contains(stored.trim().toLowerCase(Locale.ROOT));
    }
}
