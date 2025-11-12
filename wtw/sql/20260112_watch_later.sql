-- Tabela para armazenar filmes marcados como "Assistir mais tarde"
CREATE TABLE IF NOT EXISTS watch_later (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    movie_title VARCHAR(255) NOT NULL,
    movie_poster VARCHAR(255),
    movie_backdrop VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_movie (user_id, movie_id),
    INDEX idx_user_id (user_id),
    INDEX idx_added_at (added_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
