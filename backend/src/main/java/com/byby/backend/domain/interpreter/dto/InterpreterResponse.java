package com.byby.backend.domain.interpreter.dto;

import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.domain.interpreter.entity.Interpreter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class InterpreterResponse {

    public record Summary(
            UUID id,
            String name,
            String phone,
            InterpreterRole role,
            UUID centerId,
            String centerName,
            List<String> languages,
            String availabilityNote,
            BigDecimal monthlyWorkHours,
            boolean active
    ) {
        public static Summary from(Interpreter i) {
            return from(i, BigDecimal.ZERO);
        }

        public static Summary from(Interpreter i, BigDecimal monthlyWorkHours) {
            return new Summary(i.getId(), i.getName(), i.getPhone(), i.getRole(),
                    i.getCenter() != null ? i.getCenter().getId() : null,
                    i.getCenter() != null ? i.getCenter().getName() : null,
                    List.copyOf(i.getLanguages()), i.getAvailabilityNote(),
                    monthlyWorkHours != null ? monthlyWorkHours : BigDecimal.ZERO,
                    i.isActive());
        }
    }

    public record Detail(
            UUID id,
            String name,
            String phone,
            InterpreterRole role,
            UUID centerId,
            String centerName,
            List<String> languages,
            String availabilityNote,
            boolean active,
            LocalDateTime createdAt
    ) {
        public static Detail from(Interpreter i) {
            return new Detail(i.getId(), i.getName(), i.getPhone(), i.getRole(),
                    i.getCenter() != null ? i.getCenter().getId() : null,
                    i.getCenter() != null ? i.getCenter().getName() : null,
                    List.copyOf(i.getLanguages()), i.getAvailabilityNote(), i.isActive(), i.getCreatedAt());
        }
    }
}
