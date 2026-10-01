package com.byby.backend.domain.admin.dto;

import com.byby.backend.domain.center.entity.Center;

import java.util.UUID;

/** AD-02/AD-03/AD-설정 센터 데이터 응답 DTO */
public class AdminCenterResponse {

    /** AD-설정 센터 기본정보 — 센터명 · 담당자 · 연락처 */
    public record Profile(
            UUID centerId,
            String name,
            String address,
            String phone,
            boolean active,
            String managerNickname,
            long patientCount,
            long interpreterCount
    ) {
        public static Profile from(Center center, String managerNickname,
                                   long patientCount, long interpreterCount) {
            return new Profile(center.getId(), center.getName(), center.getAddress(), center.getPhone(),
                    center.isActive(), managerNickname, patientCount, interpreterCount);
        }
    }

    /** AD-03 구글 시트 연동 데이터 */
    public record SheetLink(
            UUID centerId,
            String spreadsheetId,
            String url,
            boolean connected
    ) {
        public static SheetLink of(UUID centerId, String spreadsheetId) {
            boolean connected = spreadsheetId != null && !spreadsheetId.isBlank();
            return new SheetLink(centerId, spreadsheetId,
                    connected ? "https://docs.google.com/spreadsheets/d/" + spreadsheetId : null,
                    connected);
        }
    }
}
