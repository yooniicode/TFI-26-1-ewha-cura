package com.byby.backend.domain.auth.dto;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.UserRole;
import com.byby.backend.common.enums.VisaType;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

public class AuthRequest {

    public record Login(
            @NotBlank String email,
            @NotBlank String password
    ) {}

    public record UpdateAvatar(
            @NotBlank String avatarUrl
    ) {}

    public record Signup(
            @NotBlank String email,
            @NotBlank String password,
            @NotBlank String name,
            UserRole role,
            Nationality nationality,
            Gender gender,
            VisaType visaType,
            String visaNote,
            String phone,
            String region,
            String workplace,
            InterpreterRole interpreterRole,
            UUID centerId,
            String centerName,
            List<String> languages,
            String availabilityNote
    ) {}

    public record RegisterProfile(
            @NotBlank String name,
            UserRole role,
            Nationality nationality,
            Gender gender,
            VisaType visaType,
            String visaNote,
            String phone,
            String region,
            String workplace,
            InterpreterRole interpreterRole,
            UUID centerId,
            String centerName,
            List<String> languages,
            String availabilityNote
    ) {}

    public record UpdateMemberRole(
            UserRole role,
            InterpreterRole interpreterRole,
            String name,
            String phone,
            UUID centerId,
            String centerName
    ) {}

    public record ChangePassword(
            @NotBlank String currentPassword,
            @NotBlank String newPassword
    ) {}

    public record BootstrapAdmin(
            @NotBlank String secretCode,
            String centerName
    ) {}

    /** 센터 담당자(admin) 회원가입 — UI 미노출, API + secretCode로만 가입 가능 */
    public record AdminSignup(
            @NotBlank String email,
            @NotBlank String password,
            @NotBlank String name,
            @NotBlank String secretCode,
            String centerName,
            UUID centerId
    ) {}

    public record PhoneRequest(@NotBlank String phone) {}

    public record PhoneVerify(
            @NotBlank String phone,
            @NotBlank String code
    ) {}

    public record PhoneSignup(
            @NotBlank String phone,
            @NotBlank String name,
            UserRole role,
            Gender gender,
            Nationality nationality,
            VisaType visaType,
            String workplace,
            UUID centerId,
            String centerName
    ) {}
}
