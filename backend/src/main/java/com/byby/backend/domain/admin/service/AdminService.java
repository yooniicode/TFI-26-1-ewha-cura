package com.byby.backend.domain.admin.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.dto.AdminRequest;
import com.byby.backend.domain.admin.dto.AdminResponse;
import com.byby.backend.domain.admin.entity.AdminProfile;
import com.byby.backend.domain.admin.entity.AdminWorkLog;
import com.byby.backend.domain.admin.entity.AdminWorkLogTask;
import com.byby.backend.domain.admin.entity.CenterPatientMemo;
import com.byby.backend.domain.admin.repository.AdminProfileRepository;
import com.byby.backend.domain.admin.repository.AdminWorkLogRepository;
import com.byby.backend.domain.admin.repository.CenterPatientMemoRepository;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.service.CenterService;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final AdminProfileRepository adminProfileRepository;
    private final AdminWorkLogRepository adminWorkLogRepository;
    private final CenterPatientMemoRepository centerPatientMemoRepository;
    private final PatientRepository patientRepository;
    private final PatientCenterRepository patientCenterRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientMatchRepository patientMatchRepository;
    private final CenterService centerService;

    @Transactional
    public AdminResponse.Profile getProfile(UserPrincipal principal) {
        requireAdmin(principal);
        AdminProfile profile = getOrCreateProfile(principal.getAuthUserId());
        ensureCenterFromLegacyName(profile);
        return AdminResponse.Profile.from(profile);
    }

    @Transactional
    public AdminResponse.Profile updateProfile(AdminRequest.UpdateProfile req, UserPrincipal principal) {
        requireAdmin(principal);
        AdminProfile profile = getOrCreateProfile(principal.getAuthUserId());
        Center center = resolveCenter(req.centerId(), req.centerName());
        profile.update(center, trimToNull(req.nickname()));
        return AdminResponse.Profile.from(profile);
    }

    public Page<AdminResponse.WorkLog> getWorkLogs(LocalDate from, LocalDate to, Pageable pageable,
                                                   UserPrincipal principal) {
        requireAdmin(principal);
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(30);
        return adminWorkLogRepository
                .findByAuthUserIdAndWorkDateBetweenOrderByWorkDateDescCreatedAtDesc(
                        principal.getAuthUserId(), start, end, pageable)
                .map(AdminResponse.WorkLog::from);
    }

    @Transactional
    public AdminResponse.WorkLog createWorkLog(AdminRequest.UpsertWorkLog req, UserPrincipal principal) {
        requireAdmin(principal);
        AdminWorkLog log = AdminWorkLog.builder()
                .authUserId(principal.getAuthUserId())
                .workDate(req.workDate())
                .memo(trimToNull(req.memo()))
                .tasks(toTasks(req.tasks()))
                .build();
        return AdminResponse.WorkLog.from(adminWorkLogRepository.save(log));
    }

    @Transactional
    public AdminResponse.WorkLog updateWorkLog(UUID id, AdminRequest.UpsertWorkLog req, UserPrincipal principal) {
        requireAdmin(principal);
        AdminWorkLog log = adminWorkLogRepository.findById(id)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        if (!log.getAuthUserId().equals(principal.getAuthUserId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        log.update(req.workDate(), trimToNull(req.memo()), toTasks(req.tasks()));
        return AdminResponse.WorkLog.from(log);
    }

    @Transactional
    public void deleteWorkLog(UUID id, UserPrincipal principal) {
        requireAdmin(principal);
        AdminWorkLog log = adminWorkLogRepository.findById(id)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        if (!log.getAuthUserId().equals(principal.getAuthUserId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        adminWorkLogRepository.delete(log);
    }

    public Page<AdminResponse.PatientMemo> getPatientMemos(UUID patientId, Pageable pageable, UserPrincipal principal) {
        requireStaffOrInterpreter(principal);
        if (principal.isAdmin()) {
            return centerPatientMemoRepository.findByPatientIdOrderByCreatedAtDesc(patientId, pageable)
                    .map(memo -> AdminResponse.PatientMemo.from(memo, true));
        }
        requireAssignedInterpreter(patientId, principal);
        return centerPatientMemoRepository
                .findByPatientIdAndInterpreterVisibleTrueOrderByCreatedAtDesc(patientId, pageable)
                .map(memo -> AdminResponse.PatientMemo.from(memo, false));
    }

    @Transactional
    public AdminResponse.PatientMemo createPatientMemo(UUID patientId, AdminRequest.UpsertPatientMemo req,
                                                       UserPrincipal principal) {
        requireStaffOrInterpreter(principal);
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        boolean isAdmin = principal.isAdmin();
        if (!isAdmin) {
            requireAssignedInterpreter(patientId, principal);
        }
        CenterPatientMemo memo = CenterPatientMemo.builder()
                .adminAuthUserId(principal.getAuthUserId())
                .patient(patient)
                .publicMemo(trimToNull(req.publicMemo()))
                .privateMemo(isAdmin ? trimToNull(req.privateMemo()) : null)
                .interpreterVisible(isAdmin ? req.interpreterVisible() : true)
                .build();
        return AdminResponse.PatientMemo.from(centerPatientMemoRepository.save(memo), isAdmin);
    }

    @Transactional
    public AdminResponse.PatientMemo updatePatientMemo(UUID memoId, AdminRequest.UpsertPatientMemo req,
                                                       UserPrincipal principal) {
        requireStaffOrInterpreter(principal);
        CenterPatientMemo memo = centerPatientMemoRepository.findById(memoId)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        boolean isAdmin = principal.isAdmin();
        if (!isAdmin && !memo.getAdminAuthUserId().equals(principal.getAuthUserId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        memo.update(trimToNull(req.publicMemo()),
                isAdmin ? trimToNull(req.privateMemo()) : null,
                isAdmin ? req.interpreterVisible() : true);
        return AdminResponse.PatientMemo.from(memo, isAdmin);
    }

    public AdminResponse.CenterStats getStats(UserPrincipal principal) {
        Center center = getAdminCenter(principal);
        long patients     = patientCenterRepository.countByCenterId(center.getId());
        long interpreters = interpreterRepository.countByCenter_IdAndActiveTrue(center.getId());
        long matches      = patientMatchRepository.countActiveByInterpreterCenter(center.getId());
        return new AdminResponse.CenterStats(patients, interpreters, matches);
    }

    @Transactional
    public void deletePatientMemo(UUID memoId, UserPrincipal principal) {
        requireStaffOrInterpreter(principal);
        CenterPatientMemo memo = centerPatientMemoRepository.findById(memoId)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        if (!principal.isAdmin() && !memo.getAdminAuthUserId().equals(principal.getAuthUserId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        centerPatientMemoRepository.delete(memo);
    }

    @Transactional
    public AdminProfile getOrCreateProfile(UUID authUserId) {
        return adminProfileRepository.findByAuthUserId(authUserId)
                .orElseGet(() -> adminProfileRepository.save(AdminProfile.builder()
                        .authUserId(authUserId)
                        .nickname("관리자")
                        .build()));
    }

    @Transactional
    public AdminProfile assignCenter(UUID authUserId, Center center) {
        AdminProfile profile = getOrCreateProfile(authUserId);
        profile.update(center, profile.getNickname());
        return profile;
    }

    @Transactional
    public Center getAdminCenter(UserPrincipal principal) {
        requireAdmin(principal);
        AdminProfile profile = getOrCreateProfile(principal.getAuthUserId());
        ensureCenterFromLegacyName(profile);
        if (profile.getCenter() == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "센터 정보를 먼저 설정해주세요");
        }
        return profile.getCenter();
    }

    private Center resolveCenter(UUID centerId, String centerName) {
        if (centerId != null) return centerService.find(centerId);
        if (StringUtils.hasText(centerName)) return centerService.getOrCreateByName(centerName);
        return null;
    }

    private void ensureCenterFromLegacyName(AdminProfile profile) {
        if (profile.getCenter() == null && StringUtils.hasText(profile.getCenterName())) {
            profile.update(centerService.getOrCreateByName(profile.getCenterName()), profile.getNickname());
        }
    }

    private void requireAdmin(UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    private void requireStaffOrInterpreter(UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);
        if (!principal.isAdmin() && !principal.isInterpreter()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
    }

    private void requireAssignedInterpreter(UUID patientId, UserPrincipal principal) {
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (!patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patientId, interpreter.getId())) {
            throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        }
    }

    private List<AdminWorkLogTask> toTasks(List<AdminRequest.WorkLogTask> tasks) {
        if (tasks == null) return List.of();
        return tasks.stream()
                .filter(t -> StringUtils.hasText(t.content()))
                .map(t -> new AdminWorkLogTask(t.content().trim(), t.checked()))
                .toList();
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
