package com.byby.backend.domain.admin;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.IssueType;
import com.byby.backend.common.enums.LanguageNames;
import com.byby.backend.common.enums.MatchingDisplayStatus;
import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.ReportStatus;
import com.byby.backend.common.enums.VisaType;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.repository.CenterRepository;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.consultation.repository.ConsultationSpecs;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.entity.PatientMatch;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AD-04/05/06/보고서 관리에서 사용하는 센터 범위 쿼리가 실제로 실행되는지 검증한다.
 * (Criteria 기반 Specification 은 컨텍스트 로딩만으로는 검증되지 않는다.)
 */
@SpringBootTest
@Transactional
class AdminCenterQueriesTest {

    @Autowired CenterRepository centerRepository;
    @Autowired PatientRepository patientRepository;
    @Autowired PatientCenterRepository patientCenterRepository;
    @Autowired InterpreterRepository interpreterRepository;
    @Autowired ConsultationRepository consultationRepository;
    @Autowired PatientMatchRepository patientMatchRepository;

    private Center center;
    private Center otherCenter;
    private Patient patient;
    private Interpreter interpreter;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        center = centerRepository.save(Center.builder().name("테스트센터-" + suffix).build());
        otherCenter = centerRepository.save(Center.builder().name("다른센터-" + suffix).build());

        patient = patientRepository.save(Patient.builder()
                .authUserId(UUID.randomUUID())
                .name("응우옌")
                .nationality(Nationality.VIETNAM)
                .gender(Gender.FEMALE)
                .visaType(VisaType.E9)
                .phone("01012345678")
                .region("서울 은평구")
                .build());
        patientCenterRepository.save(patient.addCenter(center));

        interpreter = interpreterRepository.save(Interpreter.builder()
                .authUserId(UUID.randomUUID())
                .name("김통역")
                .role(InterpreterRole.ACTIVIST)
                .center(center)
                .languages(List.of("vi"))
                .build());
    }

    private Consultation saveConsultation(Interpreter assignee, LocalDateTime date) {
        return consultationRepository.save(Consultation.builder()
                .consultationDate(date)
                .patient(patient)
                .interpreter(assignee)
                .issueType(IssueType.MEDICAL)
                .hospitalName("은평성모병원")
                .build());
    }

    @Test
    @DisplayName("AD-보고서: 센터 범위 Specification 이 실행되고 다른 센터 건은 제외된다")
    void reportSpecificationScopesToCenter() {
        saveConsultation(interpreter, LocalDateTime.now());

        Specification<Consultation> mine = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(center.getId()),
                ConsultationSpecs.reportStatusIn(List.of(ReportStatus.DRAFT)),
                ConsultationSpecs.nationality(Nationality.VIETNAM),
                ConsultationSpecs.hospitalNameLike("성모"),
                ConsultationSpecs.interpreterId(interpreter.getId()),
                ConsultationSpecs.dateFrom(LocalDateTime.now().minusDays(1)),
                ConsultationSpecs.dateTo(LocalDateTime.now().plusDays(1)),
                ConsultationSpecs.patientQuery("응우옌"));

        assertThat(consultationRepository.findAll(mine, PageRequest.of(0, 20)).getTotalElements())
                .isEqualTo(1);

        Specification<Consultation> otherCenterSpec = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(otherCenter.getId()));
        assertThat(consultationRepository.findAll(otherCenterSpec, PageRequest.of(0, 20)).getTotalElements())
                .isZero();
    }

    @Test
    @DisplayName("AD-06: 미배정 요청은 PENDING, 통번역가 배정 건은 ASSIGNED 로 조회된다")
    void matchingStatusReflectsAssignment() {
        saveConsultation(null, LocalDateTime.now());
        saveConsultation(interpreter, LocalDateTime.now());

        assertThat(consultationRepository.countByCenterAndMatchingStatusIn(
                center.getId(), List.of(MatchingStatus.PENDING))).isEqualTo(1);
        assertThat(consultationRepository.countByCenterAndMatchingStatusIn(
                center.getId(), List.of(MatchingStatus.ASSIGNED))).isEqualTo(1);

        assertThat(consultationRepository.findRequestsByCenter(
                center.getId(), List.of(MatchingStatus.PENDING),
                LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1),
                PageRequest.of(0, 20)).getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("AD-06: 센터장 배정 → 수락 대기 → 수락 시 배정 완료, 취소 시 재배정 필요")
    void adminAssignmentFlowsThroughAcceptance() {
        Consultation c = saveConsultation(null, LocalDateTime.now());
        assertThat(c.getDisplayStatus()).isEqualTo(MatchingDisplayStatus.NEEDS_ASSIGNMENT);

        c.assignByAdmin(interpreter, null, UUID.randomUUID());
        assertThat(c.getMatchingStatus()).isEqualTo(MatchingStatus.AWAITING_ACCEPTANCE);
        assertThat(c.getDisplayStatus()).isEqualTo(MatchingDisplayStatus.AWAITING_ACCEPTANCE);

        c.unassign();
        assertThat(c.getInterpreter()).isNull();
        assertThat(c.getDisplayStatus()).isEqualTo(MatchingDisplayStatus.NEEDS_REASSIGNMENT);

        c.assignByAdmin(interpreter, null, UUID.randomUUID());
        c.acceptAssignment();
        assertThat(c.getDisplayStatus()).isEqualTo(MatchingDisplayStatus.ASSIGNED);

        c.submitReport();
        assertThat(c.getDisplayStatus()).isEqualTo(MatchingDisplayStatus.COMPLETED);
    }

    @Test
    @DisplayName("AD-06-1: 화면 상태 · 요청 언어 · 이름 필터가 실행되고 거절 건은 제외된다")
    void matchingRequestFiltersRun() {
        saveConsultation(null, LocalDateTime.now());                       // 배정 필요
        Consultation awaiting = saveConsultation(null, LocalDateTime.now());
        awaiting.assignByAdmin(interpreter, null, UUID.randomUUID());      // 수락 대기
        Consultation rejected = saveConsultation(null, LocalDateTime.now());
        rejected.rejectRequest("중복 요청", UUID.randomUUID());              // 목록 제외
        consultationRepository.flush();

        PageRequest page = PageRequest.of(0, 9);
        Specification<Consultation> all = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(center.getId()),
                ConsultationSpecs.displayStatusIn(List.of()));
        assertThat(consultationRepository.findAll(all, page).getTotalElements()).isEqualTo(2);

        Specification<Consultation> awaitingOnly = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(center.getId()),
                ConsultationSpecs.displayStatusIn(List.of(MatchingDisplayStatus.AWAITING_ACCEPTANCE)),
                ConsultationSpecs.languageIn(List.of("vi")),
                ConsultationSpecs.patientOrInterpreterName("김통역"));
        assertThat(consultationRepository.findAll(awaitingOnly, page).getContent())
                .extracting(Consultation::getId).containsExactly(awaiting.getId());

        Specification<Consultation> otherLanguage = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(center.getId()),
                ConsultationSpecs.languageIn(List.of("mn")));
        assertThat(consultationRepository.findAll(otherLanguage, page).getTotalElements()).isZero();
    }

    @Test
    @DisplayName("AD-05-1: 한국어 이름으로 저장된 통번역가 언어도 언어 코드로 찾는다")
    void interpreterLanguageFilterMatchesKoreanName() {
        interpreterRepository.save(Interpreter.builder()
                .authUserId(UUID.randomUUID())
                .name("박몽골")
                .role(InterpreterRole.ACTIVIST)
                .center(center)
                .gender(Gender.FEMALE)
                .languages(List.of("몽골어"))
                .build());

        assertThat(LanguageNames.matches("몽골어", "mn")).isTrue();
        assertThat(LanguageNames.matches("vi", "mn")).isFalse();
        assertThat(interpreterRepository.searchByCenterForAdmin(
                center.getId(), null, false, LanguageNames.aliases(List.of("mn")),
                false, List.of(Gender.FEMALE), "all", PageRequest.of(0, 20)).getContent())
                .extracting(Interpreter::getName).containsExactly("박몽골");
    }

    @Test
    @DisplayName("AD-04-1: 이주민 국적 · 성별 필터가 실행된다")
    void patientFiltersRun() {
        PageRequest page = PageRequest.of(0, 20);
        assertThat(patientRepository.searchByCenterForAdmin(
                center.getId(), center.getName(), center.getName(), null,
                false, List.of(Nationality.VIETNAM), false, List.of(Gender.FEMALE), page).getTotalElements())
                .isEqualTo(1);
        assertThat(patientRepository.searchByCenterForAdmin(
                center.getId(), center.getName(), center.getName(), null,
                false, List.of(Nationality.MONGOLIA), true, List.of(Gender.OTHER), page).getTotalElements())
                .isZero();
    }

    @Test
    @DisplayName("AD-05-4: 통번역 이력은 배정 확정 진료만 센다")
    void interpreterHistoryCountsAssignedOnly() {
        saveConsultation(interpreter, LocalDateTime.now());                // 직접 작성 → 확정
        Consultation awaiting = saveConsultation(null, LocalDateTime.now());
        awaiting.assignByAdmin(interpreter, null, UUID.randomUUID());      // 수락 대기는 제외
        consultationRepository.flush();

        assertThat(consultationRepository.countByInterpreter_IdAndMatchingStatus(
                interpreter.getId(), MatchingStatus.ASSIGNED)).isEqualTo(1);
        assertThat(consultationRepository.findByInterpreter_IdAndMatchingStatus(
                interpreter.getId(), MatchingStatus.ASSIGNED, PageRequest.of(0, 50)).getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("AD-06-2: 동행 횟수는 같은 환자·통번역가의 확정 진료 수(현재 요청 제외)")
    void companionCountExcludesCurrentRequest() {
        saveConsultation(interpreter, LocalDateTime.now().minusDays(7));   // 통번역가 직접 작성 → 확정
        Consultation current = saveConsultation(null, LocalDateTime.now());

        assertThat(consultationRepository.countByPatient_IdAndInterpreter_IdAndMatchingStatusAndIdNot(
                patient.getId(), interpreter.getId(), MatchingStatus.ASSIGNED, current.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("AD-홈/AD-05: 캘린더·통계·활동이력 쿼리가 실행된다")
    void dashboardAndActivityQueriesRun() {
        saveConsultation(interpreter, LocalDateTime.now());
        LocalDateTime from = LocalDateTime.now().minusDays(1);
        LocalDateTime to = LocalDateTime.now().plusDays(1);

        assertThat(consultationRepository.findCalendarByCenter(center.getId(), from, to)).hasSize(1);
        assertThat(consultationRepository.countByCenterAndCreatedAtBetween(center.getId(), from, to)).isEqualTo(1);
        assertThat(consultationRepository.countByCenterAndReportStatusIn(
                center.getId(), List.of(ReportStatus.DRAFT))).isEqualTo(1);
        assertThat(consultationRepository.countByCenterAndReportStatusInAndDateBetween(
                center.getId(), List.of(ReportStatus.APPROVED), from, to)).isZero();
        assertThat(consultationRepository.countByInterpreterIdAndDateBetween(
                interpreter.getId(), from, to)).isEqualTo(1);
        assertThat(consultationRepository.findOverdueReportsByCenter(
                center.getId(), LocalDateTime.now().plusDays(2), PageRequest.of(0, 10))).hasSize(1);
        assertThat(consultationRepository.sumDurationHoursByInterpreterIdAndDateTimeBetween(
                interpreter.getId(), from, to)).isNull();
    }

    @Test
    @DisplayName("AD-04-5: 담당 해제 이력이 endedAt 과 함께 남는다")
    void assignmentHistoryKeepsEndedMatches() {
        PatientMatch match = patientMatchRepository.save(PatientMatch.builder()
                .patient(patient)
                .interpreter(interpreter)
                .assignedByAuthUserId(UUID.randomUUID())
                .build());
        match.deactivate();
        patientMatchRepository.flush();

        List<PatientMatch> history = patientMatchRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId());
        assertThat(history).hasSize(1);
        assertThat(history.get(0).isActive()).isFalse();
        assertThat(history.get(0).getEndedAt()).isNotNull();
        assertThat(patientMatchRepository.findByInterpreterIdOrderByCreatedAtDesc(interpreter.getId()))
                .hasSize(1);
    }

    @Test
    @DisplayName("AD-보고서: 제출 → 승인/반려 상태 전이")
    void reportReviewTransitions() {
        Consultation c = saveConsultation(interpreter, LocalDateTime.now());
        assertThat(c.getReportStatus()).isEqualTo(ReportStatus.DRAFT);

        c.submitReport();
        assertThat(c.getReportStatus()).isEqualTo(ReportStatus.PENDING);
        assertThat(c.isReportCompleted()).isTrue();

        UUID reviewer = UUID.randomUUID();
        c.rejectReport(reviewer, "센터장", "약 복용법 누락");
        assertThat(c.getReportStatus()).isEqualTo(ReportStatus.REJECTED);
        assertThat(c.getReportRejectReason()).isEqualTo("약 복용법 누락");

        c.submitReport();
        assertThat(c.getReportStatus()).isEqualTo(ReportStatus.PENDING);
        assertThat(c.getReportRejectReason()).isNull();

        c.approveReport(reviewer, "센터장");
        assertThat(c.getReportStatus()).isEqualTo(ReportStatus.APPROVED);
        assertThat(c.getReportReviewedAt()).isNotNull();
    }

    @Test
    @DisplayName("AD-05-1: 비활성 통번역가도 관리 목록에서 조회된다")
    void adminInterpreterSearchIncludesInactive() {
        interpreter.deactivate();
        interpreterRepository.flush();

        List<String> none = List.of("");
        List<Gender> noGender = List.of(Gender.OTHER);
        assertThat(interpreterRepository.searchByCenterForAdmin(
                center.getId(), null, true, none, true, noGender, "all", PageRequest.of(0, 20)).getTotalElements()).isEqualTo(1);
        assertThat(interpreterRepository.searchByCenterForAdmin(
                center.getId(), null, true, none, true, noGender, "true", PageRequest.of(0, 20)).getTotalElements()).isZero();
        assertThat(interpreterRepository.searchByCenterForAdmin(
                center.getId(), "김통역", false, LanguageNames.aliases(List.of("vi")), true, noGender, "false",
                PageRequest.of(0, 20)).getTotalElements()).isEqualTo(1);
        // 기존 검색(활성만)에서는 제외된다
        assertThat(interpreterRepository.searchByCenter(
                center.getId(), null, null, PageRequest.of(0, 20)).getTotalElements()).isZero();
    }
}
