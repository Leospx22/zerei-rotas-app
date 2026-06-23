-- Add packages table for tracking individual packages
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  stop_id UUID REFERENCES stops(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  stop_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to stops for grouping
ALTER TABLE stops ADD COLUMN package_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stops ADD COLUMN order_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stops ADD COLUMN zip_code TEXT;
ALTER TABLE stops ADD COLUMN latitude DECIMAL(10,8);
ALTER TABLE stops ADD COLUMN longitude DECIMAL(11,8);
ALTER TABLE stops ADD COLUMN normalized_address TEXT;

-- Enable RLS on packages
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Packages policies
CREATE POLICY "select_own_packages" ON packages FOR SELECT TO authenticated USING (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
CREATE POLICY "insert_own_packages" ON packages FOR INSERT TO authenticated WITH CHECK (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
CREATE POLICY "update_own_packages" ON packages FOR UPDATE TO authenticated USING (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
) WITH CHECK (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
CREATE POLICY "delete_own_packages" ON packages FOR DELETE TO authenticated USING (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
