package com.byby.backend.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class OpenAiApiConfig {

    private static final String OPENAI_BASE_URL = "https://api.openai.com/v1";

    @Value("${byby.openai.api-key:}")
    private String apiKey;

    @Bean
    public RestClient openAiRestClient() {
        return RestClient.builder()
                .baseUrl(OPENAI_BASE_URL)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Bean
    public String openAiApiKey() {
        return apiKey;
    }
}
