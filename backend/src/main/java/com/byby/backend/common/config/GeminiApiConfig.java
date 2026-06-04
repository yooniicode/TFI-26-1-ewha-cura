package com.byby.backend.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class GeminiApiConfig {

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    @Value("${byby.gemini.api-key:}")
    private String apiKey;

    @Bean
    public RestClient geminiRestClient() {
        return RestClient.builder()
                .baseUrl(GEMINI_BASE_URL)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Bean
    public String geminiApiKey() {
        return apiKey;
    }
}
