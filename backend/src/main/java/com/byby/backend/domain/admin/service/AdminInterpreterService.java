package com.byby.backend.domain.admin.service;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.LanguageNames;
import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminInterpreterRequest;
import com.byby.backend.domain.admin.dto.AdminInterpreterResponse;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** AD-05 통번역가 관리 — 목록·검색 · 프로필 · 활동정보 · 활동이력 · 상태 관리 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminInterpreterService {

    /** 활동이력 기본 조회 개월 수 */
    private static final int DEFAULT_ACTIVITY_MONTHS = 6;

    private final AdminService adminService;
    private final InterpreterRepository interpreterRepository;
    private final ConsultationRepository consultationRepository;
    private final PatientMatchRepository patientMatchRepository;

    // ─── AD-05-1 목록·검색 ──────────────────────────────────────────────────

    /**
     * activeFilter: null(전체) / true(활동 가능) / false(비활성).
     * languages 는 언어 코드("vi")로 받고, 한국어 이름("베트남어")으로 저장된 값까지 함께 찾는다.
     */
    public Page<AdminInterpreterResponse.Item> getInterpreters(
            String query, List<String> languages, List<Gender> genders, Boolean active,
            Pageable pageable, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        String activeFilter = active == null ? "all" : active.toString();

        YearMonth month = YearMonth.now();
        LocalDateTime from = month.atDay(1).atStartOfDay();
        LocalDateTime to = month.atEndOfMonth().atTime(23, 59, 59);

        List<String> languageAliases = LanguageNames.aliases(languages);
        boolean anyLanguage = languageAliases.isEmpty();
        boolean anyGender = genders == null || genders.isEmpty();

        return interpreterRepository
                .searchByCenterForAdmin(center.getId(), query,
                        // IN 절에 빈 목록을 넘기지 않도록 필터가 없을 때는 자리표시 값을 쓴다
                        anyLanguage, anyLanguage ? List.of("") : languageAliases,
                        anyGender, anyGender ? List.of(Gender.OTHER) : genders,
                        activeFilter, pageable)
                .map(i -> AdminInterpreterResponse.Item.from(
                        i,
                        consultationRepository.countByInterpreter_IdAndMatchingStatus(i.getId(), MatchingStatus.ASSIGNED),
                        patientMatchRepository.countByInterpreterIdAndActiveTrue(i.getId()),
                        consultationRepository.countByInterpreterIdAndDateBetween(i.getId(), from, to),
                        consultationRepository.sumDurationHoursByInterpreterIdAndDateTimeBetween(
                                i.getId(), from, to)));
    }

    // ─── AD-05-2/3 프로필 · 활동정보 ────────────────────────────────────────

    public AdminInterpreterResponse.Detail getDetail(UUID interpreterId, UserPrincipal principal) {
        return AdminInterpreterResponse.Detail.from(findInCenter(interpreterId, principal));
    }

    @Transactional
    public AdminInterpreterResponse.Detail updateProfile(UUID interpreterId,
                                                         AdminInterpreterRequest.UpdateProfile req,
                                                         UserPrincipal principal) {
        Interpreter interpreter = findInCenter(interpreterId, principal);
        interpreter.updateInfo(req.name(), req.phone(), req.role(), req.languages(), req.availabilityNote());
        interpreter.updateProfileByAdmin(req.gender(), req.nationality(),
                req.availableRegions(), req.availableTimes(), req.certifications(), req.careerNote());
        return AdminInterpreterResponse.Detail.from(interpreter);
    }

    // ─── AD-05-4 활동이력 ───────────────────────────────────────────────────

    /** 월별 통번역 시간 — months 미지정 시 최근 6개월 */
    public List<AdminInterpreterResponse.MonthlyActivity> getMonthlyActivity(
            UUID interpreterId, Integer months, UserPrincipal principal) {
        findInCenter(interpreterId, principal);
        int range = (months == null || months <= 0) ? DEFAULT_ACTIVITY_MONTHS : Math.min(months, 24);

        List<AdminInterpreterResponse.MonthlyActivity> result = new ArrayList<>();
        YearMonth cursor = YearMonth.now();
        for (int i = 0; i < range; i++) {
            LocalDateTime from = cursor.atDay(1).atStartOfDay();
            LocalDateTime to = cursor.atEndOfMonth().atTime(23, 59, 59);
            BigDecimal hours = consultationRepository
                    .sumDurationHoursByInterpreterIdAndDateTimeBetween(interpreterId, from, to);
            result.add(new AdminInterpreterResponse.MonthlyActivity(
                    cursor.getYear(), cursor.getMonthValue(),
                    consultationRepository.countByInterpreterIdAndDateBetween(interpreterId, from, to),
                    hours != null ? hours : BigDecimal.ZERO));
            cursor = cursor.minusMonths(1);
        }
        return result;
    }

    /** 통번역 이력 — 배정 확정된 진료를 최신순으로 */
    public List<AdminInterpreterResponse.ConsultationHistoryItem> getConsultations(
            UUID interpreterId, Pageable pageable, UserPrincipal principal) {
        findInCenter(interpreterId, principal);
        return consultationRepository.findByInterpreter_IdAndMatchingStatus(
                        interpreterId, MatchingStatus.ASSIGNED,
                        PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                                Sort.by(Sort.Direction.DESC, "consultationDate")))
                .map(AdminInterpreterResponse.ConsultationHistoryItem::from)
                .getContent();
    }

    /** 담당 환자 이력 (해제분 포함) */
    public List<AdminInterpreterResponse.AssignedPatient> getAssignedPatients(UUID interpreterId,
                                                                              UserPrincipal principal) {
        findInCenter(interpreterId, principal);
        return patientMatchRepository.findByInterpreterIdOrderByCreatedAtDesc(interpreterId).stream()
                .map(AdminInterpreterResponse.AssignedPatient::from)
                .toList();
    }

    // ─── AD-05-5 상태 관리 ──────────────────────────────────────────────────

    public AdminInterpreterResponse.StatusView getStatus(UUID interpreterId, UserPrincipal principal) {
        Interpreter interpreter = findInCenter(interpreterId, principal);
        YearMonth month = YearMonth.now();
        LocalDateTime from = month.atDay(1).atStartOfDay();
        LocalDateTime to = month.atEndOfMonth().atTime(23, 59, 59);
        BigDecimal hours = consultationRepository
                .sumDurationHoursByInterpreterIdAndDateTimeBetween(interpreterId, from, to);
        return new AdminInterpreterResponse.StatusView(
                interpreter.getId(), interpreter.isActive(),
                patientMatchRepository.countByInterpreterIdAndActiveTrue(interpreterId),
                consultationRepository.countByInterpreterIdAndDateBetween(interpreterId, from, to),
                hours != null ? hours : BigDecimal.ZERO);
    }

    @Transactional
    public AdminInterpreterResponse.StatusView updateStatus(UUID interpreterId,
                                                            AdminInterpreterRequest.UpdateStatus req,
                                                            UserPrincipal principal) {
        Interpreter interpreter = findInCenter(interpreterId, principal);
        if (req.active()) {
            interpreter.activate();
        } else {
            interpreter.deactivate();
        }
        return getStatus(interpreterId, principal);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private Interpreter findInCenter(UUID interpreterId, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        Interpreter interpreter = interpreterRepository.findById(interpreterId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(center.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "다른 센터 통번역가는 관리할 수 없습니다");
        }
        return interpreter;
    }
}
