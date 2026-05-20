package com.byby.backend.domain.admin.dto;

import com.byby.backend.domain.admin.entity.AdminProfile;
import com.byby.backend.domain.admin.entity.AdminWorkLog;
import com.byby.backend.domain.admin.entity.AdminWorkLogTask;
import com.byby.backend.domain.admin.entity.CenterPatientMemo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class AdminResponse {

    public record Profile(
            UUID id,
            UUID authUserId,
            UUID centerId,
            String centerName,
            String nickname
    ) {
        public static Profile from(AdminProfile profile) {
            return new Profile(profile.getId(), profile.getAuthUserId(),
                    profile.getCenter() != null ? profile.getCenter().getId() : null,
                    profile.getEffectiveCenterName(), profile.getNickname());
        }
    }

    public record WorkLogTask(
            String content,
            boolean checked
    ) {
        public static WorkLogTask from(AdminWorkLogTask task) {
            return new WorkLogTask(task.getContent(), task.isChecked());
        }
    }

    public record WorkLog(
            UUID id,
            LocalDate workDate,
            String memo,
            List<WorkLogTask> tasks,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static WorkLog from(AdminWorkLog log) {
            return new WorkLog(log.getId(), log.getWorkDate(), log.getMemo(),
                    log.getTasks().stream().map(WorkLogTask::from).toList(),
                    log.getCreatedAt(), log.getUpdatedAt());
        }
    }

    public record CenterStats(
            long patientCount,
            long interpreterCount,
            long activeMatchCount
    ) {}

    public record PatientMemo(
            UUID id,
            UUID patientId,
            UUID adminAuthUserId,
            String publicMemo,
            String privateMemo,
            boolean interpreterVisible,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static PatientMemo from(CenterPatientMemo memo, boolean includePrivate) {
            return new PatientMemo(memo.getId(), memo.getPatient().getId(), memo.getAdminAuthUserId(),
                    memo.getPublicMemo(), includePrivate ? memo.getPrivateMemo() : null,
                    memo.isInterpreterVisible(), memo.getCreatedAt(), memo.getUpdatedAt());
        }
    }
}
