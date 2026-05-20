package com.byby.backend.domain.interpreter.repository;

import com.byby.backend.domain.interpreter.entity.Interpreter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterpreterRepository extends JpaRepository<Interpreter, UUID> {

    Optional<Interpreter> findByAuthUserId(UUID authUserId);

    boolean existsByAuthUserId(UUID authUserId);

    List<Interpreter> findByAuthUserIdIn(Collection<UUID> authUserIds);

    List<Interpreter> findByCenterId(UUID centerId);

    long countByCenter_IdAndActiveTrue(UUID centerId);

    @Query("""
            SELECT DISTINCT i FROM Interpreter i
            LEFT JOIN i.languages language
            WHERE i.active = true
              AND (
                  :query IS NULL
                  OR :query = ''
                  OR LOWER(i.name) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(i.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              )
              AND (
                  :language IS NULL
                  OR :language = ''
                  OR LOWER(COALESCE(language, '')) = LOWER(:language)
              )
            """)
    Page<Interpreter> search(
            @Param("query") String query,
            @Param("language") String language,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT i FROM Interpreter i
            LEFT JOIN i.languages language
            WHERE i.active = true
              AND i.center.id = :centerId
              AND (
                  :query IS NULL
                  OR :query = ''
                  OR LOWER(i.name) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(i.phone, '')) LIKE LOWER(CONCAT('%', :query, '%'))
              )
              AND (
                  :language IS NULL
                  OR :language = ''
                  OR LOWER(COALESCE(language, '')) = LOWER(:language)
              )
            """)
    Page<Interpreter> searchByCenter(
            @Param("centerId") UUID centerId,
            @Param("query") String query,
            @Param("language") String language,
            Pageable pageable);
}
