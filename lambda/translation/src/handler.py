"""
Cura 진료기록 번역 워커 (SQS → Lambda).

메시지: {"consultationId": "...", "version": 3, "requestedBy": "<auth_user_id>|null", "requestedRole": "interpreter|admin|null"}
         (Spring 의 TranslationJob 을 그대로 JSON 으로 만든 것. 환자 원문은 싣지 않는다.)

흐름 (Spring 의 TranslationWorker 와 동일):
  1. DB 에서 같은 버전의 PENDING/FAILED 행을 읽는다. 버전이 다르거나 이미 DONE 이면 건너뛴다 (멱등).
  2. 실명·번호류를 가명처리한다 (pii.py).
  3. 커넥션을 쥐지 않은 채 OpenAI 를 호출한다.
  4. 버전이 아직 같을 때만 UPDATE 한다 (낙관적 CAS).
  5. 국외 이전 감사기록(access_log)을 남긴다.

Init 단계(핸들러 밖)에서 SSM 파라미터를 읽고 DB 커넥션을 하나 만들어 재사용한다.
PgBouncer transaction mode 전제: prepared statement 와 세션 변수를 쓰지 않는다 (psycopg prepare_threshold=None).
"""
import json
import logging
import os
import time
import urllib.error
import urllib.request

import psycopg

from pii import scrub

log = logging.getLogger()
log.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

LANG_NAMES = {
    "en": "English", "vi": "Vietnamese", "zh": "Chinese (Simplified)", "km": "Khmer",
    "my": "Burmese (Myanmar)", "fil": "Filipino", "id": "Indonesian", "th": "Thai",
    "ne": "Nepali", "mn": "Mongolian", "uz": "Uzbek", "si": "Sinhala", "bn": "Bengali", "ur": "Urdu",
}
# Nationality enum(backend) → 언어 코드. 소스 코드의 Nationality.java 와 같게 유지한다.
NATIONALITY_LANG = {
    "KOREA": "ko", "UNITED_STATES": "en", "VIETNAM": "vi", "CHINA": "zh", "CAMBODIA": "km",
    "MYANMAR": "my", "PHILIPPINES": "fil", "INDONESIA": "id", "THAILAND": "th", "NEPAL": "ne",
    "MONGOLIA": "mn", "UZBEKISTAN": "uz", "SRI_LANKA": "si", "BANGLADESH": "bn", "PAKISTAN": "ur",
}
FIELDS = ["DIAGNOSIS_NAME", "PATIENT_COMMENT", "DIAGNOSIS_CONTENT", "TREATMENT_RESULT", "MEDICATION_INSTRUCTION"]


# ───────────────────────── Init (환경당 한 번) ─────────────────────────

def _load_config() -> dict:
    """로컬 실행이면 환경변수를, Lambda 면 SSM SecureString 을 읽는다."""
    if os.environ.get("DATABASE_URL") and os.environ.get("OPENAI_API_KEY"):
        return {
            "database_url": os.environ["DATABASE_URL"],
            "openai_api_key": os.environ["OPENAI_API_KEY"],
        }
    import boto3  # Lambda 런타임에 내장. 로컬 테스트에서는 필요 없다
    ssm = boto3.client("ssm")
    names = [os.environ["DATABASE_URL_PARAM"], os.environ["OPENAI_API_KEY_PARAM"]]
    res = ssm.get_parameters(Names=names, WithDecryption=True)
    values = {p["Name"]: p["Value"] for p in res["Parameters"]}
    return {"database_url": values[names[0]], "openai_api_key": values[names[1]]}


CONFIG = _load_config()
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
_conn: psycopg.Connection | None = None


def _db() -> psycopg.Connection:
    """환경이 재사용될 때 커넥션도 재사용한다. 끊겨 있으면 다시 연다."""
    global _conn
    if _conn is None or _conn.closed:
        # prepare_threshold=None: PgBouncer transaction mode 에서는 서버측 prepared statement 금지
        _conn = psycopg.connect(CONFIG["database_url"], prepare_threshold=None, autocommit=False)
    return _conn


# ───────────────────────── 단계별 함수 ─────────────────────────

def load_pending(consultation_id: str, version: int) -> dict | None:
    """같은 버전의 미완료 작업이면 가명처리된 원문을 돌려준다. 아니면 None."""
    sql = """
        SELECT c.translation_status, c.translation_version,
               c.patient_comment, c.diagnosis_content, c.treatment_result,
               c.medication_instruction, c.diagnosis_name_code,
               c.doctor_name, c.counselor_name,
               p.id AS patient_id, p.name AS patient_name, p.nationality,
               i.name AS interpreter_name
          FROM consultation c
          JOIN patient p ON p.id = c.patient_id
     LEFT JOIN interpreter i ON i.id = c.interpreter_id
         WHERE c.id = %s
    """
    conn = _db()
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(sql, (consultation_id,))
        row = cur.fetchone()
    if row is None:
        log.info("consultation 없음 id=%s", consultation_id)
        return None
    (status, cur_version, comment, diag, treat, med, name_code,
     doctor, counselor, patient_id, patient_name, nationality, interp_name) = row
    if cur_version != version:
        log.info("버전 불일치로 건너뜀 id=%s job.v=%s current.v=%s", consultation_id, version, cur_version)
        return None
    if status == "DONE":
        return None
    lang = NATIONALITY_LANG.get(nationality, "en")
    if lang == "ko":
        return None
    names = (patient_name, interp_name, doctor, counselor)
    return {
        "patient_id": patient_id,
        "lang": lang,
        "patient_comment": scrub(comment, *names),
        "diagnosis_content": scrub(diag, *names),
        "treatment_result": scrub(treat, *names),
        "medication_instruction": scrub(med, *names),
        "diagnosis_name_code": scrub(name_code, *names),
    }


def build_prompt(s: dict) -> str:
    lang_name = LANG_NAMES.get(s["lang"], "English")
    v = lambda k: s.get(k) or ""
    return (
        f"You are a medical translation assistant. Translate the following medical record fields from {lang_name} "
        "into Korean. Keep medical terms accurate. Return ONLY the translated text for each field, "
        "in the exact same format as below.\n\n"
        f"DIAGNOSIS_NAME: {v('diagnosis_name_code')}\n"
        f"PATIENT_COMMENT: {v('patient_comment')}\n"
        f"DIAGNOSIS_CONTENT: {v('diagnosis_content')}\n"
        f"TREATMENT_RESULT: {v('treatment_result')}\n"
        f"MEDICATION_INSTRUCTION: {v('medication_instruction')}\n\n"
        "Respond in exactly this format:\n"
        "DIAGNOSIS_NAME: <translated text or empty>\n"
        "PATIENT_COMMENT: <translated text or empty>\n"
        "DIAGNOSIS_CONTENT: <translated text or empty>\n"
        "TREATMENT_RESULT: <translated text or empty>\n"
        "MEDICATION_INSTRUCTION: <translated text or empty>"
    )


def call_openai(prompt: str) -> str:
    body = json.dumps({
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
        "temperature": 0.1,
    }).encode()
    req = urllib.request.Request(
        f"{OPENAI_BASE_URL}/chat/completions", data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {CONFIG['openai_api_key']}"},
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        data = json.loads(res.read())
    return data["choices"][0]["message"]["content"]


def parse(raw: str) -> dict:
    out = {}
    for line in raw.split("\n"):
        for f in FIELDS:
            if line.startswith(f + ":"):
                value = line[len(f) + 1:].strip()
                out[f] = value or None
    return out


def complete(consultation_id: str, version: int, s: dict, t: dict) -> bool:
    """버전이 그대로일 때만 쓴다. 영향 행 수 0 이면 그 사이 원문이 바뀐 것."""
    keep = lambda key, field: t.get(field) if s.get(key) else None
    sql = """
        UPDATE consultation
           SET translation_lang = 'ko',
               translated_patient_comment = %s,
               translated_diagnosis_content = %s,
               translated_treatment_result = %s,
               translated_medication_instruction = %s,
               translated_diagnosis_name_code = %s,
               translation_status = 'DONE',
               updated_at = NOW()
         WHERE id = %s AND translation_version = %s
    """
    conn = _db()
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(sql, (
            keep("patient_comment", "PATIENT_COMMENT"),
            keep("diagnosis_content", "DIAGNOSIS_CONTENT"),
            keep("treatment_result", "TREATMENT_RESULT"),
            keep("medication_instruction", "MEDICATION_INSTRUCTION"),
            keep("diagnosis_name_code", "DIAGNOSIS_NAME"),
            consultation_id, version,
        ))
        return cur.rowcount == 1


def mark_failed(consultation_id: str, version: int) -> None:
    conn = _db()
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(
            "UPDATE consultation SET translation_status = 'FAILED' "
            "WHERE id = %s AND translation_version = %s AND translation_status = 'PENDING'",
            (consultation_id, version),
        )


def record_transfer(job: dict, patient_id, lang: str, applied: bool) -> None:
    """개인정보보호법 제17조·제28조의8 — 진료 내용이 국외(OpenAI)로 나간 사실. 반영 여부와 무관하게 남긴다."""
    conn = _db()
    with conn.transaction(), conn.cursor() as cur:
        cur.execute(
            "INSERT INTO access_log (auth_user_id, role, action, resource_type, resource_id, "
            "subject_patient_id, result, detail) VALUES (%s, %s, 'THIRD_PARTY_TRANSFER', 'CONSULTATION', %s, %s, 'SUCCESS', %s)",
            (job.get("requestedBy"), job.get("requestedRole"), job["consultationId"], patient_id,
             "수신자=OpenAI API (국외) / 목적=진료내용 한국어 번역 / 가명처리 적용 / 원어=" + lang
             + " / Lambda 워커 / 반영=" + ("Y" if applied else "N(버전 불일치)")),
        )


def process(job: dict) -> None:
    cid, version = job["consultationId"], int(job["version"])
    snapshot = load_pending(cid, version)
    if snapshot is None:
        return
    started = time.monotonic()
    try:
        translated = parse(call_openai(build_prompt(snapshot)))
    except (urllib.error.URLError, KeyError, ValueError, TimeoutError) as e:
        log.warning("외부 호출 실패 id=%s: %s", cid, e)
        mark_failed(cid, version)
        raise  # SQS 가 재시도하고, maxReceiveCount 를 넘기면 DLQ 로 간다
    applied = complete(cid, version, snapshot, translated)
    record_transfer(job, snapshot["patient_id"], snapshot["lang"], applied)
    log.info("완료 id=%s v=%s applied=%s openai_ms=%d", cid, version, applied, (time.monotonic() - started) * 1000)


# ───────────────────────── Lambda 진입점 ─────────────────────────

def lambda_handler(event, context):
    """SQS 배치. 실패한 메시지 id 만 돌려주면 그 메시지만 큐로 되돌아간다 (ReportBatchItemFailures)."""
    failures = []
    for record in event.get("Records", []):
        try:
            process(json.loads(record["body"]))
        except Exception:  # noqa: BLE001 — 어떤 실패든 해당 메시지만 재시도 대상으로 돌려보낸다
            log.exception("메시지 처리 실패 messageId=%s", record.get("messageId"))
            failures.append({"itemIdentifier": record["messageId"]})
            global _conn
            if _conn is not None and not _conn.closed:
                try:
                    _conn.rollback()
                except psycopg.Error:
                    _conn.close()
    return {"batchItemFailures": failures}
