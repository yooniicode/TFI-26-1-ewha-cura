package com.byby.backend.domain.audit.service;

import com.byby.backend.domain.audit.repository.AccessLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 접속기록 보관기간 관리.
 *
 * <p>민감정보(건강정보)를 처리하므로 최소 2년 보관해야 한다
 * (「개인정보의 안전성 확보조치 기준」 제8조 제2항). 보관기간이 지난 기록은
 * 개인정보 최소보유 원칙에 따라 삭제한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccessLogRetentionScheduler {

    /** 기본 730일 = 2년. 더 길게 보관하려면 값을 늘린다. */
    @Value("${byby.audit.retention-days:730}")
    private long retentionDays;

    private final AccessLogRepository accessLogRepository;

    @Scheduled(cron = "${byby.audit.cleanup-cron:0 30 4 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void purgeExpired() {
        if (retentionDays < 730) {
            log.warn("[audit] retention-days={} — 민감정보 처리 시 법정 최소 보관기간은 2년(730일)입니다",
                    retentionDays);
        }
        LocalDateTime threshold = LocalDateTime.now().minusDays(retentionDays);
        int deleted = accessLogRepository.deleteByOccurredAtBefore(threshold);
        if (deleted > 0) {
            log.info("[audit] 보관기간({}일) 경과 접속기록 {}건 삭제", retentionDays, deleted);
        }
    }
}
