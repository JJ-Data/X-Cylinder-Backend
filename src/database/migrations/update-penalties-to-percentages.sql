-- Update return penalties from fixed amounts to percentages
-- Default values: Good = 0%, Poor = 10%, Damaged = 25%

UPDATE business_settings 
SET setting_value = '0', data_type = 'number'
WHERE setting_key = 'return.penalty.good';

UPDATE business_settings 
SET setting_value = '10', data_type = 'number'
WHERE setting_key = 'return.penalty.poor';

UPDATE business_settings 
SET setting_value = '25', data_type = 'number'
WHERE setting_key = 'return.penalty.damaged';

-- Update swap fees from fixed amounts to percentages
-- Default values: Good = 0%, Poor = 5%, Damaged = 15%

UPDATE business_settings 
SET setting_value = '0', data_type = 'number'
WHERE setting_key = 'swap.fee.good';

UPDATE business_settings 
SET setting_value = '5', data_type = 'number'
WHERE setting_key = 'swap.fee.poor';

UPDATE business_settings 
SET setting_value = '15', data_type = 'number'
WHERE setting_key = 'swap.fee.damaged';