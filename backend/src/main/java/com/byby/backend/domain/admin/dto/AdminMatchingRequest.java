package com.byby.backend.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/** AD-06 매칭 관리 요청 DTO */
public class AdminMatchingRequest {

    /**
     * AD-06-2 통번역가 배정.
     * consultationDate 를 주면 확정 일시로 갱신하고,
     * createMatch 가 true(기본)면 담당(PatientMatch)까지 함께 배정한다.
     */
    public record Assign(
            @NotNull UUID interpreterId,
            LocalDateTime consultationDate,
            Boolean createMatch
    ) {
        public boolean shouldCreateMatch() {
            return createMatch == null || createMatch;
        }
    }

    /** AD-06-3 요청 거절 */
    public record Reject(
            @NotBlank String reason
    ) {}
}
