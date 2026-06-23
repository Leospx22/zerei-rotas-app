-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Nova Rota',
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  total_stops INTEGER NOT NULL DEFAULT 0,
  completed_stops INTEGER NOT NULL DEFAULT 0,
  estimated_distance_km DECIMAL(10,2) DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Stops table
CREATE TABLE stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  recipient_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  notes TEXT,
  completed_at TIMESTAMPTZ
);

-- Delivery history table
CREATE TABLE delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  distance_km DECIMAL(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "select_own_users" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_users" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_users" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Routes policies
CREATE POLICY "select_own_routes" ON routes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_routes" ON routes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_routes" ON routes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_routes" ON routes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Stops policies
CREATE POLICY "select_own_stops" ON stops FOR SELECT TO authenticated USING (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
CREATE POLICY "insert_own_stops" ON stops FOR INSERT TO authenticated WITH CHECK (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
CREATE POLICY "update_own_stops" ON stops FOR UPDATE TO authenticated USING (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
) WITH CHECK (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);
CREATE POLICY "delete_own_stops" ON stops FOR DELETE TO authenticated USING (
  route_id IN (SELECT id FROM routes WHERE user_id = auth.uid())
);

-- Delivery history policies
CREATE POLICY "select_own_history" ON delivery_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_history" ON delivery_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_history" ON delivery_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
