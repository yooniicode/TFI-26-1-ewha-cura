package com.byby.backend.domain.consultation.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.ConsultationMethod;
import com.byby.backend.common.enums.IssueType;
import com.byby.backend.common.enums.ProcessingType;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.hospital.entity.Hospital;
import com.byby.backend.domain.patient.entity.Patient;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "consultation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Consultation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private LocalDateTime consultationDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interpreter_id")
    private Interpreter interpreter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id")
    private Hospital hospital;

    /** Hospital entity 없을 때 자유 입력 병원명 */
    @Column(length = 200)
    private String hospitalName;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String doctorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private IssueType issueType;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ConsultationMethod method;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ProcessingType processing;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(columnDefinition = "TEXT")
    private String patientComment;

    @Column(columnDefinition = "TEXT")
    private String treatmentResult;

    @Column(columnDefinition = "TEXT")
    private String diagnosisContent;

    @Column(length = 200)
    private String diagnosisNameCode;

    @Column(columnDefinition = "TEXT")
    private String medicationInstruction;

    @Column(length = 100)
    private String counselorName;

    @Column(columnDefinition = "TEXT")
    private String workDescription;

    @Column(nullable = false)
    private boolean memoCompleted = false;

    @Column(nullable = false)
    private boolean reportCompleted = false;

    @Column(columnDefinition = "TEXT")
    private String doctorConfirmationSignature;

    @Column(precision = 4, scale = 1)
    private BigDecimal durationHours;

    private Integer fee;

    private LocalDate nextAppointmentDate;

    private LocalDate confirmedAt;

    @Column(length = 100)
    private String confirmedBy;

    @Column(length = 20)
    private String confirmedByPhone;

    /** 병원명 resolve: Hospital 엔티티 > 자유입력 hospitalName */
    public String getResolvedHospitalName() {
        if (this.hospital != null) return this.hospital.getName();
        return this.hospitalName;
    }

    @Builder
    public Consultation(LocalDateTime consultationDate, Patient patient, Interpreter interpreter,
                        Hospital hospital, String hospitalName, String department, IssueType issueType,
                        ConsultationMethod method, ProcessingType processing, String memo,
                        String doctorName, String patientComment, String treatmentResult,
                        String diagnosisContent, String diagnosisNameCode,
                        String medicationInstruction, String counselorName,
                        String workDescription, String doctorConfirmationSignature,
                        BigDecimal durationHours, Integer fee, LocalDate nextAppointmentDate) {
        this.consultationDate = consultationDate;
        this.patient = patient;
        this.interpreter = interpreter;
        this.hospital = hospital;
        this.hospitalName = hospitalName;
        this.department = department;
        this.doctorName = doctorName;
        this.issueType = issueType;
        this.method = method;
        this.processing = processing;
        this.memo = memo;
        this.patientComment = patientComment;
        this.treatmentResult = treatmentResult;
        this.diagnosisContent = diagnosisContent;
        this.diagnosisNameCode = diagnosisNameCode;
        this.medicationInstruction = medicationInstruction;
        this.counselorName = counselorName;
        this.workDescription = workDescription;
        this.doctorConfirmationSignature = doctorConfirmationSignature;
        this.durationHours = durationHours;
        this.fee = fee;
        this.nextAppointmentDate = nextAppointmentDate;
    }

    public void accept(Interpreter interpreter, LocalDateTime confirmedDate) {
        this.interpreter = interpreter;
        if (confirmedDate != null) this.consultationDate = confirmedDate;
    }

    public void confirm(String confirmedBy, String confirmedByPhone) {
        this.confirmedAt = LocalDate.now();
        this.confirmedBy = confirmedBy;
        this.confirmedByPhone = confirmedByPhone;
    }

    public void update(LocalDateTime consultationDate, Hospital hospital, String hospitalName,
                       IssueType issueType,
                       ConsultationMethod method, ProcessingType processing,
                       String memo, LocalDate nextAppointmentDate, String department,
                       String doctorName, String patientComment, String treatmentResult,
                       String diagnosisContent, String diagnosisNameCode,
                       String medicationInstruction, String counselorName,
                       String workDescription, String doctorConfirmationSignature,
                       BigDecimal durationHours, Integer fee,
                       Boolean memoCompleted, Boolean reportCompleted) {
        if (consultationDate != null) this.consultationDate = consultationDate;
        this.hospital = hospital;
        if (hospitalName != null) this.hospitalName = hospitalName;
        if (issueType != null) this.issueType = issueType;
        this.method = method;
        this.processing = processing;
        if (memo != null) this.memo = memo;
        if (nextAppointmentDate != null) this.nextAppointmentDate = nextAppointmentDate;
        if (department != null) this.department = department;
        if (doctorName != null) this.doctorName = doctorName;
        if (patientComment != null) this.patientComment = patientComment;
        if (treatmentResult != null) this.treatmentResult = treatmentResult;
        if (diagnosisContent != null) this.diagnosisContent = diagnosisContent;
        if (diagnosisNameCode != null) this.diagnosisNameCode = diagnosisNameCode;
        if (medicationInstruction != null) this.medicationInstruction = medicationInstruction;
        if (counselorName != null) this.counselorName = counselorName;
        if (workDescription != null) this.workDescription = workDescription;
        if (doctorConfirmationSignature != null) this.doctorConfirmationSignature = doctorConfirmationSignature;
        if (durationHours != null) this.durationHours = durationHours;
        if (fee != null) this.fee = fee;
        if (memoCompleted != null) this.memoCompleted = memoCompleted;
        if (reportCompleted != null) this.reportCompleted = reportCompleted;
    }

    public boolean isConfirmed() {
        return this.confirmedAt != null;
    }
}
