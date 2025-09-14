-- Add quantity column to cart_items table
ALTER TABLE cart_items
ADD COLUMN quantity INTEGER DEFAULT 1 NOT NULL;

-- Add constraint to ensure quantity is always positive
ALTER TABLE cart_items
ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);

-- Update existing cart items to have quantity of 1
UPDATE cart_items
SET quantity = 1
WHERE quantity IS NULL;

-- Create index for better performance on quantity queries
CREATE INDEX IF NOT EXISTS idx_cart_items_quantity ON cart_items(quantity);

-- Add comment for documentation
COMMENT ON COLUMN cart_items.quantity IS 'Quantity of the media outlet in the cart (defaults to 1)';
