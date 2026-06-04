package com.byby.backend.domain.auth.dto;

import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.UserRole;

import java.util.UUID;

public class AuthResponse {

    public record Me(
            UUID authUserId,
            UserRole role,
            String name,
            UUID entityId,
            UUID centerId,
            String centerName,
            String nickname
    ) {
        public Me(UUID authUserId, UserRole role, String name, UUID entityId) {
            this(authUserId, role, name, entityId, null, null, null);
        }
    }

    public record Member(
            UUID authUserId,
            String email,
            String name,
            String phone,
            UserRole role,
            InterpreterRole interpreterRole,
            UUID interpreterId,
            UUID centerId,
            String centerName,
            boolean profileRegistered,
            boolean approved
    ) {}

    public record EmailExists(
            boolean exists
    ) {}

    public record TokenMe(
            String token,
            Me me
    ) {}
}
