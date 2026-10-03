package com.byby.backend.domain.center.dto;

import com.byby.backend.domain.center.entity.Center;

import java.util.UUID;

public class CenterResponse {

    public record Summary(
            UUID id,
            String name,
            String address,
            String phone,
            boolean active
    ) {
        public static Summary from(Center center) {
            return new Summary(center.getId(), center.getName(), center.getAddress(),
                    center.getPhone(), center.isActive());
        }
    }

    /** 센터 등록과 함께 발급한 관리자 계정 — 비밀번호는 이 응답에서만 확인할 수 있다. */
    public record WithAdmin(
            Summary center,
            String adminEmail,
            String adminPassword
    ) {}
}
