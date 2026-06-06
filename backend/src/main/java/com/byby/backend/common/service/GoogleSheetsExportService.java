package com.byby.backend.common.service;

import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.List;

@Slf4j
@Service
public class GoogleSheetsExportService {

    @Value("${byby.google.service-account-json:}")
    private String serviceAccountJson;

    static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    static final String SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
    static final String DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
    static final String GOOGLE_API_SCOPES = SHEETS_SCOPE + " " + DRIVE_FILE_SCOPE;
    private static final String SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public String createSheet(String title, List<ConsultationResponse.Summary> rows) {
        if (!StringUtils.hasText(serviceAccountJson)) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "GOOGLE_SERVICE_ACCOUNT_JSON 이 설정되지 않았습니다");
        }
        String token = fetchAccessToken();
        String spreadsheetId = createSpreadsheet(token, title);
        writeRows(token, spreadsheetId, rows);
        return "https://docs.google.com/spreadsheets/d/" + spreadsheetId;
    }

    private String fetchAccessToken() {
        try {
            JsonNode sa = objectMapper.readTree(serviceAccountJson);
            String clientEmail = sa.path("client_email").asText();
            String privateKeyPem = sa.path("private_key").asText();

            String pem = privateKeyPem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] keyBytes = Base64.getDecoder().decode(pem);
            PrivateKey privateKey = KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(keyBytes));

            long nowSec = System.currentTimeMillis() / 1000;
            String jwt = buildServiceAccountJwt(clientEmail, privateKey, nowSec);

            String body = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
                    + "&assertion=" + jwt;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(TOKEN_URL))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(res.body());
            String token = json.path("access_token").asText(null);
            if (!StringUtils.hasText(token)) {
                throw new RuntimeException("access_token 없음: " + res.body());
            }
            return token;
        } catch (GeneralException e) {
            throw e;
        } catch (Exception e) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "Google 토큰 발급 실패: " + e.getMessage());
        }
    }

    String buildServiceAccountJwt(String clientEmail, PrivateKey privateKey, long nowSec) {
        return Jwts.builder()
                .issuer(clientEmail)
                .subject(clientEmail)
                .claim("aud", TOKEN_URL)
                .claim("scope", GOOGLE_API_SCOPES)
                .issuedAt(new Date(nowSec * 1000))
                .expiration(new Date((nowSec + 3600) * 1000))
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    private String createSpreadsheet(String accessToken, String title) {
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.putObject("properties").put("title", title);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(SHEETS_API))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                throw new RuntimeException("스프레드시트 생성 오류 " + res.statusCode() + ": " + res.body());
            }
            String id = objectMapper.readTree(res.body()).path("spreadsheetId").asText(null);
            if (!StringUtils.hasText(id)) {
                throw new RuntimeException("spreadsheetId 없음: " + res.body());
            }
            return id;
        } catch (GeneralException e) {
            throw e;
        } catch (Exception e) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "Google 스프레드시트 생성 실패: " + e.getMessage());
        }
    }

    private void writeRows(String accessToken, String spreadsheetId, List<ConsultationResponse.Summary> rows) {
        try {
            ArrayNode values = objectMapper.createArrayNode();

            ArrayNode header = objectMapper.createArrayNode();
            for (String h : new String[]{"ID", "상담일", "이주민", "통번역가", "병원", "이슈유형", "확인여부", "작성일"}) {
                header.add(h);
            }
            values.add(header);

            for (ConsultationResponse.Summary s : rows) {
                ArrayNode row = objectMapper.createArrayNode();
                row.add(s.id().toString());
                row.add(s.consultationDate() != null ? s.consultationDate().toString() : "");
                row.add(s.patientName() != null ? s.patientName() : "");
                row.add(s.interpreterName() != null ? s.interpreterName() : "");
                row.add(s.hospitalName() != null ? s.hospitalName() : "");
                row.add(s.issueType() != null ? s.issueType().name() : "");
                row.add(s.confirmed() ? "확인" : "미확인");
                row.add(s.createdAt() != null ? s.createdAt().toString() : "");
                values.add(row);
            }

            ObjectNode body = objectMapper.createObjectNode();
            body.put("range", "Sheet1");
            body.put("majorDimension", "ROWS");
            body.set("values", values);

            String url = SHEETS_API + "/" + spreadsheetId
                    + "/values/Sheet1?valueInputOption=RAW";
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString(body.toString()))
                    .build();

            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                log.warn("Google Sheets 데이터 입력 경고 {}: {}", res.statusCode(), res.body());
            }
        } catch (GeneralException e) {
            throw e;
        } catch (Exception e) {
            throw new GeneralException(GeneralErrorCode.INTERNAL_SERVER_ERROR,
                    "Google 시트 데이터 입력 실패: " + e.getMessage());
        }
    }
}
