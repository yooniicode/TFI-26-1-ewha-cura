"""외부(OpenAI)로 보내기 전 식별정보 치환. backend 의 PiiScrubber.java 와 같은 규칙을 유지해야 한다."""
import re

# 주민등록번호·외국인등록번호
_RESIDENT_NUMBER = re.compile(r"\b\d{6}\s*-?\s*[1-8]\d{6}\b")
# 국내 휴대전화·유선번호
_PHONE_NUMBER = re.compile(r"\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
# 여권번호 (영문 1~2자 + 숫자 7~8자)
_PASSPORT = re.compile(r"\b[A-Z]{1,2}\d{7,8}\b")


def scrub(text: str | None, *names_to_mask: str | None) -> str | None:
    """text 안의 번호류와 실명을 치환한다. names_to_mask 의 None·공백·1글자는 무시한다."""
    if not text or not text.strip():
        return text
    result = text
    # 패턴 기반 — 번호류를 먼저 지운다
    result = _RESIDENT_NUMBER.sub("[등록번호]", result)
    result = _PASSPORT.sub("[여권번호]", result)
    result = _PHONE_NUMBER.sub("[연락처]", result)
    result = _EMAIL.sub("[이메일]", result)
    # 실명 — 긴 이름부터 치환해야 부분 일치로 잘리지 않는다
    valid = sorted({n.strip() for n in names_to_mask if n and len(n.strip()) >= 2}, key=len, reverse=True)
    for name in valid:
        result = result.replace(name, "[이름]")
    return result
