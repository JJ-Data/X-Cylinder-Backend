-- Add tax.type setting to business_settings table
-- This setting controls whether tax is inclusive (included in price) or exclusive (added on top)

INSERT INTO business_settings
  (
  category_id,
  setting_key,
  setting_value,
  data_type,
  outlet_id,
  cylinder_type,
  operation_type,
  is_active,
  created_by,
  updated_by,
  created_at,
  updated_at
  )
VALUES
  (
    10, -- General settings category
    'tax.type', -- Setting key
    '"exclusive"', -- Default value (JSON stringified)
    'string', -- Data type
    NULL, -- Global setting (no specific outlet)
    NULL, -- No specific cylinder type
    NULL, -- No specific operation type
    true, -- Active
    1, -- Created by system/admin
    1, -- Updated by system/admin
    NOW(), -- Created timestamp
    NOW()                  -- Updated timestamp
)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  updated_at = NOW();

-- Verify the setting was added
SELECT
  id,
  setting_key,
  setting_value,
  data_type,
  is_active
FROM business_settings
WHERE setting_key = 'tax.type';