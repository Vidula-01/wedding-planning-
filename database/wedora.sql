-- ==========================================================
-- WEDORA - COMPLETE DATABASE
-- ==========================================================
-- Import this ONE file in phpMyAdmin, or run:
--   mysql -u root -p < wedora.sql
--
-- This file contains the tables used by the current Wedora
-- project, including:
--   users
--   guests
--   user_sessions
--   newsletter_subscribers
--   password_reset_tokens
--   tasks
--   wedding_details
--   budget_items
--   payments
--   vendors
--
-- Profile photos are stored as files under uploads/profile; the path is stored in wedding_details.photo_path.
-- IMPORTANT:
-- This file creates the database structure only.
-- It does NOT insert demo tasks/vendors/payments, because
-- demo rows with NULL or guessed user IDs can cause those
-- records not to appear for the logged-in user.
-- ==========================================================

CREATE DATABASE IF NOT EXISTS wedora_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wedora_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- USERS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  address       VARCHAR(255) NULL,
  date_of_birth DATE NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- GUESTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS guests (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  name        VARCHAR(150) NOT NULL,
  side        ENUM('Bride Side','Groom Side','Both')
              NOT NULL DEFAULT 'Bride Side',
  category    ENUM('Family','Friend','Colleague','Other')
              NOT NULL DEFAULT 'Family',
  invitation  ENUM('Sent','Not Sent')
              NOT NULL DEFAULT 'Not Sent',
  rsvp        ENUM('Confirmed','Pending','Not Attending')
              NOT NULL DEFAULT 'Pending',
  phone       VARCHAR(20) NULL,
  email       VARCHAR(150) NULL,
  notes       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_guests_user (user_id),

  CONSTRAINT fk_guests_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- USER SESSIONS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  session_id VARCHAR(128) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_session_id (session_id),
  KEY idx_sessions_user (user_id),

  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- NEWSLETTER SUBSCRIBERS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(150) NOT NULL,
  ip_address    VARCHAR(45) NULL,
  subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_subscriber_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- PASSWORD RESET TOKENS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(128) NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token),
  KEY idx_reset_user (user_id),

  CONSTRAINT fk_reset_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- TASKS
-- ----------------------------------------------------------
-- The current Tasks page uses the status field.
-- Valid statuses:
--   To Do
--   In Progress
--   Completed
--
-- There is intentionally NO is_done column and NO sort_order
-- column here.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(100) NOT NULL DEFAULT 'General',
  due_date    DATE NULL,
  priority    ENUM('Low','Medium','High')
              NOT NULL DEFAULT 'Medium',
  status      ENUM('To Do','In Progress','Completed')
              NOT NULL DEFAULT 'To Do',
  notes       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_tasks_user (user_id),
  KEY idx_tasks_status (status),
  KEY idx_tasks_due_date (due_date),

  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- WEDDING DETAILS
-- ----------------------------------------------------------
-- These columns match the Wedding Details module currently
-- used by the project.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS wedding_details (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           INT UNSIGNED NOT NULL,

  bride_name        VARCHAR(150) NULL,
  groom_name        VARCHAR(150) NULL,
  partner_name      VARCHAR(150) NULL,

  wedding_date      DATE NULL,
  wedding_type      VARCHAR(100) NULL,
  wedding_venue     VARCHAR(255) NULL,

  expected_guests   INT NOT NULL DEFAULT 0,
  guests_confirmed  INT NOT NULL DEFAULT 0,

  estimated_budget  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_budget      DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent_budget      DECIMAL(12,2) NOT NULL DEFAULT 0,

  theme_notes       TEXT NULL,
  photo_path        VARCHAR(255) NULL,

  vendors_saved     INT NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  UNIQUE KEY uq_wedding_details_user (user_id),

  CONSTRAINT fk_wedding_details_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- BUDGET ITEMS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  category   VARCHAR(100) NOT NULL,
  estimated  DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual     DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_paid    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_budget_user (user_id),

  CONSTRAINT fk_budget_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------
-- The current Dashboard endpoint reads:
--   payment_name
--   amount
--   due_date
--   status
-- and filters status = 'upcoming'.
--
-- This table is therefore defined to match that current
-- Dashboard contract.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  payment_name  VARCHAR(200) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_date      DATE NULL,
  status        ENUM('upcoming','paid','overdue')
                NOT NULL DEFAULT 'upcoming',
  notes         TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_payments_user (user_id),
  KEY idx_payments_status (status),
  KEY idx_payments_due_date (due_date),

  CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- VENDORS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150) NOT NULL,
  category   VARCHAR(50) NOT NULL,
  contact    VARCHAR(30) NOT NULL,
  price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes      VARCHAR(255) NULL,
  user_id    INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_vendors_category (category),
  KEY idx_vendors_user (user_id),

  CONSTRAINT fk_vendors_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;


-- ==========================================================
-- OPTIONAL TEST DATA
-- ==========================================================
-- Do NOT put sample rows here unless you have a real user ID.
--
-- Example:
--
-- INSERT INTO tasks
--   (user_id, title, category, due_date, priority, status)
-- VALUES
--   (1, 'Book Wedding Hotel', 'Venue', '2026-05-25', 'High', 'Completed');
--
-- INSERT INTO vendors
--   (user_id, name, category, contact, price)
-- VALUES
--   (1, 'Dream Studio', 'Photography', '077 123 4567', 150000.00);
--
-- INSERT INTO payments
--   (user_id, payment_name, amount, due_date, status)
-- VALUES
--   (1, 'Wedding Hall Payment', 100000.00, '2026-06-01', 'upcoming');
--
-- Replace 1 with an actual users.id.
-- ==========================================================
