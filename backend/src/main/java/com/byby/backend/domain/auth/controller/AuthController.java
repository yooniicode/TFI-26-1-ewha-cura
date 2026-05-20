package com.byby.backend.domain.auth.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.auth.dto.AuthRequest;
import com.byby.backend.domain.auth.dto.AuthResponse;
import com.byby.backend.domain.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "인증/내 정보 API")
public class AuthController {

    private final AuthService authService;

    @GetMapping("/me")
    @Operation(summary = "내 인증/역할 정보 조회")
    public ResponseEntity<Response<AuthResponse.Me>> me(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, authService.getMe(principal)));
    }

    @GetMapping("/email-exists")
    @Operation(summary = "이메일 가입 여부 확인")
    public ResponseEntity<Response<AuthResponse.EmailExists>> emailExists(
            @RequestParam String email) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                new AuthResponse.EmailExists(authService.emailExists(email))));
    }

    @PostMapping("/complete-signup")
    @Operation(summary = "이메일 인증 완료 후 통번역가 프로필 사전 생성")
    public ResponseEntity<Response<Void>> completeSignup(
            @AuthenticationPrincipal UserPrincipal principal) {
        authService.completeSignup(principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }

    @PostMapping("/register-profile")
    @Operation(summary = "내 role 기반 프로필 생성/보정", description = "PATIENT/INTERPRETER role에 맞춰 최초 프로필을 생성합니다. 이미 존재하면 무시됩니다.")
    public ResponseEntity<Response<Void>> registerProfile(
            @Valid @RequestBody AuthRequest.RegisterProfile req,
            @AuthenticationPrincipal UserPrincipal principal) {
        authService.registerProfile(req, principal);
        return ResponseEntity.status(201).body(Response.success(SuccessCode.CREATED));
    }

    /*
     * Admin bootstrap/member-management endpoints disabled.
     *
    @PostMapping("/bootstrap-admin")
    @Operation(summary = "최초 센터 직원 계정 생성", description = "승인 가능한 센터 직원이 아직 없을 때 현재 로그인 사용자를 최초 센터 직원으로 승격합니다.")
    public ResponseEntity<Response<AuthResponse.Me>> bootstrapAdmin(
            @Valid @RequestBody AuthRequest.BootstrapAdmin req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, authService.bootstrapAdmin(req, principal)));
    }

    @GetMapping("/members")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "비이주민 회원 목록 조회")
    public ResponseEntity<Response<List<AuthResponse.Member>>> getNonPatientMembers(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, authService.getNonPatientMembers(principal)));
    }

    @PatchMapping("/members/{authUserId}/role")
    @PreAuthorize("hasRole('admin')")
    @Operation(summary = "비이주민 회원 역할 변경")
    public ResponseEntity<Response<AuthResponse.Member>> updateMemberRole(
            @PathVariable UUID authUserId,
            @Valid @RequestBody AuthRequest.UpdateMemberRole req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, authService.updateMemberRole(authUserId, req, principal)));
    }
    */

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "회원 탈퇴")
    public ResponseEntity<Response<Void>> deleteAccount(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new GeneralException(GeneralErrorCode.UNAUTHORIZED);
        authService.deleteAccount(principal.getAuthUserId());
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }

}
