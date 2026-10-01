package com.byby.backend.common.privacy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** 외부(번역 API·구글 시트)로 나가는 데이터의 식별정보 제거 검증 */
class PiiScrubberTest {

    @Test
    @DisplayName("자유입력란의 연락처·등록번호·이메일이 치환된다")
    void scrubsIdentifiers() {
        String text = "환자 연락처는 010-1234-5678이고 등록번호 900101-5123456, 메일 test.user@example.com 입니다";

        String scrubbed = PiiScrubber.scrub(text);

        assertThat(scrubbed)
                .doesNotContain("010-1234-5678")
                .doesNotContain("900101-5123456")
                .doesNotContain("test.user@example.com")
                .contains("[연락처]", "[등록번호]", "[이메일]");
    }

    @Test
    @DisplayName("실명은 [이름]으로 치환되고, 긴 이름이 먼저 처리된다")
    void scrubsNames() {
        String text = "응우옌티엔 님을 김통역 통번역가가 동행했고 박의사 선생님이 진료";

        String scrubbed = PiiScrubber.scrub(text, "김통역", "응우옌티엔", "박의사");

        assertThat(scrubbed)
                .doesNotContain("응우옌티엔")
                .doesNotContain("김통역")
                .doesNotContain("박의사")
                .contains("[이름]");
    }

    @Test
    @DisplayName("한 글자 이름과 null 은 무시해 일반 단어를 훼손하지 않는다")
    void ignoresUnsafeNames() {
        String text = "이 약을 하루 세 번 복용하세요";

        String scrubbed = PiiScrubber.scrub(text, "이", null, "  ");

        assertThat(scrubbed).isEqualTo(text);
    }

    @Test
    @DisplayName("빈 입력은 그대로 반환한다")
    void handlesBlankInput() {
        assertThat(PiiScrubber.scrub(null)).isNull();
        assertThat(PiiScrubber.scrub("")).isEmpty();
    }

    @Test
    @DisplayName("시트 내보내기 마스킹 — 이름·생년월일·전화")
    void masksForExport() {
        assertThat(PiiMasker.maskName("홍길동")).isEqualTo("홍*동");
        assertThat(PiiMasker.maskName("김철")).isEqualTo("김*");
        assertThat(PiiMasker.maskName("응우옌티엔")).isEqualTo("응***엔");
        assertThat(PiiMasker.maskName(null)).isEmpty();

        assertThat(PiiMasker.maskBirthDate(LocalDate.of(1990, 5, 3))).isEqualTo("1990");
        assertThat(PiiMasker.maskBirthDate(null)).isEmpty();

        assertThat(PiiMasker.maskPhone("010-1234-5678")).isEqualTo("010****5678");
        assertThat(PiiMasker.maskFreeText("○○산업 성수공장")).isEqualTo("***");
        assertThat(PiiMasker.maskFreeText(null)).isEmpty();
    }
}
