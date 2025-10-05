-- WYWatch recommendation support tables
-- Run against database `db_login`

CREATE TABLE IF NOT EXISTS user_providers (
    user_id     INT UNSIGNED NOT NULL,
    provider_id INT UNSIGNED NOT NULL,
    enabled     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, provider_id),
    CONSTRAINT fk_user_providers_user
        FOREIGN KEY (user_id) REFERENCES tb_users(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_providers_provider
        FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_genres (
    user_id    INT UNSIGNED    NOT NULL,
    genre_id   INT UNSIGNED    NOT NULL,
    weight     DECIMAL(4,2)    NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, genre_id),
    CONSTRAINT fk_user_genres_user
        FOREIGN KEY (user_id) REFERENCES tb_users(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_genres_genre
        FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_user_genres_weight
        CHECK (weight >= 0.00 AND weight <= 1.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS title_availability (
    tmdb_id        INT UNSIGNED                                    NOT NULL,
    media_type     ENUM('movie','tv')                              NOT NULL,
    provider_id    INT UNSIGNED                                    NOT NULL,
    region         CHAR(2)                                         NOT NULL DEFAULT 'BR',
    monetization   ENUM('flatrate','rent','buy','ads','free')      NOT NULL,
    last_checked_at DATETIME                                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tmdb_id, media_type, provider_id, region),
    KEY idx_title_availability_tmdb_region (tmdb_id, region),
    CONSTRAINT fk_title_availability_provider
        FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
