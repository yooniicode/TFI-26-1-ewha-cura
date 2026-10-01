package com.byby.backend.domain.admin.dto;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.Nationality;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** AD-05 통번역가 관리 요청 DTO */
public class AdminInterpreterRequest {

    /** AD-05-2 프로필 + AD-05-3 활동정보 수정 */
    public record UpdateProfile(
            String name,
            String phone,
            InterpreterRole role,
            Gender gender,
            Nationality nationality,
            List<String> languages,
            String availabilityNote,
            String availableRegions,
            String availableTimes,
            String certifications,
            String careerNote
    ) {}

    /** AD-05-5 상태 관리 — 현재 활동 가능 여부 */
    public record UpdateStatus(
            @NotNull Boolean active
    ) {}
}
