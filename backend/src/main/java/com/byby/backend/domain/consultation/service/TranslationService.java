package com.byby.backend.domain.consultation.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class TranslationService {

    private final RestClient openAiRestClient;
    private final String openAiApiKey;

    @Value("${byby.openai.model:gpt-4o-mini}")
    private String model;

    public TranslationService(
            @Qualifier("openAiRestClient") RestClient openAiRestClient,
            @Qualifier("openAiApiKey") String openAiApiKey) {
        this.openAiRestClient = openAiRestClient;
        this.openAiApiKey = openAiApiKey;
    }

    public record MedicalTranslation(
            String patientComment,
            String diagnosisContent,
            String treatmentResult,
            String medicationInstruction,
            String diagnosisNameCode
    ) {}

    /**
     * Translates medical content fields written in the patient's native language into Korean.
     * Returns null if translation is unavailable (missing API key, API error, etc.).
     */
    public MedicalTranslation translateToKorean(
            String patientComment,
            String diagnosisContent,
            String treatmentResult,
            String medicationInstruction,
            String diagnosisNameCode,
            String sourceLangCode) {

        if (!StringUtils.hasText(openAiApiKey)) {
            log.warn("[translation] OPENAI_API_KEY 없음 — 번역 스킵");
            return null;
        }
        if ("ko".equals(sourceLangCode)) {
            return null;
        }

        boolean hasContent = StringUtils.hasText(patientComment)
                || StringUtils.hasText(diagnosisContent)
                || StringUtils.hasText(treatmentResult)
                || StringUtils.hasText(medicationInstruction)
                || StringUtils.hasText(diagnosisNameCode);
        if (!hasContent) return null;

        String langName = languageName(sourceLangCode);
        String prompt = buildTranslationPrompt(patientComment, diagnosisContent,
                treatmentResult, medicationInstruction, diagnosisNameCode, langName);

        try {
            String raw = callOpenAi(prompt);
            return parseTranslation(raw, patientComment, diagnosisContent,
                    treatmentResult, medicationInstruction, diagnosisNameCode);
        } catch (Exception e) {
            log.error("[translation] 번역 실패 lang={}: {}", sourceLangCode, e.getMessage());
            return null;
        }
    }

    private String buildTranslationPrompt(String patientComment, String diagnosisContent,
                                          String treatmentResult, String medicationInstruction,
                                          String diagnosisNameCode, String langName) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a medical translation assistant. Translate the following medical record fields from ")
          .append(langName)
          .append(" into Korean. Keep medical terms accurate. Return ONLY the translated text for each field, in the exact same format as below.\n\n");

        sb.append("DIAGNOSIS_NAME: ").append(StringUtils.hasText(diagnosisNameCode) ? diagnosisNameCode : "").append("\n");
        sb.append("PATIENT_COMMENT: ").append(StringUtils.hasText(patientComment) ? patientComment : "").append("\n");
        sb.append("DIAGNOSIS_CONTENT: ").append(StringUtils.hasText(diagnosisContent) ? diagnosisContent : "").append("\n");
        sb.append("TREATMENT_RESULT: ").append(StringUtils.hasText(treatmentResult) ? treatmentResult : "").append("\n");
        sb.append("MEDICATION_INSTRUCTION: ").append(StringUtils.hasText(medicationInstruction) ? medicationInstruction : "").append("\n\n");

        sb.append("Respond in exactly this format:\n");
        sb.append("DIAGNOSIS_NAME: <translated text or empty>\n");
        sb.append("PATIENT_COMMENT: <translated text or empty>\n");
        sb.append("DIAGNOSIS_CONTENT: <translated text or empty>\n");
        sb.append("TREATMENT_RESULT: <translated text or empty>\n");
        sb.append("MEDICATION_INSTRUCTION: <translated text or empty>");

        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String callOpenAi(String prompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "max_tokens", 1024,
                "temperature", 0.1
        );

        Map<String, Object> response = openAiRestClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + openAiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null || !response.containsKey("choices")) {
            throw new RuntimeException("OpenAI 응답 없음");
        }
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        return (String) message.get("content");
    }

    private MedicalTranslation parseTranslation(String raw,
                                                 String origPatientComment,
                                                 String origDiagnosisContent,
                                                 String origTreatmentResult,
                                                 String origMedicationInstruction,
                                                 String origDiagnosisNameCode) {
        String dn = extractField(raw, "DIAGNOSIS_NAME");
        String pc = extractField(raw, "PATIENT_COMMENT");
        String dc = extractField(raw, "DIAGNOSIS_CONTENT");
        String tr = extractField(raw, "TREATMENT_RESULT");
        String mi = extractField(raw, "MEDICATION_INSTRUCTION");

        return new MedicalTranslation(
                StringUtils.hasText(origPatientComment) ? pc : null,
                StringUtils.hasText(origDiagnosisContent) ? dc : null,
                StringUtils.hasText(origTreatmentResult) ? tr : null,
                StringUtils.hasText(origMedicationInstruction) ? mi : null,
                StringUtils.hasText(origDiagnosisNameCode) ? dn : null
        );
    }

    private String extractField(String text, String fieldName) {
        String prefix = fieldName + ":";
        for (String line : text.split("\n")) {
            if (line.startsWith(prefix)) {
                String value = line.substring(prefix.length()).trim();
                return value.isEmpty() ? null : value;
            }
        }
        return null;
    }

    private String languageName(String code) {
        return switch (code) {
            case "en" -> "English";
            case "vi" -> "Vietnamese";
            case "zh" -> "Chinese (Simplified)";
            case "km" -> "Khmer";
            case "my" -> "Burmese (Myanmar)";
            case "fil" -> "Filipino";
            case "id" -> "Indonesian";
            case "th" -> "Thai";
            case "ne" -> "Nepali";
            case "mn" -> "Mongolian";
            case "uz" -> "Uzbek";
            case "si" -> "Sinhala";
            case "bn" -> "Bengali";
            case "ur" -> "Urdu";
            default -> "English";
        };
    }
}
