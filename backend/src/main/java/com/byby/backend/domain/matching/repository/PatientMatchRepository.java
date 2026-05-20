package com.byby.backend.domain.matching.repository;

import com.byby.backend.domain.matching.entity.PatientMatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;

import java.util.Optional;
import java.util.UUID;

public interface PatientMatchRepository extends JpaRepository<PatientMatch, UUID> {

    Optional<PatientMatch> findByPatientIdAndActiveTrue(UUID patientId);

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
}
