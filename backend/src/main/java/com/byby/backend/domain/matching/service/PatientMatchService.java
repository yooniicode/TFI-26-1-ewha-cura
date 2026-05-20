package com.byby.backend.domain.matching.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.dto.MatchRequest;
import com.byby.backend.domain.matching.dto.MatchResponse;
import com.byby.backend.domain.matching.entity.PatientMatch;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientMatchService {

    private final PatientMatchRepository patientMatchRepository;
    private final PatientRepository patientRepository;
    private final PatientCenterRepository patientCenterRepository;
    private final InterpreterRepository interpreterRepository;
    private final AdminService adminService;

    @Transactional
    public MatchResponse.Detail create(MatchRequest.Create req, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Center adminCenter = adminService.getAdminCenter(principal);

        // 기존 활성 매칭이 있으면 비활성화
        patientMatchRepository.findByPatientIdAndActiveTrue(req.patientId())
                .ifPresent(PatientMatch::deactivate);

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        Interpreter interpreter = interpreterRepository.findById(req.interpreterId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(adminCenter.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "같은 센터 통번역가에게만 매칭할 수 있습니다");
        }

        PatientMatch match = PatientMatch.builder()
                .patient(patient)
                .interpreter(interpreter)
                .build();
        return MatchResponse.Detail.from(patientMatchRepository.save(match));
    }

    public Page<MatchResponse.Detail> getAll(Pageable pageable, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Center adminCenter = adminService.getAdminCenter(principal);
        return patientMatchRepository.findActiveByInterpreterCenter(adminCenter.getId(), pageable)
                .map(MatchResponse.Detail::from);
    }

    public MatchResponse.Detail getByPatient(UUID patientId, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Center adminCenter = adminService.getAdminCenter(principal);
        return patientMatchRepository.findByPatientIdAndActiveTrue(patientId)
                .filter(match -> match.getInterpreter().getCenter() != null
                        && match.getInterpreter().getCenter().getId().equals(adminCenter.getId()))
                .map(MatchResponse.Detail::from)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.MATCH_NOT_FOUND));
    }

    @Transactional
    public void deactivate(UUID matchId, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        PatientMatch match = patientMatchRepository.findById(matchId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.MATCH_NOT_FOUND));
        Center adminCenter = adminService.getAdminCenter(principal);
        if (match.getInterpreter().getCenter() == null
                || !match.getInterpreter().getCenter().getId().equals(adminCenter.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "다른 센터 매칭은 해제할 수 없습니다");
        }
        match.deactivate();
    }

    public boolean isAssigned(UUID patientId, UUID interpreterId) {
        return patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patientId, interpreterId);
    }

    @Transactional
    public MatchResponse.Detail selfAssign(UUID patientId, UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (!interpreter.isActive()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        Center center = interpreter.getCenter();
        if (center == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "근무 센터 정보가 필요합니다");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        if (!patientCenterRepository.existsByPatientIdAndCenterId(patient.getId(), center.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "같은 센터 이주민만 담당 등록할 수 있습니다");
        }

        return patientMatchRepository.findByPatientIdAndActiveTrue(patient.getId())
                .map(activeMatch -> {
                    if (activeMatch.getInterpreter().getId().equals(interpreter.getId())) {
                        return activeMatch;
                    }
                    activeMatch.deactivate();
                    return patientMatchRepository.save(PatientMatch.builder()
                            .patient(patient)
                            .interpreter(interpreter)
                            .build());
                })
                .map(MatchResponse.Detail::from)
                .orElseGet(() -> MatchResponse.Detail.from(patientMatchRepository.save(PatientMatch.builder()
                        .patient(patient)
                        .interpreter(interpreter)
                        .build())));
    }

    public MatchResponse.Detail getMyMatch(UserPrincipal principal) {
        if (!principal.isPatient()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        return patientMatchRepository.findByPatientIdAndActiveTrue(patient.getId())
                .map(MatchResponse.Detail::from)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.MATCH_NOT_FOUND));
    }

    public MatchResponse.AssignedCount getMyAssignedCount(UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        long count = patientMatchRepository.countByInterpreterIdAndActiveTrue(interpreter.getId());
        return new MatchResponse.AssignedCount(count);
    }
}
