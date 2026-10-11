package com.byby.backend.domain.consultation.translation;

/**
 * 번역 작업을 요청-응답 밖으로 넘기는 통로.
 *
 * <p>구현체는 둘이다.
 * <ul>
 *   <li>{@link AsyncTranslationJobDispatcher} — 같은 JVM 의 전용 스레드 풀 (기본값)</li>
 *   <li>{@link SqsTranslationJobDispatcher} — SQS 에 발행하고 처리는 Lambda 가 한다
 *       ({@code byby.translation.dispatcher=sqs})</li>
 * </ul>
 * 어느 쪽이든 호출자는 트랜잭션 커밋 뒤에 불러야 한다. 커밋 전에 넘기면 워커가 옛 원문을 읽는다.
 */
public interface TranslationJobDispatcher {
    void dispatch(TranslationJob job);
}
