package com.byby.backend.domain.consultation.translation;

import com.byby.backend.common.enums.TranslationStatus;
import com.byby.backend.common.privacy.PiiScrubber;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.consultation.service.TranslationService.MedicalTranslation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * 워커의 DB 접근만 모아둔 곳. 각 메서드가 짧은 트랜잭션 하나다.
 *
 * <p>핵심은 외부 API 호출이 이 클래스 밖에서 일어난다는 것이다. 읽기 트랜잭션이 끝나 커넥션을 돌려준 뒤
 * OpenAI 를 기다리고, 결과가 오면 새 트랜잭션으로 쓴다. 커넥션은 두 번 잠깐 빌릴 뿐 수 초간 쥐고 있지 않다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TranslationJobStore {

    private final ConsultationRepository consultationRepository;

    /** 가명처리까지 끝난, 외부로 보내도 되는 원문. */
    public record Snapshot(
            UUID consultationId,
            UUID patientId,
            String sourceLang,
            String patientComment,
            String diagnosisContent,
            String treatmentResult,
            String medicationInstruction,
            String diagnosisNameCode
    ) {}

    /**
     * 아직 처리되지 않은 같은 버전의 작업이면 원문을 읽어 가명처리해 돌려준다.
     * 버전이 다르거나(그 사이 다시 저장됨, 중복 메시지) 이미 끝났으면 empty.
     */
    @Transactional(readOnly = true)
    public Optional<Snapshot> loadPending(TranslationJob job) {
        Consultation c = consultationRepository.findById(job.consultationId()).orElse(null);
        if (c == null) return Optional.empty();
        if (c.getTranslationVersion() != job.version()) {
            log.info("[translation] 버전 불일치로 건너뜀 consultation={} job.v={} current.v={}",
                    c.getId(), job.version(), c.getTranslationVersion());
            return Optional.empty();
        }
        if (c.getTranslationStatus() == TranslationStatus.DONE) return Optional.empty();
        if (c.getPatient() == null || c.getPatient().getNationality() == null) return Optional.empty();

        // 자유입력란에 섞여 들어온 실명은 외부 전송 전에 가명처리한다
        String[] namesToMask = {
                c.getPatient().getName(),
                c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                c.getDoctorName(),
                c.getCounselorName()
        };
        return Optional.of(new Snapshot(
                c.getId(), c.getPatient().getId(),
                c.getPatient().getNationality().getLanguageCode(),
                PiiScrubber.scrub(c.getPatientComment(), namesToMask),
                PiiScrubber.scrub(c.getDiagnosisContent(), namesToMask),
                PiiScrubber.scrub(c.getTreatmentResult(), namesToMask),
                PiiScrubber.scrub(c.getMedicationInstruction(), namesToMask),
                PiiScrubber.scrub(c.getDiagnosisNameCode(), namesToMask)));
    }

    /** 버전이 아직 같을 때만 번역본을 쓴다. @return 반영 여부 */
    @Transactional
    public boolean complete(TranslationJob job, MedicalTranslation t) {
        Consultation c = consultationRepository.findById(job.consultationId()).orElse(null);
        if (c == null) return false;
        boolean applied = c.applyTranslation(job.version(), "ko", t.patientComment(), t.diagnosisContent(),
                t.treatmentResult(), t.medicationInstruction(), t.diagnosisNameCode());
        if (!applied) {
            log.info("[translation] 결과 버림 — 처리 중 원문이 바뀜 consultation={} job.v={} current.v={}",
                    c.getId(), job.version(), c.getTranslationVersion());
        }
        return applied;
    }

    @Transactional
    public void fail(TranslationJob job) {
        consultationRepository.findById(job.consultationId())
                .ifPresent(c -> c.markTranslationFailed(job.version()));
    }
}
