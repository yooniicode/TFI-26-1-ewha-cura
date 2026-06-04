package com.byby.backend.domain.auth.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_credentials",
       indexes = @Index(name = "idx_user_credentials_email", columnList = "email", unique = true))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserCredential extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, unique = true)
    private UUID authUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole requestedRole;
}
