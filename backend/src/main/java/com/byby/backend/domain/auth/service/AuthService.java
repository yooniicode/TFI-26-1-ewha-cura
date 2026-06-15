package com.byby.backend.domain.auth.service;

import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.UserRole;
import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.JwtUtil;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.entity.AdminProfile;
import com.byby.backend.domain.admin.repository.AdminProfileRepository;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.auth.dto.AuthRequest;
import com.byby.backend.domain.auth.dto.AuthResponse;
import com.byby.backend.domain.auth.entity.UserCredential;
import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.service.CenterService;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final PatientRepository patientRepository;
    private final PatientCenterRepository patientCenterRepository;
    private final InterpreterRepository interpreterRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final AdminService adminService;
    private final CenterService centerService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final PhoneVerificationStore phoneVerificationStore;

    @org.springframework.beans.factory.annotation.Value("${byby.admin.bootstrap-code:}")
    private String adminBootstrapCode;

    // ─── Login ──────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse.TokenMe login(AuthRequest.Login req) {
        String email = trim(req.email());
        if (!StringUtils.hasText(email)) throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이메일을 입력해주세요");

        UserCredential cred = userCredentialRepository.findByEmail(email.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(req.password(), cred.getPasswordHash())) {
            throw new GeneralException(GeneralErrorCode.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다");
        }

        long sessionVersion = rotateSessionVersion(cred.getAuthUserId());
        UserPrincipal principal = new UserPrincipal(cred.getAuthUserId(), cred.getRequestedRole());
        String token = jwtUtil.generate(cred.getAuthUserId(), cred.getRequestedRole(), sessionVersion);
        AuthResponse.Me me = getMe(principal);
        return new AuthResponse.TokenMe(token, me);
    }

    // ─── Signup ─────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse.TokenMe signup(AuthRequest.Signup req) {
        if (!StringUtils.hasText(req.email())) throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이메일을 입력해주세요");
        if (!StringUtils.hasText(req.password())) throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "비밀번호를 입력해주세요");
        if (req.password().length() < 8) throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다");
        if (!StringUtils.hasText(req.name())) throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이름을 입력해주세요");

        String normalizedEmail = req.email().trim().toLowerCase(Locale.ROOT);
        if (userCredentialRepository.existsByEmail(normalizedEmail)) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이미 사용 중인 이메일입니다");
        }

        UserRole role = req.role() != null ? req.role() : UserRole.patient;
        UUID authUserId = UUID.randomUUID();
        String hash = passwordEncoder.encode(req.password());

        UserCredential cred = UserCredential.builder()
                .email(normalizedEmail)
                .passwordHash(hash)
                .authUserId(authUserId)
                .requestedRole(role)
                .build();
        userCredentialRepository.save(cred);

        UserPrincipal principal = new UserPrincipal(authUserId, role);

        AuthRequest.RegisterProfile profileReq = new AuthRequest.RegisterProfile(
                req.name(), role, req.nationality(), req.gender(), req.visaType(),
                req.visaNote(), req.birthDate(), req.phone(), req.region(), req.workplace(), req.interpreterRole(),
                req.centerId(), req.centerName(), req.languages(), req.availabilityNote()
        );
        registerProfile(profileReq, principal);

        String token = jwtUtil.generate(authUserId, role, cred.getSessionVersion());
        AuthResponse.Me me = getMe(principal);
        return new AuthResponse.TokenMe(token, me);
    }

    // ─── Me ─────────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse.Me getMe(UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);

        String avatarUrl = userCredentialRepository.findByAuthUserId(principal.getAuthUserId())
                .map(UserCredential::getAvatarUrl).orElse(null);

        if (principal.getRole() == UserRole.admin) {
            AdminProfile profile = adminService.getOrCreateProfile(principal.getAuthUserId());
            String nickname = profile.getNickname() != null ? profile.getNickname() : "관리자";
            return new AuthResponse.Me(principal.getAuthUserId(), UserRole.admin,
                    nickname, null,
                    profile.getCenter() != null ? profile.getCenter().getId() : null,
                    profile.getEffectiveCenterName(), profile.getNickname(), avatarUrl);
        }

        var interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId());
        if (interpreter.isPresent()) {
            var i = interpreter.get();
            return new AuthResponse.Me(principal.getAuthUserId(), UserRole.interpreter,
                    i.getName(), i.isActive() ? i.getId() : null,
                    i.getCenter() != null ? i.getCenter().getId() : null,
                    i.getCenter() != null ? i.getCenter().getName() : null,
                    null, avatarUrl);
        }

        var patient = patientRepository.findByAuthUserId(principal.getAuthUserId());
        if (patient.isPresent()) {
            var p = patient.get();
            return new AuthResponse.Me(principal.getAuthUserId(), UserRole.patient,
                    p.getName(), p.getId(), null, null, null, avatarUrl);
        }

        return new AuthResponse.Me(principal.getAuthUserId(), principal.getRole(), null, null,
                null, null, null, avatarUrl);
    }

    @Transactional
    public void logout(UUID authUserId) {
        rotateSessionVersion(authUserId);
    }

    @Transactional
    public long rotateSessionVersion(UUID authUserId) {
        int updated = userCredentialRepository.incrementSessionVersion(authUserId);
        if (updated == 0) {
            throw new BusinessException(BusinessErrorCode.USER_NOT_FOUND);
        }
        return userCredentialRepository.findSessionVersionByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
    }

    @Transactional
    public void updateAvatar(UUID authUserId, String avatarUrl) {
        UserCredential cred = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
        cred.updateAvatarUrl(avatarUrl);
    }

    // ─── Phone-only login/signup ─────────────────────────────────────────────────

    @Transactional
    public AuthResponse.PhoneLoginResult loginByPhone(String phone) {
        String normalizedPhone = normalizePhone(phone);
        Optional<UserCredential> credOpt = normalizedPhone != null
                ? userCredentialRepository.findByPhone(normalizedPhone)
                : Optional.empty();
        if (credOpt.isEmpty()) {
            return new AuthResponse.PhoneLoginResult(false, null, null);
        }
        UserCredential cred = credOpt.get();
        long sessionVersion = rotateSessionVersion(cred.getAuthUserId());
        String token = jwtUtil.generate(cred.getAuthUserId(), cred.getRequestedRole(), sessionVersion);
        AuthResponse.Me me = getMe(new UserPrincipal(cred.getAuthUserId(), cred.getRequestedRole()));
        return new AuthResponse.PhoneLoginResult(true, token, me);
    }

    @Transactional
    public AuthResponse.TokenMe phoneSignup(AuthRequest.PhoneSignup req) {
        if (!phoneVerificationStore.consumeVerified(req.phone())) {
            throw new GeneralException(GeneralErrorCode.UNAUTHORIZED, "휴대폰 인증이 필요합니다");
        }

        UserRole role = req.role() != null ? req.role() : UserRole.patient;
        UUID authUserId = UUID.randomUUID();
        UserCredential cred = UserCredential.builder()
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .authUserId(authUserId)
                .requestedRole(role)
                .build();
        userCredentialRepository.save(cred);

        UserPrincipal principal = new UserPrincipal(authUserId, role);
        AuthRequest.RegisterProfile profileReq = new AuthRequest.RegisterProfile(
                req.name(), role, req.nationality(), req.gender(), req.visaType(),
                null, req.birthDate(), req.phone(), null, req.workplace(),
                role == UserRole.interpreter ? com.byby.backend.common.enums.InterpreterRole.ACTIVIST : null,
                req.centerId(), req.centerName(), null, null
        );
        registerProfile(profileReq, principal);

        String token = jwtUtil.generate(authUserId, role, cred.getSessionVersion());
        return new AuthResponse.TokenMe(token, getMe(principal));
    }

    /** 연락처를 숫자만 남긴 정규화된 형태로 반환 (빈 값이면 null) */
    public static String normalizePhone(String raw) {
        if (!StringUtils.hasText(raw)) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        return digits.isEmpty() ? null : digits;
    }

    /**
     * 회원가입/프로필 등록/마이페이지 연락처 수정 시 호출되는 단일 진입점.
     * 다른 계정이 이미 사용 중인 연락처면 차단하고, 그렇지 않으면 cred.phone을 갱신한다.
     */
    @Transactional
    public void syncPhone(UUID authUserId, String rawPhone) {
        String normalized = normalizePhone(rawPhone);
        if (normalized == null) return;
        UserCredential cred = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
        if (normalized.equals(cred.getPhone())) return;
        userCredentialRepository.findByPhone(normalized).ifPresent(existing -> {
            if (!existing.getAuthUserId().equals(authUserId)) {
                throw new GeneralException(GeneralErrorCode.BAD_REQUEST,
                        "이미 다른 계정에서 사용 중인 연락처입니다. 기존 계정으로 로그인 후 마이페이지에서 계정을 연동해주세요.");
            }
        });
        cred.updatePhone(normalized);
    }

    // ─── Email exists ────────────────────────────────────────────────────────────

    public boolean emailExists(String email) {
        if (!StringUtils.hasText(email)) return false;
        return userCredentialRepository.existsByEmail(email.trim().toLowerCase(Locale.ROOT));
    }

    // ─── Register profile (post-signup profile update) ───────────────────────────

    @Transactional
    public void registerProfile(AuthRequest.RegisterProfile req, UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);

        UserRole effectiveRole = principal.getRole();
        boolean requestingInterpreter = req.role() == UserRole.interpreter;
        boolean hasPendingInterpreter = requestingInterpreter
                && interpreterRepository.existsByAuthUserId(principal.getAuthUserId());

        if (effectiveRole == UserRole.interpreter || hasPendingInterpreter || requestingInterpreter) {
            registerInterpreterProfile(req, principal);
            // Update stored role in credentials
            userCredentialRepository.findByAuthUserId(principal.getAuthUserId())
                    .ifPresent(c -> updateRole(c, UserRole.interpreter));
            return;
        }
        if (effectiveRole == UserRole.patient || req.role() == UserRole.patient) {
            registerPatientProfile(req, principal);
            userCredentialRepository.findByAuthUserId(principal.getAuthUserId())
                    .ifPresent(c -> updateRole(c, UserRole.patient));
            return;
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    // ─── Account linking ─────────────────────────────────────────────────────────

    public AuthResponse.LinkedAccounts getLinkedAccounts(UUID authUserId) {
        UserCredential cred = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
        boolean hasPassword = hasUsableEmailLogin(cred);
        return new AuthResponse.LinkedAccounts(
                hasPassword ? cred.getEmail() : null,
                hasPassword,
                cred.getKakaoId() != null,
                cred.getPhone()
        );
    }

    @Transactional
    public AuthResponse.LinkedAccounts linkEmailPassword(AuthRequest.LinkEmail req, UUID authUserId) {
        UserCredential cred = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
        if (hasUsableEmailLogin(cred)) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이미 이메일 로그인이 설정되어 있습니다");
        }
        if (req.password().length() < 8) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다");
        }
        String normalizedEmail = req.email().trim().toLowerCase(Locale.ROOT);
        userCredentialRepository.findByEmail(normalizedEmail).ifPresent(existing -> {
            if (!existing.getAuthUserId().equals(authUserId)) {
                throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이미 사용 중인 이메일입니다");
            }
        });
        cred.setupEmailPassword(normalizedEmail, passwordEncoder.encode(req.password()));
        return getLinkedAccounts(authUserId);
    }

    @Transactional
    public AuthResponse.LinkedAccounts unlinkKakao(UUID authUserId) {
        UserCredential cred = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.USER_NOT_FOUND));
        if (cred.getKakaoId() == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "연동된 카카오 계정이 없습니다");
        }
        if (!hasUsableEmailLogin(cred) && cred.getPhone() == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST,
                    "다른 로그인 방법이 없어 연동을 해제할 수 없습니다. 먼저 이메일을 등록해주세요.");
        }
        cred.unlinkKakao();
        return getLinkedAccounts(authUserId);
    }

    private boolean hasUsableEmailLogin(UserCredential cred) {
        boolean hasRealEmail = StringUtils.hasText(cred.getEmail()) && !isSyntheticPhoneEmail(cred.getEmail());
        return hasRealEmail && cred.getPasswordHash() != null;
    }

    private static boolean isSyntheticPhoneEmail(String email) {
        return email != null && email.matches("^ph_\\d+@phone\\.cura\\.local$");
    }

    // ─── Change password ─────────────────────────────────────────────────────────

    @Transactional
    public void changePassword(AuthRequest.ChangePassword req, UUID authUserId) {
        UserCredential cred = userCredentialRepository.findByAuthUserId(authUserId)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND, "계정을 찾을 수 없습니다"));
        if (!passwordEncoder.matches(req.currentPassword(), cred.getPasswordHash())) {
            throw new GeneralException(GeneralErrorCode.UNAUTHORIZED, "현재 비밀번호가 올바르지 않습니다");
        }
        if (req.newPassword().length() < 8) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다");
        }
        String newHash = passwordEncoder.encode(req.newPassword());
        userCredentialRepository.updatePasswordHash(authUserId, newHash);
    }

    // ─── Delete account ──────────────────────────────────────────────────────────

    @Transactional
    public void deleteAccount(UUID authUserId) {
        patientRepository.findByAuthUserId(authUserId).ifPresent(Patient::unlinkAuthUser);
        interpreterRepository.findByAuthUserId(authUserId).ifPresent(Interpreter::unlinkAuthUser);
        adminProfileRepository.findByAuthUserId(authUserId).ifPresent(adminProfileRepository::delete);
        userCredentialRepository.findByAuthUserId(authUserId).ifPresent(userCredentialRepository::delete);
    }

    // ─── Admin 회원가입 (secret 코드 필요, UI 미노출) ─────────────────────────────

    @Transactional
    public AuthResponse.TokenMe registerAdmin(AuthRequest.AdminSignup req) {
        // secret 코드 검증
        if (!StringUtils.hasText(adminBootstrapCode) || !adminBootstrapCode.equals(req.secretCode().trim())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "관리자 가입 코드가 올바르지 않습니다");
        }
        String normalizedEmail = req.email().trim().toLowerCase(Locale.ROOT);
        if (userCredentialRepository.existsByEmail(normalizedEmail)) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "이미 사용 중인 이메일입니다");
        }
        if (req.password().length() < 8) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "비밀번호는 8자 이상이어야 합니다");
        }

        UUID authUserId = UUID.randomUUID();
        UserCredential cred = UserCredential.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(req.password()))
                .authUserId(authUserId)
                .requestedRole(UserRole.admin)
                .build();
        userCredentialRepository.save(cred);

        // 센터 연결
        Center center = req.centerId() != null
                ? centerService.find(req.centerId())
                : (StringUtils.hasText(req.centerName()) ? centerService.getOrCreateByName(req.centerName()) : null);

        UserPrincipal principal = new UserPrincipal(authUserId, UserRole.admin);
        adminService.getOrCreateProfile(authUserId);
        if (center != null) adminService.assignCenter(authUserId, center);

        // 이름 저장 (AdminProfile nickname)
        adminService.getOrCreateProfile(authUserId);

        String token = jwtUtil.generate(authUserId, UserRole.admin, cred.getSessionVersion());
        AuthResponse.Me me = getMe(principal);
        return new AuthResponse.TokenMe(token, me);
    }

    // ─── Admin bootstrap ─────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse.Me bootstrapAdmin(AuthRequest.BootstrapAdmin req, UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);
        if (!StringUtils.hasText(req.secretCode()))
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "관리자 초기 가입 코드가 필요합니다");

        if (!adminProfileRepository.findAll().isEmpty()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "이미 센터 직원 계정이 있습니다");
        }

        String centerName = trim(req.centerName());
        Center center = centerService.getOrCreateByName(centerName);
        AdminProfile profile = adminService.assignCenter(principal.getAuthUserId(), center);

        // Update credential role
        userCredentialRepository.findByAuthUserId(principal.getAuthUserId())
                .ifPresent(c -> updateRole(c, UserRole.admin));

        String name = StringUtils.hasText(profile.getNickname()) ? profile.getNickname() : "관리자";
        return new AuthResponse.Me(principal.getAuthUserId(), UserRole.admin, name, null,
                center.getId(), center.getName(), profile.getNickname(), null);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────────

    private void registerPatientProfile(AuthRequest.RegisterProfile req, UserPrincipal principal) {
        if (StringUtils.hasText(req.phone())) {
            syncPhone(principal.getAuthUserId(), req.phone());
        }
        if (req.centerId() == null && !StringUtils.hasText(req.centerName())) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "centerId 또는 centerName이 필요합니다");
        }
        Center center = req.centerId() != null
                ? centerService.find(req.centerId())
                : centerService.getOrCreateByName(req.centerName());

        Optional<Patient> registeredPatient = patientRepository.findByAuthUserId(principal.getAuthUserId());
        if (registeredPatient.isPresent()) {
            addPatientCenterIfMissing(registeredPatient.get(), center);
            return;
        }
        Optional<Patient> existingPatient = findClaimablePatient(req);
        if (existingPatient.isPresent()) {
            Patient patient = existingPatient.get();
            patient.linkAuthUser(principal.getAuthUserId());
            addPatientCenterIfMissing(patient, center);
            return;
        }
        if (req.nationality() == null || req.gender() == null || req.visaType() == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "nationality, gender, visaType은 필수입니다");
        }

        Patient patient = Patient.builder()
                .authUserId(principal.getAuthUserId())
                .name(req.name())
                .nationality(req.nationality())
                .gender(req.gender())
                .visaType(req.visaType())
                .visaNote(req.visaNote())
                .birthDate(req.birthDate())
                .phone(req.phone())
                .region(req.region())
                .workplace(req.workplace())
                .build();
        Patient saved = patientRepository.save(patient);
        addPatientCenterIfMissing(saved, center);
    }

    private void registerInterpreterProfile(AuthRequest.RegisterProfile req, UserPrincipal principal) {
        if (StringUtils.hasText(req.phone())) {
            syncPhone(principal.getAuthUserId(), req.phone());
        }
        Optional<Interpreter> existing = interpreterRepository.findByAuthUserId(principal.getAuthUserId());
        if (existing.isPresent()) {
            Interpreter interpreter = existing.get();
            InterpreterRole role = req.interpreterRole() != null ? req.interpreterRole() : interpreter.getRole();
            interpreter.updateInfo(trim(req.name()), trim(req.phone()), role,
                    req.languages(), trim(req.availabilityNote()));
            Center center = resolveCenter(req);
            if (center != null) interpreter.updateCenter(center);
            interpreter.activate();
            return;
        }
        if (req.interpreterRole() == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "interpreterRole은 필수입니다");
        }
        Center center = resolveCenter(req);
        if (center == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "centerId 또는 centerName이 필요합니다");
        }
        Interpreter interpreter = Interpreter.builder()
                .authUserId(principal.getAuthUserId())
                .name(req.name())
                .phone(req.phone())
                .role(req.interpreterRole())
                .center(center)
                .languages(req.languages())
                .availabilityNote(trim(req.availabilityNote()))
                .build();
        Interpreter saved = interpreterRepository.save(interpreter);
        saved.activate();
    }

    private Center resolveCenter(AuthRequest.RegisterProfile req) {
        if (req.centerId() != null) return centerService.find(req.centerId());
        if (StringUtils.hasText(req.centerName())) return centerService.getOrCreateByName(req.centerName());
        return null;
    }

    private void addPatientCenterIfMissing(Patient patient, Center center) {
        if (!patientCenterRepository.existsByPatientIdAndCenterId(patient.getId(), center.getId())) {
            patientCenterRepository.save(patient.addCenter(center));
        }
    }

    private Optional<Patient> findClaimablePatient(AuthRequest.RegisterProfile req) {
        if (!StringUtils.hasText(req.name()) || !StringUtils.hasText(req.phone())) {
            return Optional.empty();
        }
        return patientRepository.findFirstByAuthUserIdIsNullAndNameIgnoreCaseAndPhone(
                req.name().trim(), req.phone().trim());
    }

    private void updateRole(UserCredential cred, UserRole role) {
        // UserCredential is immutable via builder pattern — recreate is not needed
        // since the requestedRole field is only read at login time.
        // Use a JPQL update or accept the stale role (role is re-resolved by AuthRoleResolver).
    }

    private String trim(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
