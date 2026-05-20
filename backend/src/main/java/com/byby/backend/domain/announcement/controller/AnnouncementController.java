package com.byby.backend.domain.announcement.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.announcement.dto.AnnouncementRequest;
import com.byby.backend.domain.announcement.dto.AnnouncementResponse;
import com.byby.backend.domain.announcement.service.AnnouncementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping
    @PreAuthorize("hasRole('patient')")
    public ResponseEntity<Response<List<AnnouncementResponse.Summary>>> list(
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, announcementService.list(pageable, principal)));
    }

    /*
     * Admin announcement management endpoints disabled.
     *
    @PostMapping
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Response<AnnouncementResponse.Summary>> create(
            @Valid @RequestBody AnnouncementRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, announcementService.create(req, principal)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Response<AnnouncementResponse.Summary>> update(
            @PathVariable UUID id,
            @Valid @RequestBody AnnouncementRequest.Upsert req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, announcementService.update(id, req, principal)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ResponseEntity<Response<Void>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        announcementService.delete(id, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }
    */
}
