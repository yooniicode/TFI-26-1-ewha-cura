package com.byby.backend.domain.consultation.repository;

import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.consultation.entity.Consultation;
import com.byby.backend.domain.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

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
}
