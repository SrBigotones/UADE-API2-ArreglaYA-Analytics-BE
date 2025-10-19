-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad VARCHAR(100) NOT NULL,
    topico VARCHAR(100) NOT NULL,
    evento VARCHAR(100) NOT NULL,
    cuerpo JSON NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN NOT NULL DEFAULT false,
    "messageId" VARCHAR(255),
    "correlationId" VARCHAR(255),
    source VARCHAR(50) DEFAULT 'unknown',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_squad_topico_evento ON events (squad, topico, evento);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_processed ON events (processed);
CREATE INDEX IF NOT EXISTS idx_events_messageId ON events ("messageId");
CREATE INDEX IF NOT EXISTS idx_events_correlationId ON events ("correlationId");
CREATE INDEX IF NOT EXISTS idx_events_source ON events (source);

-- Add comments for documentation
COMMENT ON TABLE events IS 'Table to store all events from different squads and topics';
COMMENT ON COLUMN events.squad IS 'Squad that generated the event';
COMMENT ON COLUMN events.topico IS 'Topic or category of the event';
COMMENT ON COLUMN events.evento IS 'Specific event type';
COMMENT ON COLUMN events.cuerpo IS 'Event payload in JSON format';
COMMENT ON COLUMN events.timestamp IS 'When the event occurred';
COMMENT ON COLUMN events.processed IS 'Whether the event has been processed';
COMMENT ON COLUMN events."messageId" IS 'Unique message identifier';
COMMENT ON COLUMN events."correlationId" IS 'Correlation ID to link related events';
COMMENT ON COLUMN events.source IS 'Source system that generated the event';
