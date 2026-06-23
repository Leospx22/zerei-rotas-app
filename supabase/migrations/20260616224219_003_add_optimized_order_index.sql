-- Add optimized_order_index to stops for route optimization results
ALTER TABLE stops ADD COLUMN IF NOT EXISTS optimized_order_index INTEGER;

-- Add total_packages to routes for quick access
ALTER TABLE routes ADD COLUMN IF NOT EXISTS total_packages INTEGER NOT NULL DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS delivered_packages INTEGER NOT NULL DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
