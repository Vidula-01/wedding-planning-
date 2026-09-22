-- ==========================================================
-- WEDORA database — Vendors module
-- Adds the `vendors` table used by the Vendors page
-- (php/vendors_api.php, vendors.html).
--
-- Import AFTER wedora.sql, the same way:
--   mysql -u root -p wedora_db < vendors_table.sql
-- or via phpMyAdmin -> wedora_db -> Import
-- ==========================================================

USE wedora_db;

CREATE TABLE IF NOT EXISTS vendors (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150)   NOT NULL,
  category   VARCHAR(50)    NOT NULL,
  contact    VARCHAR(30)    NOT NULL,
  price      DECIMAL(12,2)  NOT NULL DEFAULT 0,
  notes      VARCHAR(255)   NULL,
  user_id    INT UNSIGNED   NULL,
  created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vendors_category (category),
  KEY fk_vendors_user (user_id),
  CONSTRAINT fk_vendors_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Sample vendors (same rows shown in the Vendors mockup)
-- ----------------------------------------------------------
INSERT INTO vendors (name, category, contact, price) VALUES
  ('Dream Studio',        'Photography', '077 123 4567', 150000.00),
  ('Ceylon Wedding Films', 'Videography', '077 987 6543', 120000.00),
  ('Galle Face Hotel',    'Venue',       '011 456 7890', 400000.00),
  ('Royal Caterers',      'Catering',    '011 123 4567', 250000.00),
  ('Gift of Flower',      'Florist',     '077 556 1111', 30000.00);
