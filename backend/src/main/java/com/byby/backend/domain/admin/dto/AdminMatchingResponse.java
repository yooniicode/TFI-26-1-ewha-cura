package com.byby.backend.domain.admin.dto;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.MatchingDisplayStatus;
import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.interpreter.entity.Interpreter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** AD-06 매칭 관리 응답 DTO */
public class AdminMatchingResponse {

    /** AD-06-1 요청 목록 — 날짜·언어·증상 확인 */
    public record RequestItem(
            UUID consultationId,
            LocalDateTime consultationDate,
            UUID patientId,
            String patientName,
            Gender patientGender,
            LocalDate patientBirthDate,
            Nationality patientNationality,
            String patientLanguageCode,
            String patientPhone,
            String symptom,
            String hospitalName,
            String department,
            MatchingStatus matchingStatus,
            MatchingDisplayStatus displayStatus,
            String matchingRejectReason,
            UUID interpreterId,
            String interpreterName,
            LocalDateTime assignedAt,
            LocalDateTime requestedAt
    ) {
        public static RequestItem from(Consultation c) {
            Nationality nationality = c.getPatient().getNationality();
            return new RequestItem(
                    c.getId(), c.getConsultationDate(),
                    c.getPatient().getId(), c.getPatient().getName(),
                    c.getPatient().getGender(), c.getPatient().getBirthDate(), nationality,
                    nationality != null ? nationality.getLanguageCode() : null,
                    c.getPatient().getPhone(),
                    c.getPatientComment(),
                    c.getResolvedHospitalName(), c.getDepartment(),
                    c.getMatchingStatus(), c.getDisplayStatus(), c.getMatchingRejectReason(),
                    c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getAssignedAt(), c.getCreatedAt());
        }
    }

    /** AD-06-2 배정 후보 — 언어·활동 가능 정보·현재 담당 부하·해당 환자와의 동행 횟수 */
    public record InterpreterCandidate(
            UUID interpreterId,
            String name,
            String phone,
            Gender gender,
            InterpreterRole role,
            List<String> languages,
            String availableRegions,
            String availableTimes,
            String availabilityNote,
            boolean active,
            boolean languageMatched,
            long companionCount,
            long activePatientCount,
            long monthlyAssignedCount,
            BigDecimal monthlyWorkHours
    ) {
        public static InterpreterCandidate from(Interpreter i, boolean languageMatched, long companionCount,
                                                long activePatientCount, long monthlyAssignedCount,
                                                BigDecimal monthlyWorkHours) {
            return new InterpreterCandidate(
                    i.getId(), i.getName(), i.getPhone(), i.getGender(), i.getRole(),
                    List.copyOf(i.getLanguages()),
                    i.getAvailableRegions(), i.getAvailableTimes(), i.getAvailabilityNote(),
                    i.isActive(), languageMatched, companionCount, activePatientCount, monthlyAssignedCount,
                    monthlyWorkHours != null ? monthlyWorkHours : BigDecimal.ZERO);
        }
    }

    /** AD-06-3 매칭 현황 요약 */
    public record StatusSummary(
            long assignedCount,
            long pendingCount,
            long rejectedCount
    ) {}

    /** AD-06-4 일정 캘린더 — 날짜별 배정 현황 */
    public record CalendarDay(
            LocalDate date,
            long totalCount,
            long assignedCount,
            long pendingCount,
            List<CalendarItem> items
    ) {}

    public record CalendarItem(
            UUID consultationId,
            LocalDateTime consultationDate,
            UUID patientId,
            String patientName,
            UUID interpreterId,
            String interpreterName,
            String hospitalName,
            MatchingStatus matchingStatus
    ) {
        public static CalendarItem from(Consultation c) {
            return new CalendarItem(
                    c.getId(), c.getConsultationDate(),
                    c.getPatient().getId(), c.getPatient().getName(),
                    c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getResolvedHospitalName(), c.getMatchingStatus());
        }
    }
}
