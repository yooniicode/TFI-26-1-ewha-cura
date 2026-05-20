package com.byby.backend.domain.patient.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.repository.CenterRepository;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.dto.PatientRequest;
import com.byby.backend.domain.patient.dto.PatientResponse;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientService {

    private final PatientRepository patientRepository;
    private final PatientCenterRepository patientCenterRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientMatchRepository patientMatchRepository;
    private final CenterRepository centerRepository;
    private final AdminService adminService;

    @Transactional
    public PatientResponse.Detail create(PatientRequest.Create req, UserPrincipal principal) {
        if (!principal.isAdmin() && !principal.isPatient()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        Center adminCenter = principal.isAdmin() ? adminService.getAdminCenter(principal) : null;
        UUID authUserId = principal.isAdmin() ? req.authUserId() : principal.getAuthUserId();
        if (authUserId != null && patientRepository.existsByAuthUserId(authUserId)) {
            throw new BusinessException(BusinessErrorCode.PATIENT_ALREADY_EXISTS);
        }
        Patient patient = Patient.builder()
                .authUserId(authUserId)
                .name(req.name())
                .nationality(req.nationality())
                .gender(req.gender())
                .visaType(req.visaType())
                .visaNote(req.visaNote())
                .birthDate(req.birthDate())
                .phone(req.phone())
                .region(req.region())
                .build();
        Patient saved = patientRepository.save(patient);
        if (req.centerIds() != null && !req.centerIds().isEmpty()) {
            req.centerIds().stream().distinct().forEach(centerId ->
                    centerRepository.findById(centerId).ifPresent(center ->
                            patientCenterRepository.save(saved.addCenter(center))));
        } else if (adminCenter != null) {
            patientCenterRepository.save(saved.addCenter(adminCenter));
        }
        return PatientResponse.Detail.from(saved);
    }

    public Page<PatientResponse.Summary> getAll(String query, Pageable pageable, UserPrincipal principal) {
        if (principal.isAdmin()) {
            Center adminCenter = adminService.getAdminCenter(principal);
            return patientRepository.searchByCenterIdentity(
                            adminCenter.getId(),
                            adminCenter.getName(),
                            compactCenterName(adminCenter.getName()),
                            query,
                            pageable)
                    .map(PatientResponse.Summary::from);
        }
        if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            Center center = interpreter.getCenter();
            if (center == null) {
                throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "근무 센터 정보가 필요합니다");
            }
            return patientRepository.searchByCenterIdentity(
                            center.getId(),
                            center.getName(),
                            compactCenterName(center.getName()),
                            query,
                            pageable)
                    .map(patient -> PatientResponse.Summary.from(
                            patient,
                            patientMatchRepository.findByPatientIdAndActiveTrue(patient.getId()).orElse(null),
                            interpreter.getId()));
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    public PatientResponse.Detail getById(UUID id, UserPrincipal principal) {
        Patient patient = findPatient(id);
        checkPatientAccess(patient, principal);
        return PatientResponse.Detail.from(patient);
    }

    @Transactional
    public PatientResponse.Detail update(UUID id, PatientRequest.Update req, UserPrincipal principal) {
        Patient patient = findPatient(id);
        
        // admin is allowed to update any patient
        if (!principal.isAdmin()) {
            // Check if patient updates themselves
            if (!principal.isPatient() || !principal.getAuthUserId().equals(patient.getAuthUserId())) {
                throw new GeneralException(GeneralErrorCode.FORBIDDEN);
            }
        }
        
        patient.updateInfo(req.name(), req.phone(), req.region(), req.visaNote(), req.visaType());
        return PatientResponse.Detail.from(patient);
    }

    @Transactional
    public PatientResponse.Detail addMyCenter(UUID centerId, UserPrincipal principal) {
        if (principal == null) {
            throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);
        }
        if (!principal.isPatient()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        return addCenterToPatient(patient, centerId);
    }

    @Transactional
    public PatientResponse.Detail addCenter(UUID patientId, UUID centerId, UserPrincipal principal) {
        Patient patient = findPatient(patientId);
        if (principal.isPatient()) {
            if (!principal.getAuthUserId().equals(patient.getAuthUserId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
        } else if (!principal.isAdmin()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        return addCenterToPatient(patient, centerId);
    }

    @Transactional
    public PatientResponse.Detail removeCenter(UUID patientId, UUID centerId, UserPrincipal principal) {
        if (!principal.isAdmin()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        patientCenterRepository.findByPatientIdAndCenterId(patientId, centerId)
                .ifPresent(patientCenterRepository::delete);
        return PatientResponse.Detail.from(findPatient(patientId));
    }

    private Patient findPatient(UUID id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
    }

    private String compactCenterName(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[\\s-]+", "");
    }

    private PatientResponse.Detail addCenterToPatient(Patient patient, UUID centerId) {
        if (patientCenterRepository.existsByPatientIdAndCenterId(patient.getId(), centerId)) {
            throw new BusinessException(BusinessErrorCode.PATIENT_CENTER_ALREADY_EXISTS);
        }
        Center center = centerRepository.findById(centerId)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        patientCenterRepository.save(patient.addCenter(center));
        return PatientResponse.Detail.from(patient);
    }

    private void checkPatientAccess(Patient patient, UserPrincipal principal) {
        if (principal.isAdmin()) return;
        if (principal.isPatient()) {
            if (!principal.getAuthUserId().equals(patient.getAuthUserId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
            return;
        }
        if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            if (!patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(
                    patient.getId(), interpreter.getId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
            }
            return;
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }
}
