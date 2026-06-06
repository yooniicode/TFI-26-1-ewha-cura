package com.byby.backend.domain.chat.controller;

import com.byby.backend.common.response.Response;
import com.byby.backend.common.response.code.SuccessCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.chat.dto.ChatRequest;
import com.byby.backend.domain.chat.dto.ChatResponse;
import com.byby.backend.domain.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "채팅 API")
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "내 채팅방 목록 조회")
    @GetMapping("/rooms")
    public ResponseEntity<Response<List<ChatResponse.RoomSummary>>> getRooms(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK, chatService.getRooms(principal)));
    }

    @Operation(summary = "통번역가와 채팅방 생성/조회", description = "센터 직원 또는 이주민이 통번역가와의 채팅방을 생성하거나 기존 방을 조회합니다.")
    @PostMapping("/rooms/with-interpreter/{interpreterId}")
    public ResponseEntity<Response<ChatResponse.RoomSummary>> roomWithInterpreter(
            @PathVariable UUID interpreterId,
            @AuthenticationPrincipal UserPrincipal principal) {
        ChatResponse.RoomSummary room = principal.isPatient()
                ? chatService.getOrCreateRoomWithPatientInterpreter(interpreterId, principal)
                : chatService.getOrCreateRoomWithInterpreter(interpreterId, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK, room));
    }

    @Operation(summary = "이주민과 채팅방 생성/조회", description = "통번역가가 담당 이주민과의 채팅방을 생성하거나 기존 방을 조회합니다.")
    @PostMapping("/rooms/with-patient/{patientId}")
    public ResponseEntity<Response<ChatResponse.RoomSummary>> roomWithPatient(
            @PathVariable UUID patientId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                chatService.getOrCreateRoomWithMatchedPatient(patientId, principal)));
    }

    @Operation(summary = "메시지 목록 조회", description = "채팅방의 메시지를 오래된 순으로 페이징 조회합니다.")
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<Response<List<ChatResponse.Message>>> getMessages(
            @PathVariable UUID roomId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                chatService.getMessages(roomId, pageable, principal)));
    }

    @Operation(summary = "메시지 전송")
    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<Response<ChatResponse.Message>> sendMessage(
            @PathVariable UUID roomId,
            @Valid @RequestBody ChatRequest.SendMessage req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(201).body(Response.success(SuccessCode.CREATED,
                chatService.sendMessage(roomId, req.content(), principal)));
    }

    @Operation(summary = "채팅방 읽음 처리")
    @PutMapping("/rooms/{roomId}/read")
    public ResponseEntity<Response<Void>> markRead(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserPrincipal principal) {
        chatService.markRead(roomId, principal);
        return ResponseEntity.ok(Response.success(SuccessCode.OK));
    }

    @Operation(summary = "전체 미읽음 메시지 수 조회")
    @GetMapping("/unread-count")
    public ResponseEntity<Response<ChatResponse.UnreadCount>> unreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Response.success(SuccessCode.OK,
                chatService.getUnreadCount(principal)));
    }
}
