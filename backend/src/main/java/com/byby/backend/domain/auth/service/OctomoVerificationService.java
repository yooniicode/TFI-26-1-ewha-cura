package com.byby.backend.domain.auth.service;

import com.byby.backend.domain.auth.dto.AuthResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.Random;

@Slf4j
@Service
public class OctomoVerificationService {

    private final PhoneVerificationStore store;
    private final RestClient restClient;

    @Value("${byby.octomo.api-key:}")
    private String apiKey;

    @Value("${byby.octomo.check-url:https://api.octomo.kr/v1/message/exists}")
    private String checkUrl;

    @Value("${byby.octomo.receive-number:}")
    private String receiveNumber;

    private static final int TTL_SECONDS = 600;

    public OctomoVerificationService(PhoneVerificationStore store) {
        this.store = store;
        this.restClient = RestClient.builder()
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    public AuthResponse.PhoneVerification requestCode(String phone) {
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        store.save(phone, code, TTL_SECONDS);
        return new AuthResponse.PhoneVerification(receiveNumber, code);
    }

    public boolean verifyCode(String phone, String code) {
        Optional<String> stored = store.getCode(phone);
        if (stored.isEmpty() || !stored.get().equals(code)) {
            return false;
        }
        boolean verified = callOctomoApi(phone, code);
        if (verified) {
            store.remove(phone);
            store.markVerified(phone);
        }
        return verified;
    }

    private boolean callOctomoApi(String phone, String content) {
        try {
            OctomoCheckResponse res = restClient.post()
                    .uri(checkUrl)
                    .body(new OctomoCheckRequest(apiKey, phone, content))
                    .retrieve()
                    .body(OctomoCheckResponse.class);
            return res != null && res.exists();
        } catch (Exception e) {
            log.warn("OCTOMO API call failed for phone {}: {}", phone, e.getMessage());
            return false;
        }
    }

    private record OctomoCheckRequest(String apiKey, String phone, String content) {}
    private record OctomoCheckResponse(boolean exists) {}
}
