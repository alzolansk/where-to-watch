-- Onboarding preferences support for MySQL
-- Run inside the `db_login` database (phpMyAdmin compatible)

DELIMITER $$
CREATE PROCEDURE ensure_onboarding_column()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'tb_users'
          AND COLUMN_NAME = 'onboarding_completed_at'
    ) THEN
        ALTER TABLE tb_users
            ADD COLUMN onboarding_completed_at DATETIME NULL AFTER email_user;
    END IF;
END $$
DELIMITER ;
CALL ensure_onboarding_column();
DROP PROCEDURE ensure_onboarding_column;

CREATE TABLE IF NOT EXISTS user_keywords (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    keyword_id  INT UNSIGNED DEFAULT NULL,
    label       VARCHAR(120) NOT NULL,
    weight      DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_keyword_label (user_id, label),
    KEY idx_keyword_id (keyword_id),
    CONSTRAINT fk_user_keywords_user
        FOREIGN KEY (user_id) REFERENCES tb_users(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$
CREATE PROCEDURE migrate_user_keywords()
BEGIN
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_keywords'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_keywords'
              AND COLUMN_NAME = 'id'
        ) THEN
            ALTER TABLE user_keywords
                DROP PRIMARY KEY,
                ADD COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
                ADD PRIMARY KEY (id);
        END IF;

        IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_keywords'
              AND COLUMN_NAME = 'keyword_id'
              AND IS_NULLABLE = 'NO'
        ) THEN
            ALTER TABLE user_keywords
                MODIFY COLUMN keyword_id INT UNSIGNED NULL DEFAULT NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_keywords'
              AND INDEX_NAME = 'uq_user_keyword_label'
        ) THEN
            ALTER TABLE user_keywords
                ADD UNIQUE KEY uq_user_keyword_label (user_id, label);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_keywords'
              AND INDEX_NAME = 'idx_keyword_id'
        ) THEN
            ALTER TABLE user_keywords
                ADD KEY idx_keyword_id (keyword_id);
        END IF;
    END IF;
END $$
DELIMITER ;
CALL migrate_user_keywords();
DROP PROCEDURE migrate_user_keywords;

CREATE TABLE IF NOT EXISTS user_favorite_titles (
    user_id     INT UNSIGNED    NOT NULL,
    tmdb_id     INT UNSIGNED    NOT NULL,
    media_type  ENUM('movie','tv') NOT NULL DEFAULT 'movie',
    title       VARCHAR(180)    NOT NULL,
    logo_path   VARCHAR(255)    DEFAULT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tmdb_id, media_type),
    CONSTRAINT fk_user_favorite_titles_user
        FOREIGN KEY (user_id) REFERENCES tb_users(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
