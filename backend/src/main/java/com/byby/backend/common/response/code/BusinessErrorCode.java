package com.byby.backend.common.response.code;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BusinessErrorCode implements Code {
    USER_NOT_FOUND(404, "사용자를 찾을 수 없습니다."),
    PATIENT_NOT_FOUND(404, "이주민 정보를 찾을 수 없습니다."),
    INTERPRETER_NOT_FOUND(404, "통번역가 정보를 찾을 수 없습니다."),
    HOSPITAL_NOT_FOUND(404, "병원 정보를 찾을 수 없습니다."),
    CONSULTATION_NOT_FOUND(404, "상담 보고서를 찾을 수 없습니다."),
    HANDOVER_NOT_FOUND(404, "인수인계 정보를 찾을 수 없습니다."),
    SCRIPT_NOT_FOUND(404, "의료 대본을 찾을 수 없습니다."),
    MATCH_NOT_FOUND(404, "매칭 정보를 찾을 수 없습니다."),

    CONSULTATION_ALREADY_CONFIRMED(409, "이미 확인 완료된 보고서입니다."),
    CONSULTATION_ALREADY_ACCEPTED(409, "이미 통번역가가 배정된 요청입니다."),
    HANDOVER_ALREADY_ASSIGNED(409, "이미 배정된 인수인계입니다."),
    MATCH_ALREADY_EXISTS(409, "이미 활성화된 매칭이 존재합니다."),
    INTERPRETER_ALREADY_EXISTS(409, "해당 인증 계정의 통번역가가 이미 존재합니다."),
    PATIENT_ALREADY_EXISTS(409, "해당 인증 계정의 이주민 정보가 이미 존재합니다."),
    PATIENT_CENTER_ALREADY_EXISTS(409, "이미 등록된 센터입니다."),

    ACCESS_DENIED_NOT_ASSIGNED(403, "배정된 케이스가 아닙니다."),
    ACCESS_DENIED_NOT_OWNER(403, "본인의 케이스가 아닙니다."),

    SCRIPT_GENERATION_FAILED(500, "의료 대본 생성에 실패했습니다."),
    ;

    private final int statusCode;
    private final String message;
}
