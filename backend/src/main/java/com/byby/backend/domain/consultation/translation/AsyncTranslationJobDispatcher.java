package com.byby.backend.domain.consultation.translation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 1단계: 같은 JVM 안의 전용 스레드 풀에서 번역한다.
 *
 * <p>풀 크기가 곧 OpenAI 동시 호출 상한이자 번역이 점유할 수 있는 DB 커넥션 상한이다
 * ({@link TranslationAsyncConfig} 참고). Lambda 의 예약 동시성(reserved concurrency)과 같은 역할을 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "byby.translation.dispatcher", havingValue = "async", matchIfMissing = true)
public class AsyncTranslationJobDispatcher implements TranslationJobDispatcher {

    private final TranslationWorker worker;

    @Override
    @Async(TranslationAsyncConfig.EXECUTOR)
    public void dispatch(TranslationJob job) {
        try {
            worker.process(job);
        } catch (Exception e) {
            // 워커가 FAILED 를 기록하므로 여기서는 스레드가 죽지 않게만 막는다
            log.error("[translation] 작업 처리 중 예외 consultation={} v={}", job.consultationId(), job.version(), e);
        }
    }
}
