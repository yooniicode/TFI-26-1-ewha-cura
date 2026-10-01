package com.byby.backend.domain.admin.service;

import com.byby.backend.common.enums.LanguageNames;
import com.byby.backend.common.enums.MatchingDisplayStatus;
import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminMatchingRequest;
import com.byby.backend.domain.admin.dto.AdminMatchingResponse;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.consultation.repository.ConsultationSpecs;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.entity.PatientMatch;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.entity.Patient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** AD-06 매칭 관리 — 요청 목록 · 통번역가 배정 · 매칭 현황 · 일정 캘린더 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMatchingService {

    private final AdminService adminService;
    private final ConsultationRepository consultationRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientMatchRepository patientMatchRepository;

    // ─── AD-06-1 요청 목록 ──────────────────────────────────────────────────

    /**
     * 화면 상태 · 요청 언어 · 이름 검색으로 거른 요청 목록. 요청 순서대로 최신순.
     * 거절 · 취소된 요청은 노출하지 않는다.
     */
    public Page<AdminMatchingResponse.RequestItem> getRequests(
            List<MatchingDisplayStatus> statuses, List<String> languages, String query,
            LocalDate from, LocalDate to, Pageable pageable, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Specification<Consultation> spec = ConsultationSpecs.allOf(
                ConsultationSpecs.inCenter(center.getId()),
                ConsultationSpecs.displayStatusIn(statuses),
                ConsultationSpecs.languageIn(languages),
                ConsultationSpecs.patientOrInterpreterName(query),
                ConsultationSpecs.dateFrom(from != null ? from.atStartOfDay() : null),
                ConsultationSpecs.dateTo(to != null ? to.atTime(23, 59, 59) : null));
        Pageable latestFirst = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return consultationRepository.findAll(spec, latestFirst)
                .map(AdminMatchingResponse.RequestItem::from);
    }

    // ─── AD-06-2 통번역가 배정 ──────────────────────────────────────────────

    /** 요청의 언어·일정을 기준으로 배정 후보 통번역가를 정렬해 반환한다. */
    public List<AdminMatchingResponse.InterpreterCandidate> getCandidates(
            UUID consultationId, String language, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);

        String targetLanguage = language;
        Consultation consultation = consultationId != null ? findInCenter(consultationId, center) : null;
        if (!StringUtils.hasText(targetLanguage) && consultation != null
                && consultation.getPatient().getNationality() != null) {
            targetLanguage = consultation.getPatient().getNationality().getLanguageCode();
        }
        final String matchLanguage = normalize(targetLanguage);

        YearMonth month = YearMonth.now();
        LocalDateTime monthStart = month.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = month.atEndOfMonth().atTime(23, 59, 59);

        return interpreterRepository.findByCenterId(center.getId()).stream()
                .filter(Interpreter::isActive)
                .map(i -> AdminMatchingResponse.InterpreterCandidate.from(
                        i,
                        matchesLanguage(i, matchLanguage),
                        companionCount(consultation, i),
                        patientMatchRepository.countByInterpreterIdAndActiveTrue(i.getId()),
                        consultationRepository.countByInterpreterIdAndDateBetween(i.getId(), monthStart, monthEnd),
                        consultationRepository.sumDurationHoursByInterpreterIdAndDateTimeBetween(
                                i.getId(), monthStart, monthEnd)))
                // 언어가 맞는 통번역가 → 이 환자와 많이 동행한 순 → 담당 부하가 적은 순
                .sorted(Comparator
                        .comparing(AdminMatchingResponse.InterpreterCandidate::languageMatched).reversed()
                        .thenComparing(Comparator.comparingLong(
                                AdminMatchingResponse.InterpreterCandidate::companionCount).reversed())
                        .thenComparingLong(AdminMatchingResponse.InterpreterCandidate::activePatientCount)
                        .thenComparing(AdminMatchingResponse.InterpreterCandidate::name,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    @Transactional
    public AdminMatchingResponse.RequestItem assign(UUID consultationId, AdminMatchingRequest.Assign req,
                                                    UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Consultation consultation = findInCenter(consultationId, center);

        if (consultation.getInterpreter() != null) {
            throw new BusinessException(BusinessErrorCode.CONSULTATION_ALREADY_ACCEPTED);
        }

        Interpreter interpreter = interpreterRepository.findById(req.interpreterId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        requireSameCenter(interpreter, center);
        if (!interpreter.isActive()) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "비활성 통번역가에게는 배정할 수 없습니다");
        }

        consultation.assignByAdmin(interpreter, req.consultationDate(), principal.getAuthUserId());

        if (req.shouldCreateMatch()) {
            ensureActiveMatch(consultation.getPatient(), interpreter, principal.getAuthUserId());
        }
        return AdminMatchingResponse.RequestItem.from(consultation);
    }

    /** 배정된 통번역가를 다른 통번역가로 교체한다. */
    @Transactional
    public AdminMatchingResponse.RequestItem reassign(UUID consultationId, AdminMatchingRequest.Assign req,
                                                      UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Consultation consultation = findInCenter(consultationId, center);

        Interpreter interpreter = interpreterRepository.findById(req.interpreterId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        requireSameCenter(interpreter, center);

        Interpreter previous = consultation.getInterpreter();
        consultation.assignByAdmin(interpreter, req.consultationDate(), principal.getAuthUserId());

        if (req.shouldCreateMatch()) {
            if (previous != null && !previous.getId().equals(interpreter.getId())) {
                patientMatchRepository
                        .findByPatientIdAndInterpreterIdAndActiveTrue(
                                consultation.getPatient().getId(), previous.getId())
                        .ifPresent(PatientMatch::deactivate);
            }
            ensureActiveMatch(consultation.getPatient(), interpreter, principal.getAuthUserId());
        }
        return AdminMatchingResponse.RequestItem.from(consultation);
    }

    @Transactional
    public AdminMatchingResponse.RequestItem reject(UUID consultationId, AdminMatchingRequest.Reject req,
                                                    UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Consultation consultation = findInCenter(consultationId, center);
        if (consultation.getInterpreter() != null) {
            throw new BusinessException(BusinessErrorCode.CONSULTATION_ALREADY_ACCEPTED);
        }
        consultation.rejectRequest(req.reason().trim(), principal.getAuthUserId());
        return AdminMatchingResponse.RequestItem.from(consultation);
    }

    /** 배정 취소 — 요청을 다시 미배정 상태로 되돌린다. */
    @Transactional
    public AdminMatchingResponse.RequestItem unassign(UUID consultationId, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Consultation consultation = findInCenter(consultationId, center);
        Interpreter previous = consultation.getInterpreter();
        if (previous == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "아직 배정되지 않은 요청입니다");
        }
        consultation.unassign();
        patientMatchRepository
                .findByPatientIdAndInterpreterIdAndActiveTrue(consultation.getPatient().getId(), previous.getId())
                .ifPresent(PatientMatch::deactivate);
        return AdminMatchingResponse.RequestItem.from(consultation);
    }

    // ─── AD-06-3 매칭 현황 ──────────────────────────────────────────────────

    public AdminMatchingResponse.StatusSummary getStatusSummary(UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        return new AdminMatchingResponse.StatusSummary(
                consultationRepository.countByCenterAndMatchingStatusIn(
                        center.getId(), List.of(MatchingStatus.ASSIGNED)),
                consultationRepository.countByCenterAndMatchingStatusIn(
                        center.getId(), List.of(MatchingStatus.PENDING)),
                consultationRepository.countByCenterAndMatchingStatusIn(
                        center.getId(), List.of(MatchingStatus.REJECTED, MatchingStatus.CANCELLED)));
    }

    // ─── AD-06-4 일정 캘린더 ────────────────────────────────────────────────

    public List<AdminMatchingResponse.CalendarDay> getCalendar(LocalDate from, LocalDate to,
                                                               UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        LocalDate start = from != null ? from : YearMonth.now().atDay(1);
        LocalDate end = to != null ? to : YearMonth.from(start).atEndOfMonth();

        Map<LocalDate, List<AdminMatchingResponse.CalendarItem>> byDate = new LinkedHashMap<>();
        consultationRepository
                .findCalendarByCenter(center.getId(), start.atStartOfDay(), end.atTime(23, 59, 59))
                .forEach(c -> byDate
                        .computeIfAbsent(c.getConsultationDate().toLocalDate(), k -> new java.util.ArrayList<>())
                        .add(AdminMatchingResponse.CalendarItem.from(c)));

        return byDate.entrySet().stream()
                .map(e -> new AdminMatchingResponse.CalendarDay(
                        e.getKey(),
                        e.getValue().size(),
                        e.getValue().stream()
                                .filter(i -> i.matchingStatus() == MatchingStatus.ASSIGNED).count(),
                        e.getValue().stream()
                                .filter(i -> i.matchingStatus() == MatchingStatus.PENDING).count(),
                        e.getValue()))
                .toList();
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    /** 이 요청을 제외하고, 해당 환자와 배정 확정된 진료를 함께한 횟수 */
    private long companionCount(Consultation consultation, Interpreter interpreter) {
        if (consultation == null) return 0;
        return consultationRepository.countByPatient_IdAndInterpreter_IdAndMatchingStatusAndIdNot(
                consultation.getPatient().getId(), interpreter.getId(), MatchingStatus.ASSIGNED,
                consultation.getId());
    }

    private void ensureActiveMatch(Patient patient, Interpreter interpreter, UUID adminAuthUserId) {
        if (patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(
                patient.getId(), interpreter.getId())) {
            return;
        }
        patientMatchRepository.save(PatientMatch.builder()
                .patient(patient)
                .interpreter(interpreter)
                .assignedByAuthUserId(adminAuthUserId)
                .build());
    }

    private Consultation findInCenter(UUID consultationId, Center center) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.CONSULTATION_NOT_FOUND));
        boolean byInterpreter = consultation.getInterpreter() != null
                && consultation.getInterpreter().getCenter() != null
                && consultation.getInterpreter().getCenter().getId().equals(center.getId());
        boolean byPatient = consultation.getPatient().getPatientCenters().stream()
                .anyMatch(pc -> pc.getCenter().getId().equals(center.getId()));
        if (!byInterpreter && !byPatient) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "다른 센터의 요청입니다");
        }
        return consultation;
    }

    private void requireSameCenter(Interpreter interpreter, Center center) {
        if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(center.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "같은 센터 통번역가에게만 배정할 수 있습니다");
        }
    }

    /** 통번역가 언어는 "베트남어"처럼 한국어 이름으로도 저장되므로 코드와 이름을 함께 비교한다 */
    private boolean matchesLanguage(Interpreter interpreter, String language) {
        if (language == null) return false;
        return interpreter.getLanguages().stream()
                .anyMatch(l -> LanguageNames.matches(l, language));
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }
}
