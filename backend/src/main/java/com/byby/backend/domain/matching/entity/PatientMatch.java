package com.byby.backend.domain.matching.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.patient.entity.Patient;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "patient_match")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PatientMatch extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interpreter_id", nullable = false)
    private Interpreter interpreter;

    @Column(nullable = false)
    private boolean active = true;

    /** 담당 히스토리(AD-04-5)용 — 배정 주체 authUserId. 센터장 배정이면 센터장, 자율 배정이면 통번역가 */
    private UUID assignedByAuthUserId;

    /** 담당 해제 시각 — active=false 로 전환된 시점 */
    private LocalDateTime endedAt;

    @Builder
    public PatientMatch(Patient patient, Interpreter interpreter, UUID assignedByAuthUserId) {
        this.patient = patient;
        this.interpreter = interpreter;
        this.assignedByAuthUserId = assignedByAuthUserId;
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
        this.endedAt = LocalDateTime.now();
    }

    public void reassign(Interpreter newInterpreter) {
        this.interpreter = newInterpreter;
    }
}
