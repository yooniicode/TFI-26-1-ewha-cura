package com.byby.backend.domain.interpreter.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.InterpreterRole;
import com.byby.backend.common.enums.Nationality;
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

    // ─── AD-05-2 프로필 ────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private Nationality nationality;

    // ─── AD-05-3 활동정보 ──────────────────────────────────────────────────

    /** 활동 가능 지역 (예: "서울 은평구, 서대문구") */
    @Column(name = "available_regions", length = 300)
    private String availableRegions;

    /** 활동 가능 시간 (예: "평일 09:00~18:00") */
    @Column(name = "available_times", length = 300)
    private String availableTimes;

    /** 보유 자격증 */
    @Column(columnDefinition = "TEXT")
    private String certifications;

    /** 경력 사항 */
    @Column(name = "career_note", columnDefinition = "TEXT")
    private String careerNote;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    public Interpreter(UUID authUserId, String name, String phone,
                       InterpreterRole role, Center center, List<String> languages,
                       String availabilityNote, Gender gender, Nationality nationality,
                       String availableRegions, String availableTimes,
                       String certifications, String careerNote) {
        this.authUserId = authUserId;
        this.name = name;
        this.phone = phone;
        this.role = role;
        this.center = center;
        this.languages = languages != null ? languages : new ArrayList<>();
        this.availabilityNote = availabilityNote;
        this.gender = gender;
        this.nationality = nationality;
        this.availableRegions = availableRegions;
        this.availableTimes = availableTimes;
        this.certifications = certifications;
        this.careerNote = careerNote;
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

    /** AD-05-2/3 센터장이 프로필·활동정보를 수정 */
    public void updateProfileByAdmin(Gender gender, Nationality nationality,
                                     String availableRegions, String availableTimes,
                                     String certifications, String careerNote) {
        if (gender != null) this.gender = gender;
        if (nationality != null) this.nationality = nationality;
        if (availableRegions != null) this.availableRegions = availableRegions;
        if (availableTimes != null) this.availableTimes = availableTimes;
        if (certifications != null) this.certifications = certifications;
        if (careerNote != null) this.careerNote = careerNote;
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
