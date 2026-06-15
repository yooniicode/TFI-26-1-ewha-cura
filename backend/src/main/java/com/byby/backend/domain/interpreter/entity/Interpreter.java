package com.byby.backend.domain.interpreter.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.domain.center.entity.Center;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interpreter")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Interpreter extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = true)
    private UUID authUserId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private InterpreterRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id")
    private Center center;

    @ElementCollection
    @CollectionTable(name = "interpreter_language", joinColumns = @JoinColumn(name = "interpreter_id"))
    @Column(name = "language")
    private List<String> languages = new ArrayList<>();

    @Column(name = "availability_note", length = 500)
    private String availabilityNote;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    public Interpreter(UUID authUserId, String name, String phone,
                       InterpreterRole role, Center center, List<String> languages,
                       String availabilityNote) {
        this.authUserId = authUserId;
        this.name = name;
        this.phone = phone;
        this.role = role;
        this.center = center;
        this.languages = languages != null ? languages : new ArrayList<>();
        this.availabilityNote = availabilityNote;
    }

    public void updateInfo(String name, String phone, InterpreterRole role,
                           List<String> languages, String availabilityNote) {
        if (name != null) this.name = name;
        if (phone != null) this.phone = phone;
        if (role != null) this.role = role;
        if (languages != null) {
            this.languages.clear();
            this.languages.addAll(languages);
        }
        if (availabilityNote != null) this.availabilityNote = availabilityNote;
    }

    public void updateAdminInfo(String name, String phone, InterpreterRole role) {
        if (name != null) this.name = name;
        if (phone != null) this.phone = phone;
        if (role != null) this.role = role;
    }

    public void updateCenter(Center center) {
        this.center = center;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    public void unlinkAuthUser() {
        this.authUserId = null;
        this.active = false;
    }
}
