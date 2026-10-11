package com.byby.backend.domain.consultation.translation;

import com.byby.backend.common.enums.UserRole;

import java.util.UUID;

/**
 * 번역 작업 하나. 큐(스레드 풀이든 SQS든)에는 이것만 실린다.
 *
 * <p>환자 원문은 싣지 않는다. 워커가 id 로 DB 에서 읽어오므로 큐·DLQ·로그 어디에도 진료 내용이 남지 않는다.
 *
 * @param consultationId 번역할 진료기록
 * @param version        요청 시점의 {@code translation_version}. 워커는 이 값이 현재 값과 같을 때만 결과를 쓴다.
 * @param requestedBy    번역을 유발한 사용자(국외 이전 감사기록의 주체). 시스템 수행이면 null
 * @param requestedRole  그 사용자의 역할
 */
public record TranslationJob(UUID consultationId, long version, UUID requestedBy, UserRole requestedRole) {}
