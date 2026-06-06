package com.byby.backend.domain.patient.dto;

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

public class PatientResponse {

    public record Summary(
            UUID id,
            String name,
            Nationality nationality,
            Gender gender,
            VisaType visaType,
            String region,
            boolean accountLinked,
            boolean assignedToMe,
            UUID activeInterpreterId,
            String activeInterpreterName,
            LocalDateTime createdAt,
            String avatarUrl
    ) {
        public static Summary from(Patient p) {
            return new Summary(p.getId(), p.getName(), p.getNationality(),
                    p.getGender(), p.getVisaType(), p.getRegion(),
                    p.getAuthUserId() != null, false, null, null, p.getCreatedAt(), null);
        }

        public static Summary from(Patient p, PatientMatch activeMatch, UUID currentInterpreterId) {
            UUID activeInterpreterId = activeMatch != null ? activeMatch.getInterpreter().getId() : null;
            String activeInterpreterName = activeMatch != null ? activeMatch.getInterpreter().getName() : null;
            return new Summary(p.getId(), p.getName(), p.getNationality(),
                    p.getGender(), p.getVisaType(), p.getRegion(),
                    p.getAuthUserId() != null,
                    activeInterpreterId != null && activeInterpreterId.equals(currentInterpreterId),
                    activeInterpreterId,
                    activeInterpreterName,
                    p.getCreatedAt(), null);
        }

        public static Summary from(Patient p, PatientMatch activeMatch, UUID currentInterpreterId, String avatarUrl) {
            UUID activeInterpreterId = activeMatch != null ? activeMatch.getInterpreter().getId() : null;
            String activeInterpreterName = activeMatch != null ? activeMatch.getInterpreter().getName() : null;
            return new Summary(p.getId(), p.getName(), p.getNationality(),
                    p.getGender(), p.getVisaType(), p.getRegion(),
                    p.getAuthUserId() != null,
                    activeInterpreterId != null && activeInterpreterId.equals(currentInterpreterId),
                    activeInterpreterId,
                    activeInterpreterName,
                    p.getCreatedAt(), avatarUrl);
        }
    }

    public record Detail(
            UUID id,
            String name,
            Nationality nationality,
            Gender gender,
            VisaType visaType,
            String visaNote,
            LocalDate birthDate,
            String phone,
            String region,
            List<CenterResponse.Summary> centers,
            boolean accountLinked,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String avatarUrl
    ) {
        public static Detail from(Patient p) {
            return from(p, null);
        }

        public static Detail from(Patient p, String avatarUrl) {
            List<CenterResponse.Summary> centerList = p.getPatientCenters().stream()
                    .map(pc -> CenterResponse.Summary.from(pc.getCenter()))
                    .toList();
            return new Detail(p.getId(), p.getName(), p.getNationality(), p.getGender(),
                    p.getVisaType(), p.getVisaNote(), p.getBirthDate(), p.getPhone(),
                    p.getRegion(), centerList, p.getAuthUserId() != null,
                    p.getCreatedAt(), p.getUpdatedAt(), avatarUrl);
        }
    }
}
