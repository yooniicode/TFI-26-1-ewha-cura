package com.byby.backend.domain.consultation.dto;

import com.byby.backend.common.enums.ConsultationMethod;
import com.byby.backend.common.enums.IssueType;
import com.byby.backend.common.enums.ProcessingType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class ConsultationRequest {

    public record Create(
            @NotNull LocalDate consultationDate,
            @NotNull UUID patientId,
            UUID hospitalId,
            String hospitalName,
            String department,
            String doctorName,
            @NotNull IssueType issueType,
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
            LocalDate nextAppointmentDate
    ) {}

    public record Update(
            LocalDate consultationDate,
            UUID hospitalId,
            String hospitalName,
            IssueType issueType,
            ConsultationMethod method,
            ProcessingType processing,
            String memo,
            LocalDate nextAppointmentDate,
            String department,
            String doctorName,
            String patientComment,
            String treatmentResult,
            String diagnosisContent,
            String diagnosisNameCode,
            String medicationInstruction,
            String counselorName,
            String workDescription,
            String doctorConfirmationSignature,
            BigDecimal durationHours,
            Integer fee
    ) {}

    public record Confirm(
            @NotNull String confirmedBy,
            @NotNull String confirmedByPhone
    ) {}
}
