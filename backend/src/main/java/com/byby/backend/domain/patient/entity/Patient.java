package com.byby.backend.domain.patient.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.Gender;
import com.byby.backend.common.enums.Nationality;
import com.byby.backend.common.enums.VisaType;
import com.byby.backend.domain.center.entity.Center;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "patient")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Patient extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID authUserId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private Nationality nationality;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private VisaType visaType;

    @Column(columnDefinition = "TEXT")
    private String visaNote;

    private LocalDate birthDate;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String region;

    @Column(length = 200)
    private String workplace;

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PatientCenter> patientCenters = new ArrayList<>();

    @Builder
    public Patient(UUID authUserId, String name, Nationality nationality, Gender gender,
                   VisaType visaType, String visaNote, LocalDate birthDate,
                   String phone, String region, String workplace) {
        this.authUserId = authUserId;
        this.name = name;
        this.nationality = nationality;
        this.gender = gender;
        this.visaType = visaType;
        this.visaNote = visaNote;
        this.birthDate = birthDate;
        this.phone = phone;
        this.region = region;
        this.workplace = workplace;
    }

    public void updateInfo(String name, String phone, String region, String visaNote, VisaType visaType, String workplace) {
        if (name != null) this.name = name;
        if (phone != null) this.phone = phone;
        if (region != null) this.region = region;
        if (visaNote != null) this.visaNote = visaNote;
        if (visaType != null) this.visaType = visaType;
        if (workplace != null) this.workplace = workplace;
    }

    public void linkAuthUser(UUID authUserId) {
        this.authUserId = authUserId;
    }

    public void unlinkAuthUser() {
        this.authUserId = null;
    }

    public PatientCenter addCenter(Center center) {
        PatientCenter patientCenter = PatientCenter.builder()
                .patient(this)
                .center(center)
                .build();
        this.patientCenters.add(patientCenter);
        return patientCenter;
    }
}
