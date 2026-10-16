-- ============================================================================
-- SAN JOSE BAKERY REWARDS PROGRAM — SUPABASE DATABASE SCHEMA
-- Customer Data, Spends, 90-Day Credit Expiration & 7-Day Reminder System
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
-- Stores member registration, credentials, and preference data
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(50),
  favorite_treat VARCHAR(255) DEFAULT 'Burnt Almond Cake',
  app_notify BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant lookup on login
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_member_id ON customers(member_id);

-- 2. CUSTOMER SPENDS & CREDITS TABLE
-- Records every purchase, 1% credit calculation ($25+ threshold),
-- and 90-day credit expiration date.
CREATE TABLE IF NOT EXISTS customer_spends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  order_description TEXT NOT NULL,
  spend_amount NUMERIC(10, 2) NOT NULL, -- Purchase total in dollars & cents
  credit_rate NUMERIC(5, 2) DEFAULT 0.01, -- 1.0% credit rate
  credit_earned NUMERIC(10, 2) NOT NULL, -- Credit earned in dollars & cents
  is_qualifying BOOLEAN GENERATED ALWAYS AS (spend_amount >= 25.00) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'), -- Credits expire in 90 days!
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMPTZ
);

-- Indexes for lightning fast balance calculation and expiration querying
CREATE INDEX IF NOT EXISTS idx_spends_customer_email ON customer_spends(customer_email);
CREATE INDEX IF NOT EXISTS idx_spends_expires_at ON customer_spends(expires_at);
CREATE INDEX IF NOT EXISTS idx_spends_created_at ON customer_spends(created_at);

-- 3. HELPER VIEW: ACTIVE UNEXPIRED CUSTOMER REWARDS
-- Sums active, unexpired credits (within 90 days) in dollars and cents
CREATE OR REPLACE VIEW customer_active_rewards AS
SELECT 
  c.id AS customer_id,
  c.member_id,
  c.name,
  c.email,
  COUNT(s.id) FILTER (WHERE s.is_qualifying = TRUE) AS total_qualifying_orders,
  COALESCE(SUM(s.spend_amount), 0.00) AS total_spend_amount,
  COALESCE(SUM(s.credit_earned) FILTER (WHERE s.is_redeemed = FALSE AND s.expires_at > NOW()), 0.00) AS active_rewards_balance,
  COALESCE(SUM(s.credit_earned), 0.00) AS lifetime_rewards_earned
FROM customers c
LEFT JOIN customer_spends s ON c.email = s.customer_email
GROUP BY c.id, c.member_id, c.name, c.email;

-- 4. HELPER VIEW: CREDITS EXPIRING IN 7 DAYS
-- Filters credits expiring in <= 7 days and > 0 days for login reminders
CREATE OR REPLACE VIEW credits_expiring_in_7_days AS
SELECT 
  s.id AS spend_id,
  s.customer_email,
  s.order_description,
  s.credit_earned,
  s.created_at,
  s.expires_at,
  ROUND(EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 86400, 1) AS days_until_expiration
FROM customer_spends s
WHERE s.is_redeemed = FALSE
  AND s.expires_at > NOW()
  AND s.expires_at <= (NOW() + INTERVAL '7 days');

-- 5. FUNCTION TO INSERT SPEND WITH 90-DAY EXPIRATION
CREATE OR REPLACE FUNCTION record_customer_spend(
  p_email VARCHAR(255),
  p_description TEXT,
  p_amount NUMERIC(10, 2),
  p_custom_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  v_credit NUMERIC(10, 2) := 0.00;
  v_expires TIMESTAMPTZ;
  v_spend_id UUID;
  v_cust_id UUID;
BEGIN
  -- Check customer exists
  SELECT id INTO v_cust_id FROM customers WHERE email = p_email;

  -- 1% reward rule for purchases $25 or above
  IF p_amount >= 25.00 THEN
    v_credit := ROUND(p_amount * 0.01, 2);
  ELSE
    v_credit := 0.00;
  END IF;

  -- Credits expire in 90 days from the purchase date
  v_expires := p_custom_date + INTERVAL '90 days';

  INSERT INTO customer_spends (
    customer_id,
    customer_email,
    order_description,
    spend_amount,
    credit_rate,
    credit_earned,
    created_at,
    expires_at
  ) VALUES (
    v_cust_id,
    p_email,
    p_description,
    p_amount,
    0.01,
    v_credit,
    p_custom_date,
    v_expires
  ) RETURNING id INTO v_spend_id;

  RETURN json_build_object(
    'success', true,
    'spend_id', v_spend_id,
    'spend_amount', p_amount,
    'credit_earned', v_credit,
    'expires_at', v_expires,
    'days_valid', 90
  );
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCTION TO REDEEM REWARDS CREDIT TOWARDS NEXT PURCHASE
CREATE OR REPLACE FUNCTION redeem_customer_credit(
  p_email VARCHAR(255),
  p_amount NUMERIC(10, 2),
  p_order_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_cust_id UUID;
  v_current_bal NUMERIC(10, 2) := 0.00;
  v_spend_id UUID;
  v_desc TEXT;
  v_redeem_amt NUMERIC(10, 2);
BEGIN
  SELECT id INTO v_cust_id FROM customers WHERE LOWER(email) = LOWER(p_email);

  -- Calculate current active, unexpired, unredeemed balance
  SELECT COALESCE(SUM(credit_earned), 0.00) INTO v_current_bal
  FROM customer_spends
  WHERE LOWER(customer_email) = LOWER(p_email)
    AND is_redeemed = FALSE
    AND expires_at > NOW();

  IF v_current_bal <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'No active rewards credit available to redeem');
  END IF;

  v_redeem_amt := LEAST(p_amount, v_current_bal);

  v_desc := 'Rewards Credit Redeemed towards Purchase';
  IF p_order_id IS NOT NULL AND p_order_id <> '' THEN
    v_desc := v_desc || ' (' || p_order_id || ')';
  END IF;

  -- Insert debit record into customer_spends
  INSERT INTO customer_spends (
    customer_id,
    customer_email,
    order_description,
    spend_amount,
    credit_rate,
    credit_earned,
    created_at,
    expires_at,
    is_redeemed
  ) VALUES (
    v_cust_id,
    LOWER(p_email),
    v_desc,
    0.00,
    0.00,
    -v_redeem_amt,
    NOW(),
    NOW() + INTERVAL '90 days',
    FALSE
  ) RETURNING id INTO v_spend_id;

  RETURN json_build_object(
    'success', true,
    'spend_id', v_spend_id,
    'amount_redeemed', v_redeem_amt,
    'remaining_balance', ROUND(v_current_bal - v_redeem_amt, 2)
  );
END;
$$ LANGUAGE plpgsql;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_spends ENABLE ROW LEVEL SECURITY;

-- Allow read/write for public anon role during web rewards portal operation
CREATE POLICY "Allow public customer registration and login"
ON customers FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public customer spend recording and balance query"
ON customer_spends FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

