package com.byby.backend.domain.matching.repository;

import com.byby.backend.domain.matching.entity.PatientMatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientMatchRepository extends JpaRepository<PatientMatch, UUID> {

    List<PatientMatch> findByPatientIdAndActiveTrue(UUID patientId);

    Optional<PatientMatch> findByPatientIdAndInterpreterIdAndActiveTrue(UUID patientId, UUID interpreterId);

    Page<PatientMatch> findByActiveTrue(Pageable pageable);

    @Query("""
            SELECT pm FROM PatientMatch pm
            WHERE pm.active = true AND pm.interpreter.center.id = :centerId
            """)
    Page<PatientMatch> findActiveByInterpreterCenter(@Param("centerId") UUID centerId, Pageable pageable);

    Page<PatientMatch> findByInterpreterIdAndActiveTrue(UUID interpreterId, Pageable pageable);

    boolean existsByPatientIdAndActiveTrue(UUID patientId);

    boolean existsByPatientIdAndInterpreterIdAndActiveTrue(UUID patientId, UUID interpreterId);

    @Query("SELECT COUNT(pm) FROM PatientMatch pm WHERE pm.active = true AND pm.interpreter.center.id = :centerId")
    long countActiveByInterpreterCenter(@NonNull @Param("centerId") UUID centerId);

    long countByInterpreterIdAndActiveTrue(UUID interpreterId);

    @Modifying
    @Query("UPDATE PatientMatch pm SET pm.active = false WHERE pm.patient.id = :patientId AND pm.active = true")
    void deactivateAllActiveByPatientId(@Param("patientId") UUID patientId);

    // ─── AD-04-5 담당 히스토리 / AD-06-3 매칭 현황 ──────────────────────────

    /** 해제분 포함 전체 담당 이력 (최신순) */
    List<PatientMatch> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    /** AD-05-4 통번역가별 담당 이주민 이력 (해제분 포함) */
    List<PatientMatch> findByInterpreterIdOrderByCreatedAtDesc(UUID interpreterId);
}
