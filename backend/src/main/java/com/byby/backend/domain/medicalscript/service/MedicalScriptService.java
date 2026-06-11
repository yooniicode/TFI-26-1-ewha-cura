package com.byby.backend.domain.medicalscript.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.enums.ScriptType;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.medicalscript.dto.ScriptRequest;
import com.byby.backend.domain.medicalscript.dto.ScriptResponse;
import com.byby.backend.domain.medicalscript.entity.MedicalScript;
import com.byby.backend.domain.medicalscript.repository.MedicalScriptRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MedicalScriptService {

    private final MedicalScriptRepository scriptRepository;
    private final PatientRepository patientRepository;
    private final ConsultationRepository consultationRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientMatchRepository patientMatchRepository;

    @Qualifier("openAiRestClient")
    private final RestClient openAiRestClient;

    @Qualifier("openAiApiKey")
    private final String openAiApiKey;

    @Value("${byby.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Transactional
    public ScriptResponse.Detail generate(ScriptRequest.Generate req, UserPrincipal principal) {
        final Patient patient;
        if (principal.isPatient()) {
            Patient self = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            if (!self.getId().equals(req.patientId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
            patient = self;
        } else if (principal.isAdmin() || principal.isInterpreter()) {
            patient = patientRepository.findById(req.patientId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            requireAssignedIfInterpreter(patient.getId(), principal);
        } else {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }

        Consultation consultation = null;
        if (req.consultationId() != null) {
            consultation = consultationRepository.findById(req.consultationId()).orElse(null);
        }

        String prompt = buildPrompt(patient, consultation, req);
        String contentKo = callOpenAiApi(prompt);

        MedicalScript script = MedicalScript.builder()
                .patient(patient)
                .consultation(consultation)
                .scriptType(req.scriptType())
                .contentKo(contentKo)
                .build();
        return ScriptResponse.Detail.from(scriptRepository.save(script));
    }

    public Page<ScriptResponse.Summary> getByPatient(UUID patientId, Pageable pageable, UserPrincipal principal) {
        if (principal.isPatient()) {
            Patient self = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            if (!self.getId().equals(patientId)) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
        } else if (principal.isInterpreter()) {
            requireAssignedIfInterpreter(patientId, principal);
        } else if (!principal.isAdmin()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        return scriptRepository.findByPatientId(patientId, pageable).map(ScriptResponse.Summary::from);
    }

    public ScriptResponse.Detail getById(UUID id, UserPrincipal principal) {
        MedicalScript script = scriptRepository.findById(id)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.SCRIPT_NOT_FOUND));
        if (principal.isPatient()) {
            Patient self = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            if (!self.getId().equals(script.getPatient().getId())) {
                throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_OWNER);
            }
        } else if (principal.isInterpreter()) {
            requireAssignedIfInterpreter(script.getPatient().getId(), principal);
        } else if (!principal.isAdmin()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        return ScriptResponse.Detail.from(script);
    }

    private void requireAssignedIfInterpreter(UUID patientId, UserPrincipal principal) {
        if (!principal.isInterpreter()) return;
        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        boolean hasActiveMatch = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(patientId, interpreter.getId());
        boolean hasConsultation = consultationRepository.existsByPatientIdAndInterpreterId(patientId, interpreter.getId());
        if (!hasActiveMatch && !hasConsultation) {
            throw new BusinessException(BusinessErrorCode.ACCESS_DENIED_NOT_ASSIGNED);
        }
    }

    private String buildPrompt(Patient patient, Consultation consultation, ScriptRequest.Generate req) {
        StringBuilder sb = new StringBuilder();
        sb.append("당신은 의료 통역 보조 시스템입니다. 이주민 환자가 한국 의사와 소통할 수 있도록 정확하고 간결한 한국어 대본을 작성합니다.\n\n");
        sb.append("다음 이주민 환자 정보를 바탕으로 의사에게 전달할 한국어 대본을 작성해주세요.\n\n");
        sb.append("환자 국적: ").append(patient.getNationality()).append("\n");
        if (consultation != null && consultation.getMemo() != null) {
            sb.append("이전 상담 기록: ").append(consultation.getMemo()).append("\n");
            if (consultation.getDepartment() != null) {
                sb.append("진료과: ").append(consultation.getDepartment()).append("\n");
            }
        }
        if (req.additionalContext() != null) {
            sb.append("추가 증상/상황: ").append(req.additionalContext()).append("\n");
        }
        sb.append("\n대본 유형: ").append(req.scriptType() == ScriptType.EMERGENCY
                ? "응급 상황" : "일반 진료").append("\n");
        sb.append("\n요구사항: 짧고 명확한 한국어 문장으로 작성. 환자가 의사에게 직접 보여줄 수 있도록 구성. 대본 내용만 출력하고 다른 설명은 하지 마세요.");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String callOpenAiApi(String prompt) {
        if (!StringUtils.hasText(openAiApiKey)) {
            throw new BusinessException(BusinessErrorCode.SCRIPT_GENERATION_FAILED);
        }
        try {
            Map<String, Object> body = Map.of(
                    "model", openAiModel,
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    ),
                    "max_tokens", 1024,
                    "temperature", 0.7
            );

            Map<String, Object> response = openAiRestClient.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
            throw new BusinessException(BusinessErrorCode.SCRIPT_GENERATION_FAILED);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("OpenAI API call failed: {}", e.getMessage());
            throw new BusinessException(BusinessErrorCode.SCRIPT_GENERATION_FAILED);
        }
    }
}
