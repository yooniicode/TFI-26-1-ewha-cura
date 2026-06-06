package com.byby.backend.domain.announcement.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.announcement.dto.AnnouncementRequest;
import com.byby.backend.domain.announcement.dto.AnnouncementResponse;
import com.byby.backend.domain.announcement.entity.Announcement;
import com.byby.backend.domain.announcement.repository.AnnouncementRepository;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.entity.PatientCenter;
import com.byby.backend.domain.patient.repository.PatientCenterRepository;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final AdminService adminService;
    private final PatientRepository patientRepository;
    private final PatientCenterRepository patientCenterRepository;

    public Page<AnnouncementResponse.Summary> list(Pageable pageable, UserPrincipal principal) {
        requireAuthenticated(principal);
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        if (principal.isAdmin()) {
            Center center = adminService.getAdminCenter(principal);
            return announcementRepository.findByCenter_IdOrderByPinnedDescCreatedAtDesc(center.getId(), unsorted)
                    .map(AnnouncementResponse.Summary::from);
        }
        if (principal.isPatient()) {
            Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                    .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
            List<UUID> centerIds = patientCenterRepository.findByPatientId(patient.getId()).stream()
                    .map(PatientCenter::getCenter)
                    .map(Center::getId)
                    .toList();
            if (centerIds.isEmpty()) return Page.empty(pageable);
            return announcementRepository.findByCenter_IdInOrderByPinnedDescCreatedAtDesc(centerIds, unsorted)
                    .map(AnnouncementResponse.Summary::from);
        }
        throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    @Transactional
    public AnnouncementResponse.Summary create(AnnouncementRequest.Upsert req, UserPrincipal principal) {
        requireAdmin(principal);
        Center center = adminService.getAdminCenter(principal);
        Announcement announcement = Announcement.builder()
                .center(center)
                .authorAuthUserId(principal.getAuthUserId())
                .category(req.category())
                .title(req.title().trim())
                .content(req.content().trim())
                .linkUrl(trimToNull(req.linkUrl()))
                .pinned(req.pinned())
                .build();
        return AnnouncementResponse.Summary.from(announcementRepository.save(announcement));
    }

    @Transactional
    public AnnouncementResponse.Summary update(UUID id, AnnouncementRequest.Upsert req, UserPrincipal principal) {
        requireAdmin(principal);
        Center center = adminService.getAdminCenter(principal);
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        if (!announcement.getCenter().getId().equals(center.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        announcement.update(req.category(), req.title().trim(), req.content().trim(),
                trimToNull(req.linkUrl()), req.pinned());
        return AnnouncementResponse.Summary.from(announcement);
    }

    @Transactional
    public void delete(UUID id, UserPrincipal principal) {
        requireAdmin(principal);
        Center center = adminService.getAdminCenter(principal);
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        if (!announcement.getCenter().getId().equals(center.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        announcementRepository.delete(announcement);
    }

    private void requireAuthenticated(UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);
    }

    private void requireAdmin(UserPrincipal principal) {
        requireAuthenticated(principal);
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
