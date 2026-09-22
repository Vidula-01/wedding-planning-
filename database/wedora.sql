-- ==========================================================
-- WEDORA database
-- Import this file in phpMyAdmin (Import tab) or run:
--   mysql -u root -p < wedora.sql
-- ==========================================================

CREATE DATABASE IF NOT EXISTS wedora_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wedora_db;

-- ----------------------------------------------------------
-- Users table – stores registered members
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,   -- never store the plain password
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- User sessions table – optional, tracks active logins
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  session_id VARCHAR(128)  NOT NULL,
  ip_address VARCHAR(45)   NULL,
  user_agent TEXT          NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_id (session_id),
  KEY fk_sessions_user (user_id),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ----------------------------------------------------------
-- Newsletter subscribers – emails captured on the home page
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  email         VARCHAR(150)  NOT NULL,
  ip_address    VARCHAR(45)   NULL,
  subscribed_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscriber_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- Password reset tokens table – for forgot password feature
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED  NOT NULL,
  token      VARCHAR(128)  NOT NULL,
  used       TINYINT(1)    NOT NULL DEFAULT 0,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP     NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token),
  KEY fk_reset_user (user_id),
  CONSTRAINT fk_reset_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
