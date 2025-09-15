-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    period VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics (name);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON metrics (period);
CREATE INDEX IF NOT EXISTS idx_metrics_name_period ON metrics (name, period);
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON metrics (name, timestamp);

-- Add comments for documentation
COMMENT ON TABLE metrics IS 'Table to store calculated metrics and KPIs';
COMMENT ON COLUMN metrics.name IS 'Name/identifier of the metric';
COMMENT ON COLUMN metrics.value IS 'Numeric value of the metric';
COMMENT ON COLUMN metrics.unit IS 'Unit of measurement (count, currency, percentage, etc.)';
COMMENT ON COLUMN metrics.period IS 'Time period for the metric (daily, weekly, monthly, etc.)';
COMMENT ON COLUMN metrics.metadata IS 'Additional metadata in JSON format';
