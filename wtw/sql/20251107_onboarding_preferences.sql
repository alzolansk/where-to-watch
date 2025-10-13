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

DELIMITER $$
CREATE PROCEDURE migrate_user_favorite_titles()
BEGIN
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'user_favorite_titles'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'poster_path'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN poster_path VARCHAR(255) DEFAULT NULL AFTER logo_path;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'poster_url'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN poster_url VARCHAR(255) DEFAULT NULL AFTER poster_path;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'backdrop_path'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN backdrop_path VARCHAR(255) DEFAULT NULL AFTER poster_url;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'favorited_at'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN favorited_at TIMESTAMP NULL DEFAULT NULL AFTER backdrop_path;
            UPDATE user_favorite_titles
                SET favorited_at = created_at
                WHERE favorited_at IS NULL;
            ALTER TABLE user_favorite_titles
                MODIFY COLUMN favorited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'genres'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN genres VARCHAR(100) DEFAULT NULL AFTER favorited_at;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'keywords'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN keywords VARCHAR(100) DEFAULT NULL AFTER genres;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'user_favorite_titles'
              AND COLUMN_NAME = 'created_at'
        ) THEN
            ALTER TABLE user_favorite_titles
                ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER keywords;
        END IF;
    END IF;
END $$
DELIMITER ;
CALL migrate_user_favorite_titles();
DROP PROCEDURE migrate_user_favorite_titles;

CREATE TABLE IF NOT EXISTS user_favorite_titles (
    user_id     INT UNSIGNED    NOT NULL,
    tmdb_id     INT UNSIGNED    NOT NULL,
    media_type  ENUM('movie','tv') NOT NULL DEFAULT 'movie',
    title       VARCHAR(180)    NOT NULL,
    logo_path   VARCHAR(255)    DEFAULT NULL,
    poster_path VARCHAR(255)    DEFAULT NULL,
    poster_url  VARCHAR(255)    DEFAULT NULL,
    backdrop_path VARCHAR(255)  DEFAULT NULL,
    favorited_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    genres      VARCHAR(100)    DEFAULT NULL,
    keywords    VARCHAR(100)    DEFAULT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tmdb_id, media_type),
    CONSTRAINT fk_user_favorite_titles_user
        FOREIGN KEY (user_id) REFERENCES tb_users(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
