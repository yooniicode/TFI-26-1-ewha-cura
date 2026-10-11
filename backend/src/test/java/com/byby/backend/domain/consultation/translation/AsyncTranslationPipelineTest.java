package com.byby.backend.domain.consultation.translation;

import com.byby.backend.common.enums.*;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.audit.entity.AuditAction;
import com.byby.backend.domain.audit.repository.AccessLogRepository;
import com.byby.backend.domain.auth.dto.AuthRequest;
import com.byby.backend.domain.auth.dto.AuthResponse;
import com.byby.backend.domain.auth.service.AuthService;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import com.byby.backend.domain.consultation.dto.ConsultationRequest;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.consultation.service.ConsultationService;
import com.byby.backend.domain.consultation.service.TranslationService;
import com.byby.backend.domain.matching.dto.MatchRequest;
import com.byby.backend.domain.matching.service.PatientMatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 번역이 요청-응답 밖에서 끝나는지, 그리고 중복·경쟁 상황에서 결과가 한 번만 쓰이는지 확인한다.
 * 비동기 워커가 커밋된 데이터를 읽어야 하므로 테스트 자체는 트랜잭션으로 감싸지 않는다.
 */
@SpringBootTest
class AsyncTranslationPipelineTest {

    @Autowired AuthService authService;
    @Autowired PatientMatchService patientMatchService;
    @Autowired ConsultationService consultationService;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired AccessLogRepository accessLogRepository;
    @Autowired TranslationWorker worker;

    @MockBean TranslationService translationService;

    UserPrincipal interpreter;
    UUID patientId;

    @BeforeEach
    void setUp() {
        String tag = UUID.randomUUID().toString().substring(0, 8);
        CenterResponse.WithAdmin center = authService.registerCenterWithAdmin(
                new CenterRequest.DevCreateWithAdmin("secret", "번역센터-" + tag, null, null, null, null));
        AuthResponse.TokenMe admin = authService.login(new AuthRequest.Login(center.adminEmail(), center.adminPassword()));

        AuthResponse.TokenMe interp = authService.signup(new AuthRequest.Signup(
                "interp-" + tag + "@test.local", "Passw0rd!", "김통역", UserRole.interpreter,
                null, null, null, null, null, null, null, null,
                InterpreterRole.ACTIVIST, center.center().id(), null, List.of("vi"), null));
        AuthResponse.TokenMe patient = authService.signup(new AuthRequest.Signup(
                "patient-" + tag + "@test.local", "Passw0rd!", "Nguyen Van A", UserRole.patient,
                Nationality.VIETNAM, Gender.MALE, VisaType.E9, null, LocalDate.of(1990, 1, 1), null, null, null,
                null, center.center().id(), null, null, null));

        patientMatchService.create(new MatchRequest.Create(patient.me().entityId(), interp.me().entityId()),
                new UserPrincipal(admin.me().authUserId(), UserRole.admin));

        interpreter = new UserPrincipal(interp.me().authUserId(), UserRole.interpreter);
        patientId = patient.me().entityId();

        when(translationService.isAvailable()).thenReturn(true);
        when(translationService.translateToKorean(any(), any(), any(), any(), any(), any()))
                .thenAnswer(inv -> new TranslationService.MedicalTranslation(
                        "(번역) " + inv.getArgument(0), "(번역) " + inv.getArgument(1), null, null, null));
    }

    private UUID createConsultation() {
        ConsultationResponse.Detail created = consultationService.create(new ConsultationRequest.Create(
                LocalDateTime.of(2026, 10, 1, 10, 0), patientId, null, "목동병원", "내과", null,
                IssueType.MEDICAL, null, ProcessingType.INTERPRETATION, null,
                "Tôi bị đau bụng.", null, "Viêm dạ dày.", null, null, null, null, null, null, null, null, null),
                interpreter);
        return created.id();
    }

    private ConsultationRequest.Update updateBody(String comment) {
        return new ConsultationRequest.Update(null, null, null, null, null, null, null, null, null, null, null,
                comment, null, "Viêm dạ dày.", null, null, null, null, null, null, null, null, null);
    }

    private Consultation awaitUntil(UUID id, Predicate<Consultation> done) throws InterruptedException {
        for (int i = 0; i < 100; i++) {
            Consultation c = consultationRepository.findById(id).orElseThrow();
            if (done.test(c)) return c;
            Thread.sleep(50);
        }
        return consultationRepository.findById(id).orElseThrow();
    }

    @Test
    @DisplayName("저장은 PENDING 으로 즉시 돌아오고, 번역은 뒤에서 끝나 DONE 이 된다")
    void updateReturnsPendingThenWorkerCompletes() throws Exception {
        UUID id = createConsultation();

        ConsultationResponse.Detail res = consultationService.update(id, updateBody("Tôi bị đau bụng."), interpreter);

        assertThat(res.translationStatus()).isEqualTo(TranslationStatus.PENDING);
        assertThat(res.translatedPatientComment()).isNull();

        Consultation done = awaitUntil(id, c -> c.getTranslationStatus() == TranslationStatus.DONE);
        assertThat(done.getTranslationStatus()).isEqualTo(TranslationStatus.DONE);
        assertThat(done.getTranslationLang()).isEqualTo("ko");
        assertThat(done.getTranslatedPatientComment()).isEqualTo("(번역) Tôi bị đau bụng.");
        verify(translationService, timeout(5000).times(1)).translateToKorean(any(), any(), any(), any(), any(), any());

        // 국외 이전 감사기록은 워커가 남긴다 (요청자 = 통번역가)
        assertThat(accessLogRepository.findAll()).anyMatch(l ->
                l.getAction() == AuditAction.THIRD_PARTY_TRANSFER
                        && id.equals(l.getResourceId())
                        && interpreter.getAuthUserId().equals(l.getAuthUserId()));
    }

    @Test
    @DisplayName("같은 작업이 두 번 와도(최소 1회 전달) 번역은 한 번만 호출된다")
    void duplicateJobIsIgnored() throws Exception {
        UUID id = createConsultation();
        consultationService.update(id, updateBody("Tôi bị đau bụng."), interpreter);
        Consultation done = awaitUntil(id, c -> c.getTranslationStatus() == TranslationStatus.DONE);

        // SQS 가 같은 메시지를 다시 전달한 상황
        worker.process(new TranslationJob(id, done.getTranslationVersion(), interpreter.getAuthUserId(), UserRole.interpreter));

        verify(translationService, times(1)).translateToKorean(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("번역 중에 원문이 다시 저장되면 옛 버전의 결과는 버려진다")
    void staleResultIsDiscarded() throws Exception {
        UUID id = createConsultation();
        CountDownLatch release = new CountDownLatch(1);
        when(translationService.translateToKorean(any(), any(), any(), any(), any(), any()))
                .thenAnswer(inv -> {
                    release.await(5, TimeUnit.SECONDS); // 첫 번역이 OpenAI 를 기다리는 동안
                    return new TranslationService.MedicalTranslation("(번역) " + inv.getArgument(0), null, null, null, null);
                });

        consultationService.update(id, updateBody("v1"), interpreter);
        Thread.sleep(200);                                             // 워커가 v1 을 읽어 OpenAI 를 기다리는 중
        consultationService.update(id, updateBody("v2"), interpreter); // 사용자가 다시 저장 → 버전 2
        release.countDown();

        Consultation c = awaitUntil(id, x -> x.getTranslationStatus() == TranslationStatus.DONE
                && "(번역) v2".equals(x.getTranslatedPatientComment()));
        assertThat(c.getTranslatedPatientComment()).isEqualTo("(번역) v2");
        assertThat(c.getTranslationVersion()).isEqualTo(2L);
    }

    @Test
    @DisplayName("외부 호출이 실패하면 FAILED 로 남고 원문은 그대로다")
    void failureIsRecorded() throws Exception {
        UUID id = createConsultation();
        when(translationService.translateToKorean(any(), any(), any(), any(), any(), any())).thenReturn(null);

        consultationService.update(id, updateBody("Tôi bị đau bụng."), interpreter);

        Consultation c = awaitUntil(id, x -> x.getTranslationStatus() == TranslationStatus.FAILED);
        assertThat(c.getTranslationStatus()).isEqualTo(TranslationStatus.FAILED);
        assertThat(c.getPatientComment()).isEqualTo("Tôi bị đau bụng.");
        assertThat(c.getTranslatedPatientComment()).isNull();
    }

    @Test
    @DisplayName("번역이 꺼져 있으면 PENDING 으로 표시하지 않는다")
    void disabledTranslationLeavesNone() {
        when(translationService.isAvailable()).thenReturn(false);
        UUID id = createConsultation();

        ConsultationResponse.Detail res = consultationService.update(id, updateBody("Tôi bị đau bụng."), interpreter);

        assertThat(res.translationStatus()).isEqualTo(TranslationStatus.NONE);
        verifyNoMoreInteractions(ignoreStubs(translationService));
    }
}
