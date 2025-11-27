-- Migration V6: Add direccion column to solicitudes table
-- Purpose: Store complete address data as JSONB for geocoding in heatmap

-- Add direccion column to store full address data
ALTER TABLE solicitudes 
ADD COLUMN IF NOT EXISTS direccion JSONB NULL;

-- Add comment to explain the column
COMMENT ON COLUMN solicitudes.direccion IS 'Complete address data from request (calle, numero, ciudad, provincia, codigo_postal, etc.) stored as JSONB for geocoding';

-- Create GIN index on direccion for efficient JSONB queries (optional, for future queries)
CREATE INDEX IF NOT EXISTS idx_solicitudes_direccion ON solicitudes USING GIN (direccion);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration V6 completed: Added direccion column to solicitudes table';
END $$;

