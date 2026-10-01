package com.byby.backend.domain.admin.dto;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.matching.entity.PatientMatch;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** AD-05 통번역가 관리 응답 DTO */
public class AdminInterpreterResponse {

    /** AD-05-1 목록·검색 — 활동 가능 여부 표시 */
    public record Item(
            UUID interpreterId,
            String name,
            String phone,
            InterpreterRole role,
            Gender gender,
            Nationality nationality,
            List<String> languages,
            boolean active,
            /** 누적 통번역 횟수 (배정 확정 진료) — 0이면 화면에서 "신규" */
            long totalConsultationCount,
            long activePatientCount,
            long monthlyConsultationCount,
            BigDecimal monthlyWorkHours
    ) {
        public static Item from(Interpreter i, long totalConsultationCount, long activePatientCount,
                                long monthlyConsultationCount, BigDecimal monthlyWorkHours) {
            return new Item(
                    i.getId(), i.getName(), i.getPhone(), i.getRole(),
                    i.getGender(), i.getNationality(), List.copyOf(i.getLanguages()), i.isActive(),
                    totalConsultationCount, activePatientCount, monthlyConsultationCount,
                    monthlyWorkHours != null ? monthlyWorkHours : BigDecimal.ZERO);
        }
    }

    /** 통번역 이력 한 줄 — 날짜 · 병원 · 이주민 */
    public record ConsultationHistoryItem(
            UUID consultationId,
            LocalDateTime consultationDate,
            String hospitalName,
            UUID patientId,
            String patientName
    ) {
        public static ConsultationHistoryItem from(Consultation c) {
            return new ConsultationHistoryItem(
                    c.getId(), c.getConsultationDate(), c.getResolvedHospitalName(),
                    c.getPatient().getId(), c.getPatient().getName());
        }
    }

    /** AD-05-2 프로필 + AD-05-3 활동정보 */
    public record Detail(
            UUID interpreterId,
            // AD-05-2 프로필
            String name,
            String phone,
            Gender gender,
            Nationality nationality,
            InterpreterRole role,
            List<String> languages,
            // AD-05-3 활동정보
            String availableRegions,
            String availableTimes,
            String certifications,
            String careerNote,
            String availabilityNote,
            UUID centerId,
            String centerName,
            boolean active,
            boolean accountLinked,
            LocalDateTime createdAt
    ) {
        public static Detail from(Interpreter i) {
            return new Detail(
                    i.getId(), i.getName(), i.getPhone(), i.getGender(), i.getNationality(),
                    i.getRole(), List.copyOf(i.getLanguages()),
                    i.getAvailableRegions(), i.getAvailableTimes(), i.getCertifications(),
                    i.getCareerNote(), i.getAvailabilityNote(),
                    i.getCenter() != null ? i.getCenter().getId() : null,
                    i.getCenter() != null ? i.getCenter().getName() : null,
                    i.isActive(), i.getAuthUserId() != null, i.getCreatedAt());
        }
    }

    /** AD-05-4 활동이력 — 월별 통번역 시간 */
    public record MonthlyActivity(
            int year,
            int month,
            long consultationCount,
            BigDecimal workHours
    ) {}

    /** AD-05-4 담당 환자 이력 (해제분 포함) */
    public record AssignedPatient(
            UUID matchId,
            UUID patientId,
            String patientName,
            Nationality patientNationality,
            boolean active,
            LocalDateTime assignedAt,
            LocalDateTime endedAt
    ) {
        public static AssignedPatient from(PatientMatch m) {
            return new AssignedPatient(
                    m.getId(), m.getPatient().getId(), m.getPatient().getName(),
                    m.getPatient().getNationality(), m.isActive(), m.getCreatedAt(), m.getEndedAt());
        }
    }

    /** AD-05-5 상태 관리 — 현재 활동 가능 여부 · 이번 달 배정 현황 */
    public record StatusView(
            UUID interpreterId,
            boolean active,
            long activePatientCount,
            long monthlyConsultationCount,
            BigDecimal monthlyWorkHours
    ) {}
}
