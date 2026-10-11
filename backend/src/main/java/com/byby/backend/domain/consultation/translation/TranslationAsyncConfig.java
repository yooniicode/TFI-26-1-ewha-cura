package com.byby.backend.domain.consultation.translation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

/**
 * 번역 전용 스레드 풀.
 *
 * <p>크기를 DB 커넥션 풀(prod 5개)보다 작게 둔다. 워커는 OpenAI 를 기다리는 동안 커넥션을 쥐지 않지만,
 * 읽기·쓰기 트랜잭션은 각각 커넥션 하나를 잠깐 쓰므로 동시 워커 수가 곧 번역이 점유할 수 있는 커넥션 상한이다.
 */
@Configuration
@EnableAsync
public class TranslationAsyncConfig {

    public static final String EXECUTOR = "translationExecutor";

    @Value("${byby.translation.worker.concurrency:2}")
    private int concurrency;

    @Value("${byby.translation.worker.queue-capacity:1000}")
    private int queueCapacity;

    @Bean(EXECUTOR)
    public ThreadPoolTaskExecutor translationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(concurrency);
        executor.setMaxPoolSize(concurrency);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("translate-");
        // 큐까지 꽉 차면 요청 스레드에서 직접 처리해 작업을 버리지는 않는다 (배압)
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
