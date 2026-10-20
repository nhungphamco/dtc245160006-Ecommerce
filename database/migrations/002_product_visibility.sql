-- Migration 002: product visibility. Prepare only; do not run without approval.
-- Before applying: back up the database, verify a restore, stop application writes.
-- Apply before deploying the Admin backend. Existing products remain available.
ALTER TABLE products
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD INDEX idx_products_active_id (is_active, id);
-- Rollback: revert backend first, then (only with approval) drop the index/column.
-- Prefer restoring the backup if the migration does not complete as expected.
