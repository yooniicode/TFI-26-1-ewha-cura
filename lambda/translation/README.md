# 진료기록 번역 워커 (SQS → Lambda)

Spring 서버의 `TranslationWorker` 가 하는 일을 AWS Lambda 로 떼어낸 것이다 (2단계).
Spring 은 `byby.translation.dispatcher=sqs` 로 바꾸면 번역 작업을 직접 처리하지 않고 SQS 에 `{consultationId, version}` 만 발행한다.

```
클라이언트 → Spring: PUT /consultations/{id}  (translation_status=PENDING, version+1 커밋)  → 즉시 200
Spring → SQS: {consultationId, version, requestedBy, requestedRole}
SQS → Lambda(handler.py): DB 에서 원문 읽기 → 가명처리 → OpenAI → 버전이 같을 때만 UPDATE(DONE) → access_log
클라이언트: GET /consultations/{id} 를 1.5초 간격으로 폴링해 DONE 확인
```

## 파일

| 파일 | 역할 |
|---|---|
| `template.yaml` | SAM 템플릿. 큐, DLQ, 함수, IAM 정책, 로그 보존 기간을 한 파일에 선언 |
| `src/handler.py` | 워커 본체. Init 에서 SSM 파라미터와 DB 커넥션을 한 번 만들고 재사용 |
| `src/pii.py` | `PiiScrubber.java` 를 그대로 옮긴 가명처리. 두 구현의 규칙은 같게 유지해야 한다 |

## 멱등성

SQS 는 최소 1회 전달이라 같은 메시지가 두 번 올 수 있고, 처리 중에 사용자가 다시 저장할 수도 있다.
`consultation.translation_version` 이 그 둘을 걸러낸다.

- 저장할 때마다 Spring 이 version 을 1 올리고 메시지에 그 값을 싣는다.
- 워커는 `WHERE id = ? AND translation_version = ?` 조건으로만 UPDATE 한다. 영향 행이 0 이면 결과를 버린다.
- 이미 DONE 인 행은 OpenAI 를 호출하지 않는다.

## 로컬 실행

AWS 없이 로컬 Postgres 와 OpenAI 대역 서버로 돌려볼 수 있다. `DATABASE_URL` 과 `OPENAI_API_KEY` 가 환경변수에 있으면 SSM 을 읽지 않는다.

```bash
pip install "psycopg[binary]"
cd src
DATABASE_URL=postgresql://byby:byby123@localhost:5434/byby \
OPENAI_API_KEY=... OPENAI_BASE_URL=https://api.openai.com/v1 \
python -c "import json, handler; print(handler.lambda_handler({'Records': [{'messageId': 'm1', 'body': json.dumps({'consultationId': '<uuid>', 'version': 1})}]}, None))"
```

## 배포

```bash
# 1) 시크릿을 SSM SecureString 으로 (Secrets Manager 보다 싸고 이 용도엔 충분)
aws ssm put-parameter --name /cura/translation/database-url --type SecureString --value 'postgresql://...pooler.supabase.com:6543/postgres?sslmode=require'
aws ssm put-parameter --name /cura/translation/openai-api-key --type SecureString --value 'sk-...'

# 2) 빌드·배포 (psycopg 바이너리를 Lambda arm64 용으로 빌드하려면 컨테이너 빌드)
sam build --use-container
sam deploy --guided --region ap-northeast-2

# 3) 출력된 QueueUrl 을 Railway 환경변수에
#    TRANSLATION_DISPATCHER=sqs
#    TRANSLATION_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/<account>/cura-translation
#    AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  ← PublisherPolicyArn 만 붙인 IAM 사용자
```

## 설계에서 지킨 것

- **VPC 에 넣지 않는다.** Supabase 풀러와 OpenAI 모두 공개 엔드포인트라 NAT Gateway(월 $30+)가 필요 없다.
- **DB 는 반드시 풀러(6543, transaction mode)로.** 함수 환경 하나가 커넥션 하나를 쥐므로 직접 연결(5432)은 금방 한계가 온다. prepared statement 를 쓰지 않도록 `prepare_threshold=None`.
- **큐·로그에 원문을 싣지 않는다.** 메시지는 id 와 버전뿐이고, 로그도 id 와 소요 시간만 찍는다.
- **동시성 상한 = `ReservedConcurrency`(기본 5).** OpenAI 분당 한도와 DB 커넥션을 동시에 보호한다.
- **실패한 작업이 가는 곳을 먼저 정했다.** 3번 실패하면 DLQ(`cura-translation-dlq`, 14일 보관). 행은 `FAILED` 로 남아 UI 가 원문을 보여준다.
- **함수 권한은 자기 큐 + 자기 SSM 파라미터 2개뿐.** Supabase 서비스 키는 애초에 없다.
