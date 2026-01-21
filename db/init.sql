-- Reset everything
DROP TABLE IF EXISTS delivery_reports;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;

-- 1. Create the Main Table (Now includes REPORT column)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    ship_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    signature_data TEXT,
    report_text TEXT,   -- <--- New Column for the Officer's Report
    delivery_date TIMESTAMP
);

-- 2. Create Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT,
    item_name VARCHAR(100),
    quantity INT
);

-- 3. Insert "MV Golden Corn" as ID 1
INSERT INTO orders (ship_name, status) VALUES ('MV Golden Corn', 'PENDING');

-- 4. Add items for Golden Corn
INSERT INTO order_items (order_id, item_name, quantity) VALUES (1, 'Engine Oil 40W', 10);
INSERT INTO order_items (order_id, item_name, quantity) VALUES (1, 'Fresh Water', 50);