package com.byby.backend.common.config;

import io.sentry.SentryOptions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SentryConfig {

    // 요청 본문(진료 내용·환자 정보)과 쿠키를 Sentry에 전송하지 않음
    @Bean
    public SentryOptions.BeforeSendCallback sentryBeforeSendCallback() {
        return (event, hint) -> {
            if (event.getRequest() != null) {
                event.getRequest().setData(null);
                event.getRequest().setCookies(null);
            }
            event.setUser(null);
            return event;
        };
    }
}
