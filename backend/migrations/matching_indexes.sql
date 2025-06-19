-- Performance optimization indexes for intelligent matching algorithm
-- Run these after the main schema is created

-- Manufacturer indexes for matching performance
CREATE INDEX IF NOT EXISTS idx_manufacturers_active_verified 
ON manufacturers (is_active, is_verified, stripe_onboarding_completed);

CREATE INDEX IF NOT EXISTS idx_manufacturers_capabilities 
ON manufacturers USING GIN (capabilities);

CREATE INDEX IF NOT EXISTS idx_manufacturers_location 
ON manufacturers (country, state_province, city);

CREATE INDEX IF NOT EXISTS idx_manufacturers_coordinates 
ON manufacturers (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manufacturers_capacity 
ON manufacturers (min_order_quantity, max_order_quantity, capacity_utilization_pct);

CREATE INDEX IF NOT EXISTS idx_manufacturers_lead_time 
ON manufacturers (standard_lead_time_days, rush_order_available);

CREATE INDEX IF NOT EXISTS idx_manufacturers_performance 
ON manufacturers (overall_rating, total_orders_completed, on_time_delivery_rate);

CREATE INDEX IF NOT EXISTS idx_manufacturers_activity 
ON manufacturers (last_activity_date DESC, is_active);

-- Order indexes for matching performance
CREATE INDEX IF NOT EXISTS idx_orders_technical_requirements 
ON orders USING GIN (technical_requirements);

CREATE INDEX IF NOT EXISTS idx_orders_matching_criteria 
ON orders (status, delivery_deadline, quantity, industry_category);

CREATE INDEX IF NOT EXISTS idx_orders_geographic 
ON orders (preferred_country, preferred_state_province, max_distance_km);

CREATE INDEX IF NOT EXISTS idx_orders_budget 
ON orders (budget_min_pln, budget_max_pln, budget_type);

CREATE INDEX IF NOT EXISTS idx_orders_priority_timing 
ON orders (priority, rush_order, delivery_deadline);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_manufacturers_matching_composite 
ON manufacturers (is_active, is_verified, country, overall_rating DESC, total_orders_completed DESC)
WHERE is_active = true AND is_verified = true;

CREATE INDEX IF NOT EXISTS idx_orders_active_matching 
ON orders (status, delivery_deadline, created_at DESC)
WHERE status IN ('active', 'draft', 'quoted');

-- Partial indexes for common filtering scenarios
CREATE INDEX IF NOT EXISTS idx_manufacturers_high_capacity 
ON manufacturers (capacity_utilization_pct, standard_lead_time_days)
WHERE is_active = true AND is_verified = true AND capacity_utilization_pct < 90;

CREATE INDEX IF NOT EXISTS idx_manufacturers_rush_capable 
ON manufacturers (rush_order_available, rush_order_lead_time_days)
WHERE is_active = true AND rush_order_available = true;

-- Text search indexes for capability matching
CREATE INDEX IF NOT EXISTS idx_manufacturers_text_search 
ON manufacturers USING GIN (
    to_tsvector('english', 
        COALESCE(business_name, '') || ' ' ||
        COALESCE(business_description, '') || ' ' ||
        COALESCE(capabilities::text, '')
    )
);

-- Analyze tables to update statistics for query planner
ANALYZE manufacturers;
ANALYZE orders; 