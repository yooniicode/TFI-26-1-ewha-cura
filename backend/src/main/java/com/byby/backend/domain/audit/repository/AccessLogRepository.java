package com.byby.backend.domain.audit.repository;

import com.byby.backend.domain.audit.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 접속기록 저장소.
 *
 * <p>선택 필터(취급자·정보주체 등)는 널 파라미터 비교 대신 Specification 으로 조합한다
 * ({@link AccessLogSpecs}).
 */
public interface AccessLogRepository
        extends JpaRepository<AccessLog, UUID>, JpaSpecificationExecutor<AccessLog> {

    long countByOccurredAtBetween(LocalDateTime from, LocalDateTime to);

    @Modifying
    @Query("DELETE FROM AccessLog a WHERE a.occurredAt < :threshold")
    int deleteByOccurredAtBefore(@Param("threshold") LocalDateTime threshold);
}
