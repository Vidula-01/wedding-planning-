-- ==========================================================
-- WEDORA database
-- Import this file in phpMyAdmin (Import tab) or run:
--   mysql -u root -p < wedora.sql
-- ==========================================================

CREATE DATABASE IF NOT EXISTS wedora_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wedora_db;

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
