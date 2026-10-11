package com.byby.backend.domain.consultation.translation;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

/**
 * 2단계: 작업을 SQS 에 발행한다. 처리는 큐를 폴링하는 Lambda({@code lambda/translation}) 가 한다.
 *
 * <p>메시지에는 id 와 버전만 실린다. 환자 원문은 DB 에만 있고 Lambda 가 id 로 읽는다.
 * 활성화: {@code byby.translation.dispatcher=sqs} + {@code TRANSLATION_QUEUE_URL} + AWS 자격증명(기본 체인).
 * 이 자격증명은 {@code sqs:SendMessage} 를 큐 하나에만 허용한 IAM 사용자여야 한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "byby.translation.dispatcher", havingValue = "sqs")
public class SqsTranslationJobDispatcher implements TranslationJobDispatcher {

    private final SqsClient sqs;
    private final String queueUrl;
    private final ObjectMapper objectMapper;

    public SqsTranslationJobDispatcher(
            @Value("${byby.translation.sqs.queue-url}") String queueUrl,
            @Value("${byby.translation.sqs.region:ap-northeast-2}") String region,
            ObjectMapper objectMapper) {
        this.queueUrl = queueUrl;
        this.objectMapper = objectMapper;
        this.sqs = SqsClient.builder().region(Region.of(region)).build();
    }

    @Override
    public void dispatch(TranslationJob job) {
        try {
            String body = objectMapper.writeValueAsString(job);
            sqs.sendMessage(SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(body)
                    // 같은 진료기록의 연속 저장은 같은 그룹으로 묶여 순서가 지켜진다 (FIFO 큐일 때만 의미 있음)
                    .build());
        } catch (Exception e) {
            // 발행 실패는 PENDING 으로 남는다. 다음 저장에서 다시 요청되고, 운영자는 PENDING 체류 시간으로 감지한다.
            log.error("[translation] SQS 발행 실패 consultation={} v={}", job.consultationId(), job.version(), e);
        }
    }
}
