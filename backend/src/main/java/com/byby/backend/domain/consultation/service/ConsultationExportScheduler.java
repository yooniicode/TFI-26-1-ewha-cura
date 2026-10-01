package com.byby.backend.domain.consultation.service;

import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.repository.CenterRepository;
import com.byby.backend.domain.audit.service.AuditService;
import com.byby.backend.domain.consultation.dto.ConsultationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final AuditService auditService;

    /**
     * 자동 내보내기는 사람의 확인 없이 구글(제3자)로 나가므로 기본을 마스킹으로 둔다.
     * 원본이 필요한 센터는 명시적으로 false 로 바꿔야 한다.
     */
    @Value("${byby.export.monthly.mask-personal-data:true}")
    private boolean maskPersonalData;

    @Scheduled(cron = "0 0 1 1 * ?")
    public void monthlyExport() {
        log.info("월간 Google Sheets export 시작 (개인정보 마스킹={})", maskPersonalData);
        List<Center> centers = centerRepository.findByActiveTrue().stream()
                .filter(c -> StringUtils.hasText(c.getSpreadsheetId()))
                .toList();

        for (Center center : centers) {
            try {
                List<ConsultationResponse.Detail> rows = consultationService.getDetailsByCenter(center.getId());
                sheetsExportService.overwriteMonthlyTab(
                        center.getSpreadsheetId(), center.getName(), rows, maskPersonalData);

                // 취급자 없이 시스템이 수행한 제3자 제공도 기록 대상이다
                auditService.recordThirdPartyTransfer(
                        null, null, "Google Sheets", "CONSULTATION_EXPORT", center.getId(), null,
                        "월간 자동 내보내기 / 건수=" + rows.size()
                                + " / 개인정보=" + (maskPersonalData ? "마스킹" : "원본(비마스킹)"));

                log.info("월간 export 완료: center={}, rows={}", center.getName(), rows.size());
            } catch (Exception e) {
                log.error("월간 export 실패: center={}", center.getName(), e);
            }
        }
    }
}
