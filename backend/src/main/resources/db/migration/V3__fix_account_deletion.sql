-- interpreter.auth_user_id 를 nullable 로 변경 (탈퇴 시 soft-delete 허용)
-- 탈퇴한 계정은 진료 기록 보존을 위해 레코드 자체를 삭제하지 않고
-- auth_user_id 만 null 처리 + active = false 로 처리한다.
ALTER TABLE interpreter ALTER COLUMN auth_user_id DROP NOT NULL;
