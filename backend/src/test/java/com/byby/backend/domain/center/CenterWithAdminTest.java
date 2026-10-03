package com.byby.backend.domain.center;

import com.byby.backend.common.enums.UserRole;
import com.byby.backend.domain.auth.dto.AuthRequest;
import com.byby.backend.domain.auth.dto.AuthResponse;
import com.byby.backend.domain.auth.service.AuthService;
import com.byby.backend.domain.center.dto.CenterRequest;
import com.byby.backend.domain.center.dto.CenterResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class CenterWithAdminTest {

    @Autowired AuthService authService;

    @Test
    @DisplayName("센터 등록과 함께 발급한 관리자 계정으로 바로 로그인할 수 있다")
    void issuedAdminCanLogin() {
        CenterResponse.WithAdmin result = authService.registerCenterWithAdmin(new CenterRequest.DevCreateWithAdmin(
                "secret", "테스트발급센터", null, null, null, null));

        assertThat(result.adminEmail()).startsWith("admin-").endsWith("@cura-ewha.kr");
        assertThat(result.adminPassword()).hasSize(16);

        AuthResponse.TokenMe login = authService.login(new AuthRequest.Login(result.adminEmail(), result.adminPassword()));
        assertThat(login.me().role()).isEqualTo(UserRole.admin);
        assertThat(login.me().centerId()).isEqualTo(result.center().id());
    }
}
