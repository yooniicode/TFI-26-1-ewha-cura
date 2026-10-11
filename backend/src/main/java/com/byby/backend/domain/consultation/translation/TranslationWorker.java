package com.byby.backend.domain.consultation.translation;

import com.byby.backend.domain.audit.service.AuditService;
import com.byby.backend.domain.consultation.service.TranslationService;
import com.byby.backend.domain.consultation.service.TranslationService.MedicalTranslation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 번역 작업 하나를 끝까지 처리한다: 읽기 → (커넥션 없이) OpenAI 호출 → 쓰기 → 감사기록.
 *
 * <p>SQS+Lambda 로 옮기면 이 클래스가 하는 일을 {@code lambda/translation/src/handler.py} 가 그대로 한다.
 * 이 클래스는 트랜잭션을 직접 열지 않는다. 열어 버리면 OpenAI 를 기다리는 동안 커넥션을 쥐게 된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TranslationWorker {

    private final TranslationJobStore store;
    private final TranslationService translationService;
    private final AuditService auditService;

    public void process(TranslationJob job) {
        Optional<TranslationJobStore.Snapshot> loaded = store.loadPending(job);
        if (loaded.isEmpty()) return;
        TranslationJobStore.Snapshot s = loaded.get();

        MedicalTranslation result;
        try {
            // 가명처리는 Snapshot 에서 끝났으므로 추가로 가릴 이름은 없다
            result = translationService.translateToKorean(
                    s.patientComment(), s.diagnosisContent(), s.treatmentResult(),
                    s.medicationInstruction(), s.diagnosisNameCode(), s.sourceLang());
        } catch (Exception e) {
            result = null;
            log.warn("[translation] 외부 호출 실패 consultation={}: {}", s.consultationId(), e.getMessage());
        }

        if (result == null) {
            store.fail(job);
            return;
        }

        boolean applied = store.complete(job, result);
        // 진료 내용이 국외(OpenAI)로 이전된 사실은 반영 여부와 무관하게 기록한다 — 전송은 이미 일어났다
        auditService.recordThirdPartyTransfer(
                job.requestedBy(), job.requestedRole(), "OpenAI API (국외)",
                "CONSULTATION", s.consultationId(), s.patientId(),
                "목적=진료내용 한국어 번역 / 가명처리 적용 / 원어=" + s.sourceLang()
                        + " / 비동기 워커 / 반영=" + (applied ? "Y" : "N(버전 불일치)"));
    }
}
