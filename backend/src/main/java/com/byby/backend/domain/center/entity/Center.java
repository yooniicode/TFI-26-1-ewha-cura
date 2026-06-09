package com.byby.backend.domain.center.entity;

import com.byby.backend.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "center")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Center extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 200)
    private String name;

    @Column(length = 300)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 100)
    private String spreadsheetId;

    @Builder
    public Center(String name, String address, String phone) {
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.active = true;
    }

    public void update(String name, String address, String phone, Boolean active) {
        if (name != null) this.name = name;
        if (address != null) this.address = address;
        if (phone != null) this.phone = phone;
        if (active != null) this.active = active;
    }

    public void updateSpreadsheetId(String spreadsheetId) {
        this.spreadsheetId = spreadsheetId;
    }
}
