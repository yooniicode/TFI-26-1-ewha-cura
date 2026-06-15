package com.byby.backend.domain.consultation.dto;

import com.byby.backend.common.enums.ConsultationMethod;
import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.IssueType;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.ProcessingType;
import com.byby.backend.common.enums.VisaType;
import com.byby.backend.domain.consultation.entity.Consultation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class ConsultationResponse {

    public record Summary(
            UUID id,
            LocalDateTime consultationDate,
            UUID patientId,
            String patientName,
            Gender patientGender,
            UUID interpreterId,
            String interpreterName,
            String createdByName,
            String hospitalName,
            IssueType issueType,
            String workDescription,
            boolean confirmed,
            LocalDateTime createdAt,
            String patientAvatarUrl
    ) {
        public static Summary from(Consultation c) {
            return from(c, null);
        }

        public static Summary from(Consultation c, String patientAvatarUrl) {
            return new Summary(
                    c.getId(), c.getConsultationDate(),
                    c.getPatient().getId(), c.getPatient().getName(),
                    c.getPatient().getGender(),
                    c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getResolvedHospitalName(),
                    c.getIssueType(), c.getWorkDescription(),
                    c.isConfirmed(), c.getCreatedAt(), patientAvatarUrl);
        }
    }

    public record Detail(
            UUID id,
            LocalDateTime consultationDate,
            UUID patientId,
            String patientName,
            LocalDate patientBirthDate,
            Nationality patientNationality,
            Gender patientGender,
            VisaType patientVisaType,
            String patientRegion,
            String patientWorkplace,
            String patientPhone,
            UUID interpreterId,
            String interpreterName,
            String createdByName,
            UUID hospitalId,
            String hospitalName,
            String department,
            String doctorName,
            IssueType issueType,
            ConsultationMethod method,
            ProcessingType processing,
            String memo,
            String patientComment,
            String treatmentResult,
            String diagnosisContent,
            String diagnosisNameCode,
            String medicationInstruction,
            String counselorName,
            String workDescription,
            String doctorConfirmationSignature,
            BigDecimal durationHours,
            Integer fee,
            LocalDate nextAppointmentDate,
            LocalDate confirmedAt,
            String confirmedBy,
            String confirmedByPhone,
            boolean confirmed,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String patientAvatarUrl,
            boolean memoCompleted,
            boolean reportCompleted
    ) {
        public static Detail from(Consultation c) {
            return from(c, null);
        }

        public static Detail from(Consultation c, String patientAvatarUrl) {
            return new Detail(
                    c.getId(), c.getConsultationDate(),
                    c.getPatient().getId(), c.getPatient().getName(),
                    c.getPatient().getBirthDate(),
                    c.getPatient().getNationality(),
                    c.getPatient().getGender(),
                    c.getPatient().getVisaType(),
                    c.getPatient().getRegion(),
                    c.getPatient().getWorkplace(),
                    c.getPatient().getPhone(),
                    c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getHospital() != null ? c.getHospital().getId() : null,
                    c.getResolvedHospitalName(),
                    c.getDepartment(), c.getDoctorName(), c.getIssueType(), c.getMethod(), c.getProcessing(),
                    c.getMemo(), c.getPatientComment(), c.getTreatmentResult(),
                    c.getDiagnosisContent(), c.getDiagnosisNameCode(),
                    c.getMedicationInstruction(), c.getCounselorName(), c.getWorkDescription(),
                    c.getDoctorConfirmationSignature(), c.getDurationHours(), c.getFee(), c.getNextAppointmentDate(),
                    c.getConfirmedAt(), c.getConfirmedBy(), c.getConfirmedByPhone(),
                    c.isConfirmed(),
                    c.getCreatedAt(), c.getUpdatedAt(), patientAvatarUrl,
                    c.isMemoCompleted(), c.isReportCompleted());
        }
    }

    /** 센터 내 미배정 요청 목록용 — 통번역가 홈 "+" 화면에서 사용 */
    public record PendingItem(
            UUID id,
            LocalDateTime consultationDate,
            UUID patientId,
            String patientName,
            Gender patientGender,
            Nationality patientNationality,
            String patientComment,
            LocalDateTime createdAt,
            String patientAvatarUrl
    ) {
        public static PendingItem from(Consultation c) {
            return from(c, null);
        }

        public static PendingItem from(Consultation c, String patientAvatarUrl) {
            return new PendingItem(
                    c.getId(), c.getConsultationDate(),
                    c.getPatient().getId(), c.getPatient().getName(),
                    c.getPatient().getGender(), c.getPatient().getNationality(),
                    c.getPatientComment(), c.getCreatedAt(), patientAvatarUrl);
        }
    }

    // 이주민용 간소화 뷰 — 운영 정보(통역비, 확인자 등) 제외
    public record PatientView(
            UUID id,
            LocalDateTime consultationDate,
            UUID interpreterId,
            String interpreterName,
            String hospitalName,
            String department,
            String doctorName,
            String patientComment,
            String treatmentResult,
            String diagnosisContent,
            String diagnosisNameCode,
            String medicationInstruction,
            LocalDate nextAppointmentDate,
            String translationLang,
            String translatedPatientComment,
            String translatedDiagnosisContent,
            String translatedTreatmentResult,
            String translatedMedicationInstruction,
            String translatedDiagnosisNameCode
    ) {
        public static PatientView from(Consultation c) {
            return new PatientView(
                    c.getId(), c.getConsultationDate(),
                    c.getInterpreter() != null ? c.getInterpreter().getId() : null,
                    c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                    c.getResolvedHospitalName(),
                    c.getDepartment(), c.getDoctorName(), c.getPatientComment(),
                    c.getTreatmentResult(), c.getDiagnosisContent(), c.getDiagnosisNameCode(),
                    c.getMedicationInstruction(), c.getNextAppointmentDate(),
                    c.getTranslationLang(),
                    c.getTranslatedPatientComment(),
                    c.getTranslatedDiagnosisContent(),
                    c.getTranslatedTreatmentResult(),
                    c.getTranslatedMedicationInstruction(),
                    c.getTranslatedDiagnosisNameCode());
        }
    }
}
