package com.byby.backend.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class OpenAiApiConfig {

    @Value("${byby.openai.api-key:}")
    private String apiKey;

    /** 로컬 측정·테스트에서 OpenAI 대역(mock) 서버로 돌리기 위해 바꿀 수 있다. */
    @Value("${byby.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Bean
    public RestClient openAiRestClient() {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Bean
    public String openAiApiKey() {
        return apiKey;
    }
}
