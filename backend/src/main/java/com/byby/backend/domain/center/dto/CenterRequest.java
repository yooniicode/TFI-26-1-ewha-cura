package com.byby.backend.domain.center.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public class CenterRequest {

    public record Upsert(
            @NotBlank String name,
            String address,
            String phone,
            Boolean active
    ) {}

    /**
     * 개발자 전용 — Swagger에서 직접 센터를 등록/수정할 때 사용.
     * devSecret 은 환경변수 CENTER_DEV_SECRET 값과 일치해야 합니다.
     */
    public record DevUpsert(
            @NotBlank
            @Schema(description = "환경변수 CENTER_DEV_SECRET 값", example = "your-secret")
            String devSecret,

            @NotBlank
            @Schema(description = "센터 이름", example = "동행센터")
            String name,

            @Schema(description = "주소 (선택)", example = "서울시 강남구 ...")
            String address,

            @Schema(description = "전화번호 (선택)", example = "02-1234-5678")
            String phone,

            @Schema(description = "활성 여부 (기본값 true)", defaultValue = "true")
            Boolean active,

            @Schema(description = "Google Sheets 스프레드시트 ID (선택) — 서비스 계정이 새 파일 생성 권한이 없을 때 미리 생성한 시트 ID를 설정하세요. 해당 시트를 서비스 계정 이메일에 '편집자'로 공유해야 합니다.", example = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms")
            String spreadsheetId
    ) {
        public Upsert toUpsert() {
            return new Upsert(name, address, phone, active);
        }
    }
}
