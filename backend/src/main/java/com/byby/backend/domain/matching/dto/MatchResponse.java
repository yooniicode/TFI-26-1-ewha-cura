package com.byby.backend.domain.matching.dto;

import com.byby.backend.domain.matching.entity.PatientMatch;

import java.time.LocalDateTime;
import java.util.UUID;

public class MatchResponse {

    public record AssignedCount(long count) {}

    public record Detail(
            UUID id,
            UUID patientId,
            String patientName,
            UUID interpreterId,
            String interpreterName,
            boolean active,
            LocalDateTime createdAt
    ) {
        public static Detail from(PatientMatch m) {
            return new Detail(
                    m.getId(),
                    m.getPatient().getId(),
                    m.getPatient().getName(),
                    m.getInterpreter().getId(),
                    m.getInterpreter().getName(),
                    m.isActive(),
                    m.getCreatedAt());
        }
    }
}
