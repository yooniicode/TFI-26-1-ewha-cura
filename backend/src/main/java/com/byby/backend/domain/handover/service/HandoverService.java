package com.byby.backend.domain.handover.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.handover.dto.HandoverRequest;
import com.byby.backend.domain.handover.dto.HandoverResponse;
import com.byby.backend.domain.handover.entity.Handover;
import com.byby.backend.domain.handover.repository.HandoverRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HandoverService {

    private final HandoverRepository handoverRepository;
    private final PatientRepository patientRepository;
    private final InterpreterRepository interpreterRepository;
    private final ConsultationRepository consultationRepository;
    private final PatientMatchRepository patientMatchRepository;
    private final AdminService adminService;

    @Transactional
    public HandoverResponse.Detail create(HandoverRequest.Create req, UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        Interpreter fromInterpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (!patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patient.getId(), fromInterpreter.getId())) {
            throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        }
        Consultation consultation = req.consultationId() != null
                ? consultationRepository.findById(req.consultationId()).orElse(null)
                : null;

        Handover handover = Handover.builder()
                .patient(patient)
                .fromInterpreter(fromInterpreter)
                .consultation(consultation)
                .reason(req.reason())
                .notes(req.notes())
                .build();
        return HandoverResponse.Detail.from(handoverRepository.save(handover));
    }

    public Page<HandoverResponse.Detail> getByPatient(UUID patientId, Pageable pageable, UserPrincipal principal) {
        if (!principal.isAdmin() && !principal.isInterpreter()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            if (!patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patientId, interpreter.getId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
            }
        }
        return handoverRepository.findByPatientIdOrderByCreatedAtDesc(patientId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()))
                .map(HandoverResponse.Detail::from);
    }

    @Transactional
    public HandoverResponse.Detail assign(UUID id, HandoverRequest.Assign req, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);

        Handover handover = handoverRepository.findById(id)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.HANDOVER_NOT_FOUND));
        if (handover.getToInterpreter() != null) {
            throw new BusinessException(BusinessErrorCode.HANDOVER_ALREADY_ASSIGNED);
        }

        Interpreter toInterpreter = interpreterRepository.findById(req.toInterpreterId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        Center adminCenter = adminService.getAdminCenter(principal);
        if (toInterpreter.getCenter() == null || !toInterpreter.getCenter().getId().equals(adminCenter.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "같은 센터 통번역가에게만 배정할 수 있습니다");
        }
        handover.assign(toInterpreter);

        // PatientMatch 업데이트: fromInterpreter의 매칭을 새 통번역가로 변경
        patientMatchRepository.findByPatientIdAndInterpreterIdAndActiveTrue(
                handover.getPatient().getId(), handover.getFromInterpreter().getId())
                .ifPresent(match -> match.reassign(toInterpreter));

        return HandoverResponse.Detail.from(handover);
    }
}
