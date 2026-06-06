package com.byby.backend.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
public class OpenApiConfig {

    @Value("${byby.server.url:}")
    private String serverUrl;

    @Bean
    public OpenAPI openAPI() {
        String securitySchemeName = "BearerAuth";
        OpenAPI openAPI = new OpenAPI()
                .info(new Info()
                        .title("TFI 통번역 지원 플랫폼 API")
                        .description("이주민 의료 통번역 지원 시스템")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName));
        if (StringUtils.hasText(serverUrl)) {
            openAPI.addServersItem(new Server().url(serverUrl).description("Production"));
        }

        return openAPI
                .addTagsItem(new Tag().name("Auth").description("인증/내 프로필 등록 API"))
                .addTagsItem(new Tag().name("Patients").description("이주민(Patient) 관리 API"))
                .addTagsItem(new Tag().name("Interpreters").description("통번역가(Interpreter) 관리 API"))
                .addTagsItem(new Tag().name("Consultations").description("상담/통역 보고서 API"))
                .addTagsItem(new Tag().name("Handovers").description("인수인계 API"))
                .addTagsItem(new Tag().name("Matching").description("이주민-통번역가 매칭 API"))
                .addTagsItem(new Tag().name("MedicalScripts").description("의료 대본 생성/조회 API"))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
