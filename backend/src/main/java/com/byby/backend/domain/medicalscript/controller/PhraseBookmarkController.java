package com.byby.backend.domain.medicalscript.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.medicalscript.dto.PhraseBookmarkDto;
import com.byby.backend.domain.medicalscript.service.PhraseBookmarkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/phrase-bookmarks")
@RequiredArgsConstructor
@Tag(name = "PhraseBookmarks", description = "의료 문구 북마크 API")
public class PhraseBookmarkController {

    private final PhraseBookmarkService bookmarkService;

    @GetMapping
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "북마크 목록 조회")
    public ResponseEntity<Response<List<PhraseBookmarkDto.BookmarkResponse>>> getAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                Response.success(SuccessCode.OK, bookmarkService.getAll(principal)));
    }

    @PostMapping
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "북마크 저장")
    public ResponseEntity<Response<PhraseBookmarkDto.BookmarkResponse>> save(
            @Valid @RequestBody PhraseBookmarkDto.SaveRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201)
                .body(Response.success(SuccessCode.CREATED, bookmarkService.save(req, principal)));
    }

    @DeleteMapping
    @PreAuthorize("hasRole('patient')")
    @Operation(summary = "북마크 삭제")
    public ResponseEntity<Response<Void>> delete(
            @RequestParam String koText,
            @AuthenticationPrincipal UserPrincipal principal) {
        bookmarkService.delete(koText, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }
}
