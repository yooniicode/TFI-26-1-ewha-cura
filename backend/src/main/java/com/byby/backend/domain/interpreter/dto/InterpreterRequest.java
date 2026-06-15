package com.byby.backend.domain.interpreter.dto;

import com.byby.backend.common.enums.InterpreterRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class InterpreterRequest {

    public record Create(
            @NotNull UUID authUserId,
            @NotBlank String name,
            String phone,
            @NotNull InterpreterRole role,
            UUID centerId,
            String centerName,
            List<String> languages,
            String availabilityNote
    ) {}

    public record Update(
            String name,
            String phone,
            InterpreterRole role,
            List<String> languages,
            String availabilityNote
    ) {}
}
