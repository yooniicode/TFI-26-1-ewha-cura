package com.byby.backend.domain.patient.dto;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.VisaType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class PatientRequest {

    public record Create(
            UUID authUserId,
            @NotBlank String name,
            @NotNull Nationality nationality,
            @NotNull Gender gender,
            @NotNull VisaType visaType,
            String visaNote,
            LocalDate birthDate,
            String phone,
            String region,
            List<UUID> centerIds
    ) {}

    public record Update(
            String name,
            VisaType visaType,
            String visaNote,
            String phone,
            String region,
            String workplace
    ) {}
}
