package com.byby.backend.domain.chat.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import com.byby.backend.domain.admin.repository.AdminProfileRepository;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.chat.dto.ChatResponse;
import com.byby.backend.domain.chat.entity.ChatMessage;
import com.byby.backend.domain.chat.entity.ChatRoom;
import com.byby.backend.domain.chat.entity.ChatRoomMember;
import com.byby.backend.domain.chat.repository.ChatMessageRepository;
import com.byby.backend.domain.chat.repository.ChatRoomMemberRepository;
import com.byby.backend.domain.chat.repository.ChatRoomRepository;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.matching.repository.PatientMatchRepository;
import com.byby.backend.domain.patient.entity.Patient;
import com.byby.backend.domain.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final InterpreterRepository interpreterRepository;
    private final PatientRepository patientRepository;
    private final PatientMatchRepository patientMatchRepository;
    private final ConsultationRepository consultationRepository;
    private final AdminService adminService;
    private final AdminProfileRepository adminProfileRepository;

    // ─── 채팅방 생성/조회 ─────────────────────────────────────────

    /** 센터 직원 → 통번역가 1:1 채팅방 (같은 센터만) */
    @Transactional
    public ChatResponse.RoomSummary getOrCreateRoomWithInterpreter(UUID interpreterId, UserPrincipal principal) {
        Interpreter interpreter = interpreterRepository.findById(interpreterId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));

        UUID myAuthId = principal.getAuthUserId();
        UUID targetAuthId = interpreter.getAuthUserId();

        // 같은 센터 검증 (admin의 경우)
        if (principal.isAdmin()) {
            var adminCenter = adminService.getAdminCenter(principal);
            if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(adminCenter.getId())) {
                throw new GeneralException(GeneralErrorCode.FORBIDDEN);
            }
        }
        // 통번역가끼리는 허용하지 않음 (이 엔드포인트는 admin/patient 전용)
        if (principal.isInterpreter()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }

        String roomName = interpreter.getName() != null ? interpreter.getName() : "통번역가";
        return getOrCreateDirectRoom(myAuthId, targetAuthId, roomName,
                resolveSenderName(principal), roleOf(principal), interpreter.getName(), "interpreter");
    }

    /** 이주민 → 통번역가 1:1 채팅방 (활성 매칭 필수) */
    @Transactional
    public ChatResponse.RoomSummary getOrCreateRoomWithPatientInterpreter(UUID interpreterId, UserPrincipal principal) {
        if (!principal.isPatient()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);

        Patient patient = patientRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));
        Interpreter interpreter = interpreterRepository.findById(interpreterId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));

        boolean matched = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(
                patient.getId(), interpreter.getId())
                || consultationRepository.existsByPatientIdAndInterpreterId(patient.getId(), interpreter.getId());
        if (!matched) throw new GeneralException(GeneralErrorCode.FORBIDDEN);

        return getOrCreateDirectRoom(
                principal.getAuthUserId(), interpreter.getAuthUserId(),
                interpreter.getName() != null ? interpreter.getName() : "통번역가",
                patient.getName(), "patient", interpreter.getName(), "interpreter"
        );
    }

    /** 통번역가 → 이주민 1:1 채팅방 (활성 매칭 필수) */
    @Transactional
    public ChatResponse.RoomSummary getOrCreateRoomWithMatchedPatient(UUID patientId, UserPrincipal principal) {
        if (!principal.isInterpreter()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);

        Interpreter interpreter = interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.PATIENT_NOT_FOUND));

        boolean matched = patientMatchRepository.existsByPatientIdAndInterpreterIdAndActiveTrue(
                patient.getId(), interpreter.getId())
                || consultationRepository.existsByPatientIdAndInterpreterId(patient.getId(), interpreter.getId());
        if (!matched) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        if (patient.getAuthUserId() == null) {
            throw new GeneralException(GeneralErrorCode.BAD_REQUEST, "Linked patient account is required");
        }

        return getOrCreateDirectRoom(
                principal.getAuthUserId(), patient.getAuthUserId(),
                patient.getName() != null ? patient.getName() : "이주민",
                interpreter.getName(), "interpreter", patient.getName(), "patient"
        );
    }

    // ─── 메시지 조회 ─────────────────────────────────────────────

    public List<ChatResponse.RoomSummary> getRooms(UserPrincipal principal) {
        List<ChatRoom> rooms = chatRoomRepository.findRoomsByMember(principal.getAuthUserId());
        return rooms.stream().map(room -> buildRoomSummary(room, principal.getAuthUserId())).toList();
    }

    public Page<ChatResponse.Message> getMessages(UUID roomId, Pageable pageable, UserPrincipal principal) {
        ChatRoom room = findRoomAsParticipant(roomId, principal.getAuthUserId());
        return chatMessageRepository.findByRoomOrderByCreatedAtAsc(room, pageable)
                .map(ChatResponse.Message::from);
    }

    // ─── 메시지 전송 ─────────────────────────────────────────────

    @Transactional
    public ChatResponse.Message sendMessage(UUID roomId, String content, UserPrincipal principal) {
        ChatRoom room = findRoomAsParticipant(roomId, principal.getAuthUserId());
        String senderName = resolveSenderName(principal);
        ChatMessage message = ChatMessage.builder()
                .room(room)
                .senderAuthUserId(principal.getAuthUserId())
                .senderName(senderName)
                .content(content.trim())
                .build();
        ChatMessage saved = chatMessageRepository.save(message);
        // room.updatedAt 갱신 (Hibernate dirty check)
        chatRoomRepository.save(room);
        return ChatResponse.Message.from(saved);
    }

    // ─── 읽음 처리 ─────────────────────────────────────────────

    @Transactional
    public void markRead(UUID roomId, UserPrincipal principal) {
        ChatRoom room = findRoomAsParticipant(roomId, principal.getAuthUserId());
        LocalDateTime readAt = chatMessageRepository.findTopByRoomOrderByCreatedAtDesc(room)
                .map(ChatMessage::getCreatedAt)
                .orElse(LocalDateTime.now());
        chatRoomMemberRepository.findByRoomAndAuthUserId(room, principal.getAuthUserId())
                .ifPresent(member -> member.updateLastRead(readAt));
    }

    // ─── 안 읽은 수 ──────────────────────────────────────────────

    public ChatResponse.UnreadCount getUnreadCount(UserPrincipal principal) {
        List<ChatRoom> rooms = chatRoomRepository.findRoomsByMember(principal.getAuthUserId());
        int total = rooms.stream().mapToInt(room -> countUnread(room, principal.getAuthUserId())).sum();
        return new ChatResponse.UnreadCount(total);
    }

    // ─── private helpers ─────────────────────────────────────────

    private ChatResponse.RoomSummary getOrCreateDirectRoom(
            UUID myAuthId, UUID targetAuthId, String roomName,
            String myName, String myRole, String targetName, String targetRole) {

        ChatRoom room = chatRoomRepository.findDirectRoom(myAuthId, targetAuthId)
                .orElseGet(() -> {
                    ChatRoom newRoom = chatRoomRepository.save(ChatRoom.builder().name(roomName).build());
                    chatRoomMemberRepository.save(ChatRoomMember.builder()
                            .room(newRoom).authUserId(myAuthId)
                            .memberName(myName).role(myRole).build());
                    chatRoomMemberRepository.save(ChatRoomMember.builder()
                            .room(newRoom).authUserId(targetAuthId)
                            .memberName(targetName).role(targetRole).build());
                    return newRoom;
                });

        return buildRoomSummary(room, myAuthId);
    }

    private ChatResponse.RoomSummary buildRoomSummary(ChatRoom room, UUID myAuthId) {
        List<ChatRoomMember> members = chatRoomMemberRepository.findByRoom(room);
        ChatMessage lastMsg = chatMessageRepository.findTopByRoomOrderByCreatedAtDesc(room).orElse(null);
        int unread = countUnread(room, myAuthId);
        return ChatResponse.RoomSummary.from(room, members, lastMsg, unread, myAuthId);
    }

    private int countUnread(ChatRoom room, UUID authUserId) {
        return chatRoomMemberRepository.findByRoomAndAuthUserId(room, authUserId)
                .map(m -> {
                    LocalDateTime since = m.getLastReadAt() != null ? m.getLastReadAt() : LocalDateTime.MIN;
                    return chatMessageRepository.countUnreadByRoom(room, since, authUserId);
                })
                .orElse(0);
    }

    private ChatRoom findRoomAsParticipant(UUID roomId, UUID authUserId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.NOT_FOUND));
        chatRoomMemberRepository.findByRoomAndAuthUserId(room, authUserId)
                .orElseThrow(() -> new GeneralException(GeneralErrorCode.FORBIDDEN));
        return room;
    }

    private String roleOf(UserPrincipal principal) {
        if (principal.isAdmin()) return "admin";
        if (principal.isInterpreter()) return "interpreter";
        return "patient";
    }

    private String resolveSenderName(UserPrincipal principal) {
        if (principal.isAdmin()) {
            return adminProfileRepository.findByAuthUserId(principal.getAuthUserId())
                    .map(p -> p.getNickname() != null ? p.getNickname() : "센터 직원")
                    .orElse("센터 직원");
        }
        if (principal.isInterpreter()) {
            return interpreterRepository.findByAuthUserId(principal.getAuthUserId())
                    .map(i -> i.getName() != null ? i.getName() : "통번역가")
                    .orElse("통번역가");
        }
        return patientRepository.findByAuthUserId(principal.getAuthUserId())
                .map(p -> p.getName() != null ? p.getName() : "이주민")
                .orElse("이주민");
    }
}
