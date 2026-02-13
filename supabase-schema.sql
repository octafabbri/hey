-- Hey App: Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- Clean up any previous partial runs
-- ============================================
DROP TABLE IF EXISTS counter_proposals CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at();

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table (device-based identity for MVP)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('fleet', 'provider')),
  name TEXT NOT NULL DEFAULT '',
  company_name TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_device ON users(device_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Service Requests table
-- ============================================
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contact
  driver_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  fleet_name TEXT NOT NULL,

  -- Service
  service_type TEXT NOT NULL CHECK (service_type IN ('TIRE', 'MECHANICAL')),
  urgency TEXT NOT NULL CHECK (urgency IN ('ERS', 'DELAYED', 'SCHEDULED')),

  -- Location & Vehicle (stored as JSONB for flexibility)
  location JSONB NOT NULL DEFAULT '{}',
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('TRUCK', 'TRAILER')),

  -- Service-specific info (JSONB, nullable)
  tire_info JSONB,
  mechanical_info JSONB,

  -- Scheduling
  scheduled_date TEXT,
  scheduled_time TEXT,

  -- Status & workflow
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected',
                      'counter_proposed', 'counter_approved',
                      'counter_rejected', 'completed', 'cancelled')),

  -- Provider assignment
  assigned_provider_id UUID REFERENCES users(id),
  assigned_provider_name TEXT,

  -- Tracking
  created_by_id UUID NOT NULL,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Transcript
  conversation_transcript TEXT
);

CREATE INDEX idx_sr_status ON service_requests(status);
CREATE INDEX idx_sr_urgency ON service_requests(urgency);
CREATE INDEX idx_sr_created_by ON service_requests(created_by_id);
CREATE INDEX idx_sr_provider ON service_requests(assigned_provider_id);

-- ============================================
-- Counter Proposals table
-- ============================================
CREATE TABLE counter_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  provider_name TEXT NOT NULL,
  proposed_date TEXT NOT NULL,
  proposed_time TEXT NOT NULL,
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_cp_request ON counter_proposals(service_request_id);
CREATE INDEX idx_cp_status ON counter_proposals(status);

-- ============================================
-- Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies (permissive for MVP)
-- ============================================

-- Service requests
CREATE POLICY "Anyone can read submitted requests" ON service_requests
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create requests" ON service_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update requests" ON service_requests
  FOR UPDATE USING (true);

-- Counter proposals
CREATE POLICY "Anyone can read counter proposals" ON counter_proposals
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create counter proposals" ON counter_proposals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update counter proposals" ON counter_proposals
  FOR UPDATE USING (true);

-- Users
CREATE POLICY "Anyone can read users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update users" ON users
  FOR UPDATE USING (true);

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE counter_proposals;
