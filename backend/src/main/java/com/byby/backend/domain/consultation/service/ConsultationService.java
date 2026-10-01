package com.byby.backend.domain.consultation.service;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.audit.service.AuditService;
import com.byby.backend.domain.auth.entity.UserCredential;
import com.byby.backend.domain.auth.repository.UserCredentialRepository;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.repository.CenterRepository;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.consultation.dto.ConsultationRequest;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.hospital.entity.Hospital;
import com.byby.backend.domain.hospital.repository.HospitalRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;
    private final InterpreterRepository interpreterRepository;
    private final HospitalRepository hospitalRepository;
    private final PatientMatchRepository patientMatchRepository;
    private final AdminService adminService;
    private final PatientCenterRepository patientCenterRepository;
    private final UserCredentialRepository userCredentialRepository;
    private final CenterRepository centerRepository;
    private final TranslationService translationService;
    private final AuditService auditService;
    private final GoogleSheetsExportService googleSheetsExportService;
    private final com.byby.backend.domain.center.service.CenterService centerService;

    private String resolvePatientAvatarUrl(Patient patient) {
        if (patient.getAuthUserId() == null) return null;
        return userCredentialRepository.findByAuthUserId(patient.getAuthUserId())
                .map(UserCredential::getAvatarUrl)
                .orElse(null);
    }

    public record ExportData(
            UUID centerId,
            String centerName,
            String existingSpreadsheetId,
            List<ConsultationResponse.Detail> rows
    ) {}

    @Transactional
    public ConsultationResponse.Detail createByPatient(ConsultationRequest.Create req, UserPrincipal principal) {
        Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        if (!patient.getId().equals(req.patientId())) {
            throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
        }
        Consultation consultation = Consultation.builder()
                .consultationDate(req.consultationDate())
                .patient(patient)
                .issueType(req.issueType())
                .processing(req.processing())
                .patientComment(req.patientComment())
                .build();
        Consultation saved = consultationRepository.save(consultation);
        return ConsultationResponse.Detail.from(saved, resolvePatientAvatarUrl(saved.getPatient()));
    }

    @Transactional
    public ConsultationResponse.Detail create(ConsultationRequest.Create req, UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);

        Patient patient = patientRepository.findById(req.patientId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        boolean hasActiveMatch = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patient.getId(), interpreter.getId());
        boolean hasConsultation = consultationRepository.existsByPatientIdAndInterpreterId(patient.getId(), interpreter.getId());
        if (!hasActiveMatch && !hasConsultation) {
            throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        }
        Hospital hospital = req.hospitalId() != null
                ? hospitalRepository.findById(req.hospitalId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.HOSPITAL_NOT_FOUND))
                : null;

        Consultation consultation = Consultation.builder()
                .consultationDate(req.consultationDate())
                .patient(patient)
                .interpreter(interpreter)
                .hospital(hospital)
                .hospitalName(hospital == null ? req.hospitalName() : null)
                .department(req.department())
                .doctorName(req.doctorName())
                .issueType(req.issueType())
                .method(req.method())
                .processing(req.processing())
                .memo(req.memo())
                .patientComment(req.patientComment())
                .treatmentResult(req.treatmentResult())
                .diagnosisContent(req.diagnosisContent())
                .diagnosisNameCode(req.diagnosisNameCode())
                .medicationInstruction(req.medicationInstruction())
                .counselorName(req.counselorName())
                .workDescription(req.workDescription())
                .doctorConfirmationSignature(req.doctorConfirmationSignature())
                .durationHours(req.durationHours())
                .fee(req.fee())
                .nextAppointmentDate(req.nextAppointmentDate())
                .build();
        Consultation saved = consultationRepository.save(consultation);
        return ConsultationResponse.Detail.from(saved, resolvePatientAvatarUrl(saved.getPatient()));
    }

    public Page<ConsultationResponse.PendingItem> getPending(Pageable pageable, UserPrincipal principal) {
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (interpreter.getCenter() == null) return Page.empty(pageable);
        return consultationRepository.findPendingByCenter(interpreter.getCenter().getId(),
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()))
                .map(c -> ConsultationResponse.PendingItem.from(c, resolvePatientAvatarUrl(c.getPatient())));
    }

    @Transactional
    public ConsultationResponse.Detail accept(UUID id, ConsultationRequest.Accept req, UserPrincipal principal) {
        Consultation c = findConsultation(id);
        if (c.getInterpreter() != null) throw new BusinessException(BusinessErrorCode.CONSULTATION_ALREADY_ACCEPTED);

        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));

        boolean sameCenters = interpreter.getCenter() != null
                && c.getPatient().getPatientCenters().stream()
                    .anyMatch(pc -> pc.getCenter().getId().equals(interpreter.getCenter().getId()));
        if (!sameCenters) throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);

        c.accept(interpreter, req.consultationDate());
        Consultation saved = consultationRepository.save(c);
        return ConsultationResponse.Detail.from(saved, resolvePatientAvatarUrl(saved.getPatient()));
    }

    /** 센터장이 배정한 요청을 통번역가가 수락 → 배정 확정 */
    @Transactional
    public ConsultationResponse.Detail acceptAssignment(UUID id, UserPrincipal principal) {
        Consultation c = findAwaitingAssignmentOf(id, principal);
        c.acceptAssignment();
        return ConsultationResponse.Detail.from(c, resolvePatientAvatarUrl(c.getPatient()));
    }

    /** 센터장이 배정한 요청을 통번역가가 거절 → 센터에 '재배정 필요'로 표시 */
    @Transactional
    public void declineAssignment(UUID id, UserPrincipal principal) {
        Consultation c = findAwaitingAssignmentOf(id, principal);
        c.declineAssignment();
    }

    private Consultation findAwaitingAssignmentOf(UUID id, UserPrincipal principal) {
        Consultation c = findConsultation(id);
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        if (c.getInterpreter() == null || !c.getInterpreter().getId().equals(interpreter.getId())) {
            throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        }
        if (c.getMatchingStatus() != MatchingStatus.AWAITING_ACCEPTANCE) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "수락을 기다리는 배정이 아닙니다");
        }
        return c;
    }

    public Page<ConsultationResponse.Summary> getAll(Pageable pageable, UserPrincipal principal, String patientQuery) {
        if (principal.isAdmin()) {
            Center center = adminService.getAdminCenter(principal);
            return consultationRepository.searchByCenter(center.getId(), patientQuery, pageable)
                    .map(c -> ConsultationResponse.Summary.from(c, resolvePatientAvatarUrl(c.getPatient())));
        }
        if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            return consultationRepository.searchByInterpreter(interpreter.getId(), patientQuery, pageable)
                    .map(c -> ConsultationResponse.Summary.from(c, resolvePatientAvatarUrl(c.getPatient())));
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    public Object getById(UUID id, UserPrincipal principal) {
        Consultation c = findConsultation(id);
        checkAccess(c, principal);
        if (principal.isPatient()) {
            return ConsultationResponse.PatientView.from(c);
        }
        return ConsultationResponse.Detail.from(c, resolvePatientAvatarUrl(c.getPatient()));
    }

    @Transactional
    public ConsultationResponse.Detail update(UUID id, ConsultationRequest.Update req, UserPrincipal principal) {
        Consultation c = findConsultation(id);
        if (principal.isAdmin()) {
            requireAdminCenterAccess(c, principal);
        } else if (principal.isInterpreter()) {
            if (c.isConfirmed()) throw new BusinessException(BusinessErrorCode.CONSULTATION_ALREADY_CONFIRMED);
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            if (c.getInterpreter() == null || !c.getInterpreter().getId().equals(interpreter.getId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
        } else {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }

        Hospital hospital = req.hospitalId() != null
                ? hospitalRepository.findById(req.hospitalId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.HOSPITAL_NOT_FOUND))
                : c.getHospital();
        String freeHospitalName = (hospital == null) ? req.hospitalName() : null;
        c.update(req.consultationDate(), hospital, freeHospitalName, req.issueType(), req.method(), req.processing(),
                req.memo(), req.nextAppointmentDate(), req.nextAppointmentTime(), req.department(),
                req.doctorName(), req.patientComment(), req.treatmentResult(),
                req.diagnosisContent(), req.diagnosisNameCode(), req.medicationInstruction(),
                req.counselorName(), req.workDescription(), req.doctorConfirmationSignature(),
                req.durationHours(), req.fee(), req.memoCompleted(), req.reportCompleted());

        applyTranslationIfNeeded(c);

        Consultation updated = consultationRepository.save(c);
        return ConsultationResponse.Detail.from(updated, resolvePatientAvatarUrl(updated.getPatient()));
    }

    @Transactional
    public ConsultationResponse.Detail confirm(UUID id, ConsultationRequest.Confirm req, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Consultation c = findConsultation(id);
        requireAdminCenterAccess(c, principal);
        if (c.isConfirmed()) throw new BusinessException(BusinessErrorCode.CONSULTATION_ALREADY_CONFIRMED);
        c.confirm(req.confirmedBy(), req.confirmedByPhone());
        Consultation confirmed = consultationRepository.save(c);
        return ConsultationResponse.Detail.from(confirmed, resolvePatientAvatarUrl(confirmed.getPatient()));
    }

    public Page<ConsultationResponse.Detail> getByPatient(UUID patientId, Pageable pageable, UserPrincipal principal) {
        if (principal.isPatient()) {
            Patient p = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            if (!p.getId().equals(patientId)) throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
        } else if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            boolean isAssigned = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(
                    patientId, interpreter.getId())
                    || consultationRepository.existsByPatientIdAndInterpreterId(patientId, interpreter.getId());
            if (!isAssigned) throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        } else if (principal.isAdmin()) {
            Center center = adminService.getAdminCenter(principal);
            if (!patientCenterRepository.existsByPatientIdAndCenterId(patientId, center.getId())) {
                throw new GeneralException(GeneralErrorCode.FORBIDDEN);
            }
        } else {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        return consultationRepository.findByPatientId(patientId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()))
                .map(c -> ConsultationResponse.Detail.from(c, resolvePatientAvatarUrl(c.getPatient())));
    }

    public Page<ConsultationResponse.Summary> getByInterpreter(UUID interpreterId, Pageable pageable, UserPrincipal principal) {
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        if (principal.isAdmin()) {
            Center center = adminService.getAdminCenter(principal);
            Interpreter interpreter = interpreterRepository.findById(interpreterId)
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(center.getId())) {
                throw new GeneralException(GeneralErrorCode.FORBIDDEN);
            }
            return consultationRepository.findByInterpreterId(interpreterId, unsorted)
                    .map(c -> ConsultationResponse.Summary.from(c, resolvePatientAvatarUrl(c.getPatient())));
        }
        if (principal.isInterpreter()) {
            Interpreter self = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            if (!self.getId().equals(interpreterId)) throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            return consultationRepository.findByInterpreterId(interpreterId, unsorted)
                    .map(c -> ConsultationResponse.Summary.from(c, resolvePatientAvatarUrl(c.getPatient())));
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    public Page<ConsultationResponse.PatientView> getPatientView(UUID patientId, Pageable pageable, UserPrincipal principal) {
        if (principal.isPatient()) {
            Patient p = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            if (!p.getId().equals(patientId)) throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
        } else if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            boolean isAssigned = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patientId, interpreter.getId())
                    || consultationRepository.existsByPatientIdAndInterpreterId(patientId, interpreter.getId());
            if (!isAssigned) throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        } else if (!principal.isAdmin()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        return consultationRepository.findByPatientId(patientId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()))
                .map(ConsultationResponse.PatientView::from);
    }

    public ExportData getExportData(UserPrincipal principal) {
        Pageable all = PageRequest.of(0, 5000);
        if (principal.isAdmin()) {
            Center center = adminService.getAdminCenter(principal);
            List<ConsultationResponse.Detail> rows = consultationRepository.searchByCenter(center.getId(), null, all)
                    .map(ConsultationResponse.Detail::from).getContent();
            return new ExportData(center.getId(), center.getName(), center.getSpreadsheetId(), rows);
        }
        if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            if (interpreter.getCenter() == null) {
                throw new GeneralException(GeneralErrorCode.BAD_REQUEST,
                        "통번역가의 센터 정보가 없어 export 대상 스프레드시트를 결정할 수 없습니다");
            }
            Center center = interpreter.getCenter();
            List<ConsultationResponse.Detail> rows = consultationRepository.searchByInterpreter(interpreter.getId(), null, all)
                    .map(ConsultationResponse.Detail::from).getContent();
            return new ExportData(center.getId(), center.getName(), center.getSpreadsheetId(), rows);
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse.Detail> getDetailsByCenter(UUID centerId) {
        Pageable all = PageRequest.of(0, 50000);
        return consultationRepository.searchByCenter(centerId, null, all)
                .map(ConsultationResponse.Detail::from).getContent();
    }

    @Transactional
    public void saveCenterSpreadsheetId(UUID centerId, String spreadsheetId) {
        centerRepository.findById(centerId).ifPresent(center -> center.updateSpreadsheetId(spreadsheetId));
    }

    /**
     * 구글 시트로 내보내고 URL 을 반환한다.
     *
     * <p>구글(제3자)로 개인정보가 이전되므로 기본은 마스킹이며, 원본 내보내기는
     * 접속기록에 제3자 제공으로 남긴다.
     */
    public String exportToSheets(boolean unmasked, UserPrincipal principal) {
        ExportData exportData = getExportData(principal);

        // 트랜잭션 밖에서 호출한다 — 구글 API 응답을 기다리는 동안 DB 커넥션을 붙잡지 않기 위함
        GoogleSheetsExportService.ExportResult result = googleSheetsExportService.createSheet(
                "상담보고서", exportData.centerName(), exportData.existingSpreadsheetId(),
                exportData.rows(), !unmasked);

        if (exportData.existingSpreadsheetId() == null) {
            centerService.updateSpreadsheetId(exportData.centerId(), result.spreadsheetId());
        }

        auditService.recordThirdPartyTransfer(
                principal.getAuthUserId(), principal.getRole(), "Google Sheets",
                "CONSULTATION_EXPORT", exportData.centerId(), null,
                "건수=" + exportData.rows().size()
                        + " / 개인정보=" + (unmasked ? "원본(비마스킹)" : "마스킹")
                        + " / spreadsheetId=" + result.spreadsheetId());

        return result.url();
    }

    private Consultation findConsultation(UUID id) {
        return consultationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.CONSULTATION_NOT_FOUND));
    }

    private void checkAccess(Consultation c, UserPrincipal principal) {
        if (principal.isAdmin()) {
            requireAdminCenterAccess(c, principal);
            return;
        }
        if (principal.isInterpreter()) {
            Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
            // 본인 작성 OR 현재 담당 환자의 기록 열람 허용
            boolean isOwnConsultation = c.getInterpreter() != null
                    && c.getInterpreter().getId().equals(interpreter.getId());
            boolean isAssignedToPatient = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(
                    c.getPatient().getId(), interpreter.getId())
                    || consultationRepository.existsByPatientIdAndInterpreterId(c.getPatient().getId(), interpreter.getId());
            if (!isOwnConsultation && !isAssignedToPatient) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
            return;
        }
        if (principal.isPatient()) {
            Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            if (!c.getPatient().getId().equals(patient.getId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
            return;
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    private void requireAdminCenterAccess(Consultation c, UserPrincipal principal) {
        Center center = adminService.getAdminCenter(principal);
        if (belongsToCenter(c, center)) return;
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    private boolean belongsToCenter(Consultation c, Center center) {
        if (c.getInterpreter() != null
                && c.getInterpreter().getCenter() != null
                && c.getInterpreter().getCenter().getId().equals(center.getId())) {
            return true;
        }
        return c.getPatient().getPatientCenters().stream()
                .anyMatch(pc -> pc.getCenter().getId().equals(center.getId()));
    }

    private void applyTranslationIfNeeded(Consultation c) {
        if (c.getPatient() == null || c.getPatient().getNationality() == null) return;

        String langCode = c.getPatient().getNationality().getLanguageCode();
        if ("ko".equals(langCode)) return;

        boolean hasContent = StringUtils.hasText(c.getDiagnosisContent())
                || StringUtils.hasText(c.getTreatmentResult())
                || StringUtils.hasText(c.getMedicationInstruction())
                || StringUtils.hasText(c.getPatientComment())
                || StringUtils.hasText(c.getDiagnosisNameCode());
        if (!hasContent) return;

        // 자유입력란에 섞여 들어온 실명은 외부 전송 전에 가명처리한다
        String[] namesToMask = {
                c.getPatient().getName(),
                c.getInterpreter() != null ? c.getInterpreter().getName() : null,
                c.getDoctorName(),
                c.getCounselorName()
        };

        try {
            TranslationService.MedicalTranslation t = translationService.translateToKorean(
                    c.getPatientComment(), c.getDiagnosisContent(),
                    c.getTreatmentResult(), c.getMedicationInstruction(),
                    c.getDiagnosisNameCode(), langCode, namesToMask);
            if (t != null) {
                // translationLang = "ko": translated* 필드에 한국어 번역본 저장
                c.applyTranslation("ko", t.patientComment(), t.diagnosisContent(),
                        t.treatmentResult(), t.medicationInstruction(), t.diagnosisNameCode());
                // 진료 내용이 국외(OpenAI)로 이전된 사실을 기록한다
                auditService.recordThirdPartyTransfer(
                        currentAuthUserId(), currentRole(), "OpenAI API (국외)",
                        "CONSULTATION", c.getId(), c.getPatient().getId(),
                        "목적=진료내용 한국어 번역 / 가명처리 적용 / 원어=" + langCode);
            }
        } catch (Exception e) {
            log.warn("[translation] 번역 실패 — 원본 모국어 유지: {}", e.getMessage());
        }
    }

    private UUID currentAuthUserId() {
        UserPrincipal principal = currentPrincipal();
        return principal != null ? principal.getAuthUserId() : null;
    }

    private UserRole currentRole() {
        UserPrincipal principal = currentPrincipal();
        return principal != null ? principal.getRole() : null;
    }

    private UserPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) return null;
        return principal;
    }
}
