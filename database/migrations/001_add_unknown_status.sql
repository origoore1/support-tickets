-- Migration: Add 'unknown' to valid claim statuses
-- This fixes the CHECK constraint violation errors when inserting claims with unknown status

-- Drop the existing constraint
ALTER TABLE harmonized_claims DROP CONSTRAINT IF EXISTS valid_status;

-- Recreate the constraint with 'unknown' included
ALTER TABLE harmonized_claims
ADD CONSTRAINT valid_status
CHECK (claim_status IN ('active', 'expired', 'abandoned', 'pending', 'closed', 'suspended', 'unknown'));

-- Verify the change
SELECT 'Migration completed: unknown status now allowed' AS status;
