package com.byby.backend.domain.admin.repository;

import com.byby.backend.domain.admin.entity.AdminProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AdminProfileRepository extends JpaRepository<AdminProfile, UUID> {
    Optional<AdminProfile> findByAuthUserId(UUID authUserId);

    /** AD-04 구성원 관리 — 같은 센터의 관리자 계정 */
    List<AdminProfile> findByCenter_Id(UUID centerId);
}
