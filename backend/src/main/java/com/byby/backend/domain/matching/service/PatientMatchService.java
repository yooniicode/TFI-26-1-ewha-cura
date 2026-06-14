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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
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

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        Interpreter interpreter = interpreterRepository.findById(req.interpreterId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(adminCenter.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "같은 센터 통번역가에게만 매칭할 수 있습니다");
        }
        if (patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patient.getId(), interpreter.getId())) {
            return patientMatchRepository.findByPatientIdAndInterpreterIdAndActiveTrue(patient.getId(), interpreter.getId())
                    .map(MatchResponse.Detail::from)
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.MATCH_NOT_FOUND));
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

    public List<MatchResponse.Detail> getByPatient(UUID patientId, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Center adminCenter = adminService.getAdminCenter(principal);
        return patientMatchRepository.findByPatientIdAndActiveTrue(patientId).stream()
                .filter(match -> match.getInterpreter().getCenter() != null
                        && match.getInterpreter().getCenter().getId().equals(adminCenter.getId()))
                .map(MatchResponse.Detail::from)
                .toList();
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
    public void selfUnassign(UUID patientId, UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        patientMatchRepository.findByPatientIdAndInterpreterIdAndActiveTrue(patientId, interpreter.getId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.MATCH_NOT_FOUND))
                .deactivate();
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

        // 이미 나와 활성 매칭이면 그대로 반환 (idempotent)
        Optional<PatientMatch> myActiveMatch = patientMatchRepository
                .findByPatientIdAndInterpreterIdAndActiveTrue(patient.getId(), interpreter.getId());
        if (myActiveMatch.isPresent()) {
            return MatchResponse.Detail.from(myActiveMatch.get());
        }

        // 다른 통번역가가 이미 담당 중이면 충돌
        if (patientMatchRepository.existsByPatientIdAndActiveTrue(patient.getId())) {
            throw new BusinessException(BusinessErrorCode.MATCH_ALREADY_EXISTS);
        }

        try {
            PatientMatch newMatch = patientMatchRepository.saveAndFlush(PatientMatch.builder()
                    .patient(patient)
                    .interpreter(interpreter)
                    .build());
            return MatchResponse.Detail.from(newMatch);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 인해 그 사이 다른 트랜잭션이 먼저 매칭을 생성한 경우
            return patientMatchRepository.findByPatientIdAndInterpreterIdAndActiveTrue(patient.getId(), interpreter.getId())
                    .map(MatchResponse.Detail::from)
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.MATCH_ALREADY_EXISTS));
        }
    }

    public List<MatchResponse.Detail> getMyMatch(UserPrincipal principal) {
        if (!principal.isPatient()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        return patientMatchRepository.findByPatientIdAndActiveTrue(patient.getId()).stream()
                .map(MatchResponse.Detail::from)
                .toList();
    }

    public MatchResponse.AssignedCount getMyAssignedCount(UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        long count = patientMatchRepository.countByInterpreterIdAndActiveTrue(interpreter.getId());
        return new MatchResponse.AssignedCount(count);
    }
}
