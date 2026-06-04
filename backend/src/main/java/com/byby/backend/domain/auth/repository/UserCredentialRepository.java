package com.byby.backend.domain.auth.repository;

import com.byby.backend.domain.auth.entity.UserCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserCredentialRepository extends JpaRepository<UserCredential, UUID> {
    Optional<UserCredential> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<UserCredential> findByAuthUserId(UUID authUserId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(
        "UPDATE UserCredential c SET c.passwordHash = :hash WHERE c.authUserId = :authUserId")
    int updatePasswordHash(@org.springframework.data.repository.query.Param("authUserId") java.util.UUID authUserId,
                           @org.springframework.data.repository.query.Param("hash") String hash);
}
