package com.byby.backend.domain.admin.dto;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.VisaType;
import com.byby.backend.domain.center.dto.CenterResponse;
import com.byby.backend.domain.matching.entity.PatientMatch;
import com.byby.backend.domain.patient.entity.Patient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** AD-04 이주민 관리 응답 DTO */
public class AdminPatientResponse {

    /** AD-04-1 목록·검색 */
    public record Item(
            UUID patientId,
            String name,
            Nationality nationality,
            Gender gender,
            VisaType visaType,
            LocalDate birthDate,
            String phone,
            String region,
            String workplace,
            UUID activeInterpreterId,
            String activeInterpreterName,
            long consultationCount,
            LocalDateTime lastConsultationDate,
            boolean accountLinked,
            LocalDateTime createdAt
    ) {
        public static Item from(Patient p, PatientMatch activeMatch,
                                long consultationCount, LocalDateTime lastConsultationDate) {
            return new Item(
                    p.getId(), p.getName(), p.getNationality(), p.getGender(), p.getVisaType(),
                    p.getBirthDate(), p.getPhone(), p.getRegion(), p.getWorkplace(),
                    activeMatch != null ? activeMatch.getInterpreter().getId() : null,
                    activeMatch != null ? activeMatch.getInterpreter().getName() : null,
                    consultationCount, lastConsultationDate,
                    p.getAuthUserId() != null, p.getCreatedAt());
        }
    }

    /** AD-04-2 기본정보 + AD-04-3 거주정보 */
    public record Detail(
            UUID patientId,
            // AD-04-2 기본정보
            String name,
            LocalDate birthDate,
            Gender gender,
            Nationality nationality,
            VisaType visaType,
            String visaNote,
            String phone,
            // AD-04-3 거주정보
            String region,
            String workplace,
            List<CenterResponse.Summary> centers,
            UUID activeInterpreterId,
            String activeInterpreterName,
            boolean accountLinked,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static Detail from(Patient p, PatientMatch activeMatch) {
            return new Detail(
                    p.getId(), p.getName(), p.getBirthDate(), p.getGender(), p.getNationality(),
                    p.getVisaType(), p.getVisaNote(), p.getPhone(),
                    p.getRegion(), p.getWorkplace(),
                    p.getPatientCenters().stream()
                            .map(pc -> CenterResponse.Summary.from(pc.getCenter()))
                            .toList(),
                    activeMatch != null ? activeMatch.getInterpreter().getId() : null,
                    activeMatch != null ? activeMatch.getInterpreter().getName() : null,
                    p.getAuthUserId() != null, p.getCreatedAt(), p.getUpdatedAt());
        }
    }

    /** AD-04-4 이용이력 요약 */
    public record UsageSummary(
            UUID patientId,
            long totalCount,
            long completedCount,
            long pendingCount,
            LocalDateTime firstConsultationDate,
            LocalDateTime lastConsultationDate
    ) {}

    /** AD-04-5 담당 히스토리 — 담당 통번역가 변경 이력 */
    public record AssignmentHistoryItem(
            UUID matchId,
            UUID interpreterId,
            String interpreterName,
            String interpreterPhone,
            boolean active,
            UUID assignedByAuthUserId,
            LocalDateTime assignedAt,
            LocalDateTime endedAt
    ) {
        public static AssignmentHistoryItem from(PatientMatch m) {
            return new AssignmentHistoryItem(
                    m.getId(),
                    m.getInterpreter().getId(), m.getInterpreter().getName(), m.getInterpreter().getPhone(),
                    m.isActive(), m.getAssignedByAuthUserId(), m.getCreatedAt(), m.getEndedAt());
        }
    }
}
