package com.byby.backend.domain.consultation.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class GoogleSheetsExportServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serviceAccountJwtUsesStringAudienceForGoogleTokenEndpoint() throws Exception {
        var keyPairGenerator = KeyPairGenerator.getInstance("RSA");
        keyPairGenerator.initialize(2048);
        var privateKey = keyPairGenerator.generateKeyPair().getPrivate();

        String jwt = new GoogleSheetsExportService()
                .buildServiceAccountJwt("service@example.iam.gserviceaccount.com", privateKey, 1_700_000_000L);

        JsonNode payload = objectMapper.readTree(new String(
                Base64.getUrlDecoder().decode(jwt.split("\\.")[1]),
                StandardCharsets.UTF_8));

        assertThat(payload.path("aud").isTextual()).isTrue();
        assertThat(payload.path("aud").asText()).isEqualTo(GoogleSheetsExportService.TOKEN_URL);
        assertThat(payload.path("scope").asText())
                .contains(GoogleSheetsExportService.SHEETS_SCOPE)
                .contains(GoogleSheetsExportService.DRIVE_FILE_SCOPE);
    }
}
