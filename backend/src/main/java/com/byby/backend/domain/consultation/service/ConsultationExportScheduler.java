package com.byby.backend.domain.consultation.service;

import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.repository.CenterRepository;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConsultationExportScheduler {

    private final CenterRepository centerRepository;
    private final ConsultationService consultationService;
    private final GoogleSheetsExportService sheetsExportService;

    @Scheduled(cron = "0 0 1 1 * ?")
    public void monthlyExport() {
        log.info("월간 Google Sheets export 시작");
        List<Center> centers = centerRepository.findByActiveTrue().stream()
                .filter(c -> StringUtils.hasText(c.getSpreadsheetId()))
                .toList();

        for (Center center : centers) {
            try {
                List<ConsultationResponse.Detail> rows = consultationService.getDetailsByCenter(center.getId());
                sheetsExportService.overwriteMonthlyTab(center.getSpreadsheetId(), center.getName(), rows);
                log.info("월간 export 완료: center={}, rows={}", center.getName(), rows.size());
            } catch (Exception e) {
                log.error("월간 export 실패: center={}", center.getName(), e);
            }
        }
    }
}
