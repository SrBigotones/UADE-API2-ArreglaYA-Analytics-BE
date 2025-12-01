-- Migration V7: Add latitud and longitud columns to solicitudes table
-- Purpose: Store geocoded coordinates for heatmap visualization

-- Add latitud column (DECIMAL for precision)
ALTER TABLE solicitudes 
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 7) NULL;

-- Add longitud column (DECIMAL for precision)
ALTER TABLE solicitudes 
ADD COLUMN IF NOT EXISTS longitud DECIMAL(10, 7) NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN solicitudes.latitud IS 'Latitude coordinate from geocoding the direccion field (automatically calculated on event reception)';
COMMENT ON COLUMN solicitudes.longitud IS 'Longitude coordinate from geocoding the direccion field (automatically calculated on event reception)';

-- Create composite index for heatmap queries
CREATE INDEX IF NOT EXISTS idx_solicitudes_coords ON solicitudes (latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Create index for created_at + coords (common query pattern)
CREATE INDEX IF NOT EXISTS idx_solicitudes_created_coords ON solicitudes (created_at, latitud, longitud) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration V7 completed: Added latitud and longitud columns to solicitudes table';
END $$;

