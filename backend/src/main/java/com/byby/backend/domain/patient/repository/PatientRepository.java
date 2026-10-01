package com.byby.backend.domain.patient.repository;

import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.domain.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByAuthUserId(UUID authUserId);
    boolean existsByAuthUserId(UUID authUserId);
    Optional<Patient> findFirstByAuthUserIdIsNullAndNameIgnoreCaseAndPhone(String name, String phone);

    @Query("""
            SELECT p FROM Patient p
            WHERE p.id IN (
                SELECT pm.patient.id FROM PatientMatch pm
                WHERE pm.interpreter.id = :interpreterId AND pm.active = true
            )
            """)
    Page<Patient> findAssignedToInterpreter(@Param("interpreterId") UUID interpreterId, Pageable pageable);

    @Query("""
            SELECT p FROM Patient p
            WHERE :query IS NULL
               OR :query = ''
               OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(COALESCE(p.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(COALESCE(p.region, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            """)
    Page<Patient> search(@Param("query") String query, Pageable pageable);

    @Query("""
            SELECT DISTINCT p FROM Patient p
            JOIN p.patientCenters pc
            WHERE pc.center.id = :centerId
              AND (
                  :query IS NULL
                  OR :query = ''
                  OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(p.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(p.region, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            """)
    Page<Patient> searchByCenter(
            @Param("centerId") UUID centerId,
            @Param("query") String query,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT p FROM Patient p
            JOIN p.patientCenters pc
            JOIN pc.center c
            WHERE (
                  c.id = :centerId
                  OR LOWER(c.name) = LOWER(:centerName)
                  OR REPLACE(REPLACE(LOWER(c.name), ' ', ''), '-', '') = :compactCenterName
              )
              AND (
                  :query IS NULL
                  OR :query = ''
                  OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(p.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(p.region, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            """)
    Page<Patient> searchByCenterIdentity(
            @Param("centerId") UUID centerId,
            @Param("centerName") String centerName,
            @Param("compactCenterName") String compactCenterName,
            @Param("query") String query,
            Pageable pageable);

    /** AD-04-1 이주민 관리 — searchByCenterIdentity 에 국적(요청 언어) · 성별 필터를 더한 버전 */
    @Query("""
            SELECT DISTINCT p FROM Patient p
            JOIN p.patientCenters pc
            JOIN pc.center c
            WHERE (
                  c.id = :centerId
                  OR LOWER(c.name) = LOWER(:centerName)
                  OR REPLACE(REPLACE(LOWER(c.name), ' ', ''), '-', '') = :compactCenterName
              )
              AND (
                  :query IS NULL
                  OR :query = ''
                  OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(p.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(p.region, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              )
              AND (:anyNationality = true OR p.nationality IN :nationalities)
              AND (:anyGender = true OR p.gender IN :genders)
            """)
    Page<Patient> searchByCenterForAdmin(
            @Param("centerId") UUID centerId,
            @Param("centerName") String centerName,
            @Param("compactCenterName") String compactCenterName,
            @Param("query") String query,
            @Param("anyNationality") boolean anyNationality,
            @Param("nationalities") Collection<Nationality> nationalities,
            @Param("anyGender") boolean anyGender,
            @Param("genders") Collection<Gender> genders,
            Pageable pageable);

    @Query("""
            SELECT p FROM Patient p
            WHERE p.id IN (
                SELECT pm.patient.id FROM PatientMatch pm
                WHERE pm.interpreter.id = :interpreterId AND pm.active = true
            )
            AND (
                :query IS NULL
                OR :query = ''
                OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(COALESCE(p.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(COALESCE(p.region, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            )
            """)
    Page<Patient> searchAssignedToInterpreter(
            @Param("interpreterId") UUID interpreterId,
            @Param("query") String query,
            Pageable pageable);
}
