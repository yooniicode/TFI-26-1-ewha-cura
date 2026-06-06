package com.byby.backend.domain.auth.repository;

import com.byby.backend.domain.auth.entity.UserCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserCredentialRepository extends JpaRepository<UserCredential, UUID> {
    Optional<UserCredential> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<UserCredential> findByAuthUserId(UUID authUserId);
    Optional<UserCredential> findByKakaoId(String kakaoId);

    @Query("SELECT c.sessionVersion FROM UserCredential c WHERE c.authUserId = :authUserId")
    Optional<Long> findSessionVersionByAuthUserId(@Param("authUserId") UUID authUserId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE UserCredential c SET c.sessionVersion = c.sessionVersion + 1 WHERE c.authUserId = :authUserId")
    int incrementSessionVersion(@Param("authUserId") UUID authUserId);

    @Modifying
    @Query(
        "UPDATE UserCredential c SET c.passwordHash = :hash WHERE c.authUserId = :authUserId")
    int updatePasswordHash(@Param("authUserId") java.util.UUID authUserId,
                           @Param("hash") String hash);
}
