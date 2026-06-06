package com.byby.backend.domain.center.repository;

import com.byby.backend.domain.center.entity.Center;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CenterRepository extends JpaRepository<Center, UUID> {

    Optional<Center> findByNameIgnoreCase(String name);
    Optional<Center> findByNameIgnoreCaseAndActiveTrue(String name);
    List<Center> findByActiveTrue();

    @Query(value = """
            SELECT * FROM center
            WHERE active = true
              AND (
                  :query IS NULL OR :query = ''
                  OR LOWER(name)            LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(address,'')) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR LOWER(COALESCE(phone,  '')) LIKE LOWER(CONCAT('%', :query, '%'))
                  OR (
                      :compactQuery IS NOT NULL AND :compactQuery <> ''
                      AND (
                          REPLACE(LOWER(name), ' ', '')                        LIKE CONCAT('%', :compactQuery, '%')
                          OR REPLACE(LOWER(COALESCE(address,'')), ' ', '')     LIKE CONCAT('%', :compactQuery, '%')
                          OR REPLACE(REPLACE(LOWER(COALESCE(phone,'')),'-',''),' ','') LIKE CONCAT('%', :compactQuery, '%')
                      )
                  )
              )
            ORDER BY name ASC
            """,
            countQuery = "SELECT count(*) FROM center WHERE active = true",
            nativeQuery = true)
    Page<Center> searchActive(@Param("query") String query,
                              @Param("compactQuery") String compactQuery,
                              Pageable pageable);
}
