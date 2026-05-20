package com.byby.backend.common.security;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.admin.repository.AdminProfileRepository;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthRoleResolver {

    private final AdminProfileRepository adminProfileRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientRepository patientRepository;

    public UserPrincipal resolve(UserPrincipal principal) {
        UserRole role = resolveRole(principal);
        if (role == principal.getRole()) return principal;
        return new UserPrincipal(principal.getAuthUserId(), role);
    }

    private UserRole resolveRole(UserPrincipal principal) {
        UUID authUserId = principal.getAuthUserId();

        if (principal.isAdmin() || adminProfileRepository.findByAuthUserId(authUserId).isPresent()) {
            return UserRole.admin;
        }

        if (interpreterRepository.findByAuthUserId(authUserId)
                .map(Interpreter::isActive)
                .orElse(false)) {
            return UserRole.interpreter;
        }

        if (patientRepository.existsByAuthUserId(authUserId)) {
            return UserRole.patient;
        }

        return principal.getRole();
    }
}
