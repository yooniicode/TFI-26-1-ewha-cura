package com.byby.backend.domain.consultation.entity;

import com.byby.backend.common.entity.BaseEntity;
import com.byby.backend.common.enums.ConsultationMethod;
import com.byby.backend.common.enums.IssueType;
import com.byby.backend.common.enums.MatchingDisplayStatus;
import com.byby.backend.common.enums.MatchingStatus;
import com.byby.backend.common.enums.ProcessingType;
import com.byby.backend.common.enums.ReportStatus;
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

    @Column(length = 10)
    private String translationLang;

    @Column(columnDefinition = "TEXT")
    private String translatedPatientComment;

    @Column(columnDefinition = "TEXT")
    private String translatedDiagnosisContent;

    @Column(columnDefinition = "TEXT")
    private String translatedTreatmentResult;

    @Column(columnDefinition = "TEXT")
    private String translatedMedicationInstruction;

    @Column(columnDefinition = "TEXT")
    private String translatedDiagnosisNameCode;

    @Column(columnDefinition = "TEXT")
    private String doctorConfirmationSignature;

    @Column(precision = 4, scale = 1)
    private BigDecimal durationHours;

    private Integer fee;

    private LocalDate nextAppointmentDate;

    @Column(length = 5)
    private String nextAppointmentTime;

    private LocalDate confirmedAt;

    @Column(length = 100)
    private String confirmedBy;

    @Column(length = 20)
    private String confirmedByPhone;

    // ─── AD-06 매칭 관리 ────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MatchingStatus matchingStatus = MatchingStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String matchingRejectReason;

    private LocalDateTime assignedAt;

    private UUID assignedByAuthUserId;

    /** 통번역가 거절 또는 센터장 배정 취소로 다시 배정해야 하는 요청 */
    @Column(nullable = false)
    private boolean reassignmentRequired = false;

    // ─── AD-보고서 승인 관리 ────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus reportStatus = ReportStatus.DRAFT;

    private LocalDateTime reportSubmittedAt;

    private LocalDateTime reportReviewedAt;

    private UUID reportReviewerAuthUserId;

    @Column(length = 100)
    private String reportReviewerName;

    @Column(columnDefinition = "TEXT")
    private String reportRejectReason;

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
                        BigDecimal durationHours, Integer fee, LocalDate nextAppointmentDate,
                        String nextAppointmentTime) {
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
        this.nextAppointmentTime = nextAppointmentTime;
        // 통번역가가 직접 생성한 보고서는 이미 배정 확정 상태
        if (interpreter != null) {
            this.matchingStatus = MatchingStatus.ASSIGNED;
            this.assignedAt = LocalDateTime.now();
        }
    }

    /** 통번역가가 대기 중인 요청을 직접 맡음 — 본인이 고른 것이므로 바로 배정 확정 */
    public void accept(Interpreter interpreter, LocalDateTime confirmedDate) {
        this.interpreter = interpreter;
        if (confirmedDate != null) this.consultationDate = confirmedDate;
        this.matchingStatus = MatchingStatus.ASSIGNED;
        this.matchingRejectReason = null;
        this.reassignmentRequired = false;
        this.assignedAt = LocalDateTime.now();
    }

    /** AD-06-2 센터장이 통번역가를 배정 → 통번역가 수락 대기 */
    public void assignByAdmin(Interpreter interpreter, LocalDateTime confirmedDate, UUID adminAuthUserId) {
        this.interpreter = interpreter;
        if (confirmedDate != null) this.consultationDate = confirmedDate;
        this.matchingStatus = MatchingStatus.AWAITING_ACCEPTANCE;
        this.matchingRejectReason = null;
        this.reassignmentRequired = false;
        this.assignedAt = LocalDateTime.now();
        this.assignedByAuthUserId = adminAuthUserId;
    }

    /** 통번역가가 센터장의 배정을 수락 */
    public void acceptAssignment() {
        this.matchingStatus = MatchingStatus.ASSIGNED;
    }

    /** 통번역가가 센터장의 배정을 거절 → 재배정 필요 */
    public void declineAssignment() {
        unassign();
    }

    /** AD-06-3 요청 거절 */
    public void rejectRequest(String reason, UUID adminAuthUserId) {
        this.matchingStatus = MatchingStatus.REJECTED;
        this.matchingRejectReason = reason;
        this.assignedByAuthUserId = adminAuthUserId;
        this.assignedAt = LocalDateTime.now();
    }

    /** 배정 해제 — 미배정 요청으로 돌아가며 '재배정 필요'로 표시 */
    public void unassign() {
        this.interpreter = null;
        this.matchingStatus = MatchingStatus.PENDING;
        this.matchingRejectReason = null;
        this.reassignmentRequired = true;
        this.assignedAt = null;
        this.assignedByAuthUserId = null;
    }

    public MatchingDisplayStatus getDisplayStatus() {
        return MatchingDisplayStatus.of(matchingStatus, reassignmentRequired, reportStatus);
    }

    /** CS-04-4 통번역가 제출 → 센터 승인 대기 */
    public void submitReport() {
        this.reportCompleted = true;
        this.reportStatus = ReportStatus.PENDING;
        this.reportSubmittedAt = LocalDateTime.now();
        this.reportReviewedAt = null;
        this.reportReviewerAuthUserId = null;
        this.reportReviewerName = null;
        this.reportRejectReason = null;
    }

    /** AD-보고서-2 승인 */
    public void approveReport(UUID reviewerAuthUserId, String reviewerName) {
        this.reportStatus = ReportStatus.APPROVED;
        this.reportReviewedAt = LocalDateTime.now();
        this.reportReviewerAuthUserId = reviewerAuthUserId;
        this.reportReviewerName = reviewerName;
        this.reportRejectReason = null;
    }

    /** AD-보고서-3 반려 */
    public void rejectReport(UUID reviewerAuthUserId, String reviewerName, String reason) {
        this.reportStatus = ReportStatus.REJECTED;
        this.reportReviewedAt = LocalDateTime.now();
        this.reportReviewerAuthUserId = reviewerAuthUserId;
        this.reportReviewerName = reviewerName;
        this.reportRejectReason = reason;
    }

    public boolean isReportSubmitted() {
        return this.reportStatus == ReportStatus.PENDING
                || this.reportStatus == ReportStatus.APPROVED
                || this.reportStatus == ReportStatus.REJECTED;
    }

    public void confirm(String confirmedBy, String confirmedByPhone) {
        this.confirmedAt = LocalDate.now();
        this.confirmedBy = confirmedBy;
        this.confirmedByPhone = confirmedByPhone;
    }

    public void update(LocalDateTime consultationDate, Hospital hospital, String hospitalName,
                       IssueType issueType,
                       ConsultationMethod method, ProcessingType processing,
                       String memo, LocalDate nextAppointmentDate, String nextAppointmentTime,
                       String department, String doctorName, String patientComment, String treatmentResult,
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
        if (nextAppointmentTime != null) this.nextAppointmentTime = nextAppointmentTime;
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
        if (reportCompleted != null) {
            // 최초 제출 또는 반려 후 재제출이면 승인 대기로 되돌린다
            if (reportCompleted && this.reportStatus != ReportStatus.APPROVED) {
                submitReport();
            } else if (!reportCompleted) {
                this.reportCompleted = false;
                if (this.reportStatus == ReportStatus.PENDING) this.reportStatus = ReportStatus.DRAFT;
            }
        }
    }

    public void applyTranslation(String langCode, String patientComment, String diagnosisContent,
                                  String treatmentResult, String medicationInstruction,
                                  String diagnosisNameCode) {
        this.translationLang = langCode;
        this.translatedPatientComment = patientComment;
        this.translatedDiagnosisContent = diagnosisContent;
        this.translatedTreatmentResult = treatmentResult;
        this.translatedMedicationInstruction = medicationInstruction;
        this.translatedDiagnosisNameCode = diagnosisNameCode;
    }

    public boolean isConfirmed() {
        return this.confirmedAt != null;
    }
}
