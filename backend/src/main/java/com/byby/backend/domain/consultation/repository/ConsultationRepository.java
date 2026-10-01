package com.byby.backend.domain.consultation.repository;

import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.enums.ReportStatus;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ConsultationRepository
        extends JpaRepository<Consultation, UUID>, JpaSpecificationExecutor<Consultation> {

    Page<Consultation> findByInterpreter(Interpreter interpreter, Pageable pageable);

    Page<Consultation> findByPatient(Patient patient, Pageable pageable);

    @Query("""
            SELECT DISTINCT c FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND (
                  :patientQuery IS NULL
                  OR :patientQuery = ''
                  OR LOWER(c.patient.name) LIKE LOWER(CONCAT('%', :patientQuery, '%'))
                  OR LOWER(COALESCE(c.patient.phone, '')) LIKE LOWER(CONCAT('%', :patientQuery, '%'))
                  OR LOWER(COALESCE(c.patient.region, '')) LIKE LOWER(CONCAT('%', :patientQuery, '%'))
              )
            """)
    Page<Consultation> searchByCenter(
            @Param("centerId") UUID centerId,
            @Param("patientQuery") String patientQuery,
            Pageable pageable);

    @Query("""
            SELECT c FROM Consultation c
            WHERE c.interpreter.id = :interpreterId
              AND (
                  :patientQuery IS NULL
                  OR :patientQuery = ''
                  OR LOWER(c.patient.name) LIKE LOWER(CONCAT('%', :patientQuery, '%'))
                  OR LOWER(COALESCE(c.patient.phone, '')) LIKE LOWER(CONCAT('%', :patientQuery, '%'))
                  OR LOWER(COALESCE(c.patient.region, '')) LIKE LOWER(CONCAT('%', :patientQuery, '%'))
              )
            """)
    Page<Consultation> searchByInterpreter(
            @Param("interpreterId") UUID interpreterId,
            @Param("patientQuery") String patientQuery,
            Pageable pageable);

    @Query("""
            SELECT c FROM Consultation c
            WHERE c.interpreter.id = :interpreterId
            ORDER BY c.consultationDate DESC
            """)
    Page<Consultation> findByInterpreterId(@Param("interpreterId") UUID interpreterId, Pageable pageable);

    @Query("""
            SELECT c FROM Consultation c
            WHERE c.patient.id = :patientId
            ORDER BY c.consultationDate DESC
            """)
    Page<Consultation> findByPatientId(@Param("patientId") UUID patientId, Pageable pageable);

    @Query("""
            SELECT c FROM Consultation c
            JOIN c.patient.patientCenters pc
            WHERE c.interpreter IS NULL
              AND pc.center.id = :centerId
            ORDER BY c.consultationDate ASC
            """)
    Page<Consultation> findPendingByCenter(@Param("centerId") UUID centerId, Pageable pageable);

    @Query("""
            SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END
            FROM Consultation c
            WHERE c.patient.id = :patientId AND c.interpreter.id = :interpreterId
            """)
    boolean existsByPatientIdAndInterpreterId(@Param("patientId") UUID patientId, @Param("interpreterId") UUID interpreterId);

    @Query("""
            SELECT SUM(c.durationHours)
            FROM Consultation c
            WHERE c.interpreter.id = :interpreterId
              AND c.consultationDate BETWEEN :from AND :to
            """)
    BigDecimal sumDurationHoursByInterpreterIdAndDateBetween(
            @Param("interpreterId") UUID interpreterId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    // ─── AD-06 매칭 관리 ────────────────────────────────────────────────────

    /** 센터에 접수된 통번역 요청 목록 (배정 상태로 필터). 통번역가 배정 전에는 patient_center 로만 센터가 결정된다. */
    @Query("""
            SELECT DISTINCT c FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.matchingStatus IN :statuses
              AND c.consultationDate BETWEEN :from AND :to
            """)
    Page<Consultation> findRequestsByCenter(
            @Param("centerId") UUID centerId,
            @Param("statuses") List<MatchingStatus> statuses,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);

    /** AD-05-1 통번역가 카드의 누적 통번역 횟수 */
    long countByInterpreter_IdAndMatchingStatus(UUID interpreterId, MatchingStatus matchingStatus);

    /** AD-05 통번역가 통번역 이력 */
    Page<Consultation> findByInterpreter_IdAndMatchingStatus(
            UUID interpreterId, MatchingStatus matchingStatus, Pageable pageable);

    /** AD-06-2 배정 후보의 동행 횟수 — 같은 환자·통번역가로 확정된 진료 수 (현재 요청 제외) */
    long countByPatient_IdAndInterpreter_IdAndMatchingStatusAndIdNot(
            UUID patientId, UUID interpreterId, MatchingStatus matchingStatus, UUID excludeId);

    /** AD-06-4 일정 캘린더 — 기간 내 센터 전체 일정 */
    @Query("""
            SELECT DISTINCT c FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.consultationDate BETWEEN :from AND :to
            ORDER BY c.consultationDate ASC
            """)
    List<Consultation> findCalendarByCenter(
            @Param("centerId") UUID centerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // ─── AD-홈 현황판 통계 ──────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(DISTINCT c) FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.matchingStatus IN :statuses
            """)
    long countByCenterAndMatchingStatusIn(
            @Param("centerId") UUID centerId,
            @Param("statuses") List<MatchingStatus> statuses);

    @Query("""
            SELECT COUNT(DISTINCT c) FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.reportStatus IN :statuses
            """)
    long countByCenterAndReportStatusIn(
            @Param("centerId") UUID centerId,
            @Param("statuses") List<ReportStatus> statuses);

    /** 오늘 접수된 요청 수 — createdAt 기준 */
    @Query("""
            SELECT COUNT(DISTINCT c) FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.createdAt BETWEEN :from AND :to
            """)
    long countByCenterAndCreatedAtBetween(
            @Param("centerId") UUID centerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            SELECT COUNT(DISTINCT c) FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.matchingStatus IN :statuses
              AND c.consultationDate BETWEEN :from AND :to
            """)
    long countByCenterAndMatchingStatusInAndDateBetween(
            @Param("centerId") UUID centerId,
            @Param("statuses") List<MatchingStatus> statuses,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** AD-홈-4 알림 — 일정이 지났는데 보고서를 제출하지 않은 배정 건 (미응답 통번역가) */
    @Query("""
            SELECT DISTINCT c FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.interpreter IS NOT NULL
              AND c.reportStatus = com.byby.backend.common.enums.ReportStatus.DRAFT
              AND c.consultationDate < :before
            ORDER BY c.consultationDate ASC
            """)
    List<Consultation> findOverdueReportsByCenter(
            @Param("centerId") UUID centerId,
            @Param("before") LocalDateTime before,
            Pageable pageable);

    /** 이번 달 승인 완료 건수 — 진료일 기준 */
    @Query("""
            SELECT COUNT(DISTINCT c) FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.reportStatus IN :statuses
              AND c.consultationDate BETWEEN :from AND :to
            """)
    long countByCenterAndReportStatusInAndDateBetween(
            @Param("centerId") UUID centerId,
            @Param("statuses") List<ReportStatus> statuses,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** AD-홈-4 알림 — 반려되어 통번역가 재작성이 필요한 보고서 */
    @Query("""
            SELECT DISTINCT c FROM Consultation c
            LEFT JOIN c.patient.patientCenters pc
            LEFT JOIN c.interpreter i
            WHERE (i.center.id = :centerId OR pc.center.id = :centerId)
              AND c.reportStatus IN :statuses
            ORDER BY c.reportReviewedAt DESC
            """)
    List<Consultation> findByCenterAndReportStatusIn(
            @Param("centerId") UUID centerId,
            @Param("statuses") List<ReportStatus> statuses,
            Pageable pageable);

    // ─── AD-04-4 이용이력 ───────────────────────────────────────────────────

    long countByPatientId(UUID patientId);

    @Query("""
            SELECT MAX(c.consultationDate) FROM Consultation c
            WHERE c.patient.id = :patientId
            """)
    LocalDateTime findLastConsultationDateByPatientId(@Param("patientId") UUID patientId);

    @Query("""
            SELECT MIN(c.consultationDate) FROM Consultation c
            WHERE c.patient.id = :patientId
            """)
    LocalDateTime findFirstConsultationDateByPatientId(@Param("patientId") UUID patientId);

    @Query("""
            SELECT COUNT(c) FROM Consultation c
            WHERE c.patient.id = :patientId AND c.reportStatus IN :statuses
            """)
    long countByPatientIdAndReportStatusIn(
            @Param("patientId") UUID patientId,
            @Param("statuses") List<ReportStatus> statuses);

    // ─── AD-05-4 활동이력 ───────────────────────────────────────────────────

    @Query("""
            SELECT COUNT(c) FROM Consultation c
            WHERE c.interpreter.id = :interpreterId
              AND c.consultationDate BETWEEN :from AND :to
            """)
    long countByInterpreterIdAndDateBetween(
            @Param("interpreterId") UUID interpreterId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            SELECT SUM(c.durationHours) FROM Consultation c
            WHERE c.interpreter.id = :interpreterId
              AND c.consultationDate BETWEEN :from AND :to
            """)
    BigDecimal sumDurationHoursByInterpreterIdAndDateTimeBetween(
            @Param("interpreterId") UUID interpreterId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
