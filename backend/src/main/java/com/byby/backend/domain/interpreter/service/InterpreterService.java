package com.byby.backend.domain.interpreter.service;

import com.byby.backend.common.exception.BusinessException;
import com.byby.backend.common.exception.GeneralException;
import com.byby.backend.common.response.code.BusinessErrorCode;
import com.byby.backend.common.response.code.GeneralErrorCode;
import com.byby.backend.common.security.UserPrincipal;
import com.byby.backend.domain.admin.service.AdminService;
import com.byby.backend.domain.auth.service.AuthService;
import com.byby.backend.domain.center.entity.Center;
import com.byby.backend.domain.center.service.CenterService;
import com.byby.backend.domain.consultation.repository.ConsultationRepository;
import com.byby.backend.domain.interpreter.dto.InterpreterRequest;
import com.byby.backend.domain.interpreter.dto.InterpreterResponse;
import com.byby.backend.domain.interpreter.entity.Interpreter;
import com.byby.backend.domain.interpreter.repository.InterpreterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InterpreterService {

    private final InterpreterRepository interpreterRepository;
    private final AuthService authService;
    private final AdminService adminService;
    private final CenterService centerService;
    private final ConsultationRepository consultationRepository;

    @Transactional
    public InterpreterResponse.Detail create(InterpreterRequest.Create req, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Center adminCenter = adminService.getAdminCenter(principal);
        if (interpreterRepository.existsByAuthUserId(req.authUserId())) {
            throw new BusinessException(BusinessErrorCode.INTERPRETER_ALREADY_EXISTS);
        }
        Center center = req.centerId() != null ? centerService.find(req.centerId()) : adminCenter;
        if (!center.getId().equals(adminCenter.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "같은 센터 통번역가만 생성할 수 있습니다");
        }
        Interpreter interpreter = Interpreter.builder()
                .authUserId(req.authUserId())
                .name(req.name())
                .phone(req.phone())
                .role(req.role())
                .center(center)
                .languages(req.languages())
                .availabilityNote(req.availabilityNote())
                .build();
        return InterpreterResponse.Detail.from(interpreterRepository.save(interpreter));
    }

    @Transactional
    public Page<InterpreterResponse.Summary> getAll(String query, String language, Pageable pageable, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Center adminCenter = adminService.getAdminCenter(principal);
        YearMonth month = YearMonth.now();
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        return interpreterRepository.searchByCenter(adminCenter.getId(), query, language, pageable)
                .map(interpreter -> InterpreterResponse.Summary.from(
                        interpreter,
                        consultationRepository.sumDurationHoursByInterpreterIdAndDateBetween(interpreter.getId(), from, to)));
    }

    public InterpreterResponse.Detail getById(UUID id, UserPrincipal principal) {
        Interpreter interpreter = findInterpreter(id);
        if (principal.isAdmin()) {
            requireSameCenter(interpreter, principal);
        } else if (!interpreter.getAuthUserId().equals(principal.getAuthUserId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        return InterpreterResponse.Detail.from(interpreter);
    }

    @Transactional
    public InterpreterResponse.Detail update(UUID id, InterpreterRequest.Update req, UserPrincipal principal) {
        Interpreter interpreter = findInterpreter(id);
        if (principal.isAdmin()) {
            requireSameCenter(interpreter, principal);
        } else if (!interpreter.getAuthUserId().equals(principal.getAuthUserId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        }
        if (!principal.isAdmin() && req.role() != null && req.role() != interpreter.getRole()) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "Only center staff can change interpreter roles");
        }
        if (!principal.isAdmin() && req.phone() != null
                && !Objects.equals(AuthService.normalizePhone(req.phone()), AuthService.normalizePhone(interpreter.getPhone()))) {
            authService.syncPhone(principal.getAuthUserId(), req.phone());
        }
        interpreter.updateInfo(req.name(), req.phone(), req.role(), req.languages(), req.availabilityNote());
        return InterpreterResponse.Detail.from(interpreter);
    }

    @Transactional
    public void deactivate(UUID id, UserPrincipal principal) {
        if (!principal.isAdmin()) throw new GeneralException(GeneralErrorCode.FORBIDDEN);
        Interpreter interpreter = findInterpreter(id);
        requireSameCenter(interpreter, principal);
        interpreter.deactivate();
    }

    public Interpreter findInterpreter(UUID id) {
        return interpreterRepository.findById(id)
                .orElseThrow(() -> new BusinessException(BusinessErrorCode.INTERPRETER_NOT_FOUND));
    }

    private void requireSameCenter(Interpreter interpreter, UserPrincipal principal) {
        Center adminCenter = adminService.getAdminCenter(principal);
        if (interpreter.getCenter() == null || !interpreter.getCenter().getId().equals(adminCenter.getId())) {
            throw new GeneralException(GeneralErrorCode.FORBIDDEN, "다른 센터 통번역가는 관리할 수 없습니다");
        }
    }
}
