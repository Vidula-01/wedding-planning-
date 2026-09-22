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
  expires_at DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_id (session_id),
  KEY fk_sessions_user (user_id),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
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
  expires_at DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token),
  KEY fk_reset_user (user_id),
  CONSTRAINT fk_reset_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Tasks table – wedding planning task tracker
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED   NULL,
  title       VARCHAR(200)   NOT NULL,
  category    VARCHAR(100)   NOT NULL DEFAULT 'General',
  due_date    DATE           NULL,
  priority    ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  status      ENUM('To Do','In Progress','Completed') NOT NULL DEFAULT 'To Do',
  notes       TEXT           NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_tasks_user (user_id),
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Sample task data matching the Wedora task interface
-- ----------------------------------------------------------
INSERT INTO tasks (user_id, title, category, due_date, priority, status) VALUES
(NULL, 'Book Wedding Hotel',   'Venue',         '2026-05-25', 'High',   'Completed'),
(NULL, 'Select Photographer',  'Photography',   '2026-05-30', 'High',   'Completed'),
(NULL, 'Order Wedding Cake',   'Food',          '2026-06-05', 'Medium', 'To Do'),
(NULL, 'Send Invitations',     'Stationery',    '2026-06-10', 'Medium', 'To Do'),
(NULL, 'Bridal Dress Fitting', 'Attire',        '2026-06-15', 'Low',    'To Do'),
(NULL, 'Book DJ / Band',       'Entertainment', '2026-06-20', 'Low',    'To Do');

