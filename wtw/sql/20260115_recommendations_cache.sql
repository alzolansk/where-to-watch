-- Recommendations cache support table
-- Run against database `db_login`

CREATE TABLE IF NOT EXISTS recommendations_cache (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    cache_key VARCHAR(120) NOT NULL,
    seed VARCHAR(64) NOT NULL,
    payload JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recommendations_cache_user_key (user_id, cache_key),
    KEY idx_recommendations_cache_expires (expires_at),
    CONSTRAINT fk_recommendations_cache_user
        FOREIGN KEY (user_id) REFERENCES tb_users(id_user)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
