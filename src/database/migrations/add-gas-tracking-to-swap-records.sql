-- Add gas tracking fields to swap_records table
ALTER TABLE swap_records
ADD COLUMN old_cylinder_gas_volume DECIMAL(10, 2) DEFAULT NULL AFTER reason_for_fee,
ADD COLUMN new_cylinder_gas_volume DECIMAL(10, 2) DEFAULT NULL AFTER old_cylinder_gas_volume,
ADD COLUMN gas_volume_difference DECIMAL(10, 2) DEFAULT NULL AFTER new_cylinder_gas_volume,
ADD COLUMN refill_cost DECIMAL(10, 2) DEFAULT 0.00 NOT NULL AFTER gas_volume_difference;

-- Add indexes for performance
CREATE INDEX idx_swap_records_old_cylinder_gas_volume ON swap_records(old_cylinder_gas_volume);
CREATE INDEX idx_swap_records_refill_cost ON swap_records(refill_cost);