package com.byby.backend.domain.admin.dto;

import com.byby.backend.common.enums.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class AdminRequest {

    public record UpdateProfile(
            UUID centerId,
            String centerName,
            String nickname
    ) {}

    public record WorkLogTask(
            @NotBlank String content,
            boolean checked
    ) {}

    public record UpsertWorkLog(
            @NotNull LocalDate workDate,
            String memo,
            @Valid List<WorkLogTask> tasks
    ) {}

    public record UpsertPatientMemo(
            String publicMemo,
            String privateMemo,
            boolean interpreterVisible
    ) {}

    /** AD-04 구성원 권한 변경 */
    public record UpdateMemberRole(
            @NotNull UserRole role
    ) {}
}
