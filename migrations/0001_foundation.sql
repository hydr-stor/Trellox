PRAGMA foreign_keys = ON;
-- statement
CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE stores (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', logo TEXT, accent TEXT NOT NULL DEFAULT '#214b3b', return_policy TEXT NOT NULL DEFAULT 'يرجى التواصل مع المتجر لمعرفة شروط الاستبدال والإرجاع.', created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE subscriptions (store_id TEXT PRIMARY KEY REFERENCES stores(id), plan TEXT NOT NULL CHECK(plan IN ('basic','plus')), status TEXT NOT NULL CHECK(status IN ('trial','active','expired')), expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE subscription_requests (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), plan TEXT NOT NULL CHECK(plan IN ('basic','plus')), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE UNIQUE INDEX one_pending_request ON subscription_requests(store_id) WHERE status='pending';
-- statement
CREATE TABLE categories (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), name TEXT NOT NULL, UNIQUE(store_id,name));
-- statement
CREATE TABLE products (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), category_id TEXT REFERENCES categories(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL CHECK(price>=0 AND price<=100000000), compare_price INTEGER CHECK(compare_price>price), image TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, size TEXT NOT NULL DEFAULT 'قياسي', color TEXT NOT NULL DEFAULT 'أساسي', stock INTEGER NOT NULL CHECK(stock>=0 AND stock<=1000000), UNIQUE(product_id,size,color));
-- statement
CREATE TABLE delivery_zones (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), governorate TEXT NOT NULL, fee INTEGER NOT NULL CHECK(fee>=0 AND fee<=1000000), active INTEGER NOT NULL DEFAULT 1, UNIQUE(store_id,governorate));
-- statement
CREATE TABLE orders (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), number TEXT NOT NULL, receipt_token TEXT NOT NULL UNIQUE, idempotency_key TEXT NOT NULL, fingerprint TEXT NOT NULL, customer_name TEXT NOT NULL, phone TEXT NOT NULL, governorate TEXT NOT NULL, area TEXT NOT NULL, address TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', subtotal INTEGER NOT NULL CHECK(subtotal>=0), delivery_fee INTEGER NOT NULL CHECK(delivery_fee>=0), total INTEGER NOT NULL CHECK(total=subtotal+delivery_fee), status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','confirmed','preparing','shipped','delivered','cancelled')), created_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(store_id,idempotency_key));
-- statement
CREATE TABLE order_items (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), variant_id TEXT NOT NULL REFERENCES variants(id), title TEXT NOT NULL, size TEXT NOT NULL, color TEXT NOT NULL, unit_price INTEGER NOT NULL CHECK(unit_price>=0), quantity INTEGER NOT NULL CHECK(quantity>0 AND quantity<=100));
-- statement
CREATE TABLE order_history (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE audit_events (id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), actor_id TEXT REFERENCES users(id), event TEXT NOT NULL, resource_id TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
-- statement
CREATE TABLE auth_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1, reset_at INTEGER NOT NULL);
-- statement
CREATE INDEX products_store ON products(store_id,created_at DESC);
-- statement
CREATE INDEX orders_store ON orders(store_id,created_at DESC);
-- statement
CREATE INDEX sessions_expiry ON sessions(expires_at);
-- statement
CREATE INDEX variants_product ON variants(product_id);
-- statement
CREATE TRIGGER product_limit BEFORE INSERT ON products BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM subscriptions WHERE store_id=NEW.store_id AND status IN ('active','trial') AND expires_at>unixepoch()) THEN RAISE(ABORT,'subscription_expired') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM products WHERE store_id=NEW.store_id)>=(SELECT CASE WHEN status='trial' THEN 30 WHEN plan='plus' THEN 500 ELSE 100 END FROM subscriptions WHERE store_id=NEW.store_id) THEN RAISE(ABORT,'product_limit') END;
 SELECT CASE WHEN NEW.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id=NEW.category_id AND store_id=NEW.store_id) THEN RAISE(ABORT,'invalid_category') END;
END;
-- statement
CREATE TRIGGER reserve_inventory BEFORE INSERT ON order_items BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM variants v JOIN products p ON p.id=v.product_id JOIN orders o ON o.id=NEW.order_id JOIN subscriptions s ON s.store_id=p.store_id WHERE v.id=NEW.variant_id AND p.store_id=o.store_id AND p.active=1 AND v.stock>=NEW.quantity AND p.price=NEW.unit_price AND s.status IN ('trial','active') AND s.expires_at>unixepoch()) THEN RAISE(ABORT,'stock_unavailable') END;
 UPDATE variants SET stock=stock-NEW.quantity WHERE id=NEW.variant_id;
END;
-- statement
CREATE TRIGGER valid_order_transition BEFORE UPDATE OF status ON orders WHEN NEW.status!=OLD.status BEGIN
 SELECT CASE WHEN NOT ((OLD.status='new' AND NEW.status IN ('confirmed','cancelled')) OR (OLD.status='confirmed' AND NEW.status IN ('preparing','cancelled')) OR (OLD.status='preparing' AND NEW.status IN ('shipped','cancelled')) OR (OLD.status='shipped' AND NEW.status='delivered')) THEN RAISE(ABORT,'invalid_transition') END;
END;
-- statement
CREATE TRIGGER restore_cancelled_inventory AFTER UPDATE OF status ON orders WHEN NEW.status='cancelled' AND OLD.status!='cancelled' BEGIN
 UPDATE variants SET stock=stock+(SELECT SUM(quantity) FROM order_items WHERE order_id=NEW.id AND variant_id=variants.id) WHERE id IN (SELECT variant_id FROM order_items WHERE order_id=NEW.id);
END;
-- statement
CREATE TRIGGER initial_order_history AFTER INSERT ON orders BEGIN
 INSERT INTO order_history (id,order_id,status) VALUES (lower(hex(randomblob(16))),NEW.id,NEW.status);
END;
-- statement
CREATE TRIGGER changed_order_history AFTER UPDATE OF status ON orders WHEN NEW.status!=OLD.status BEGIN
 INSERT INTO order_history (id,order_id,status) VALUES (lower(hex(randomblob(16))),NEW.id,NEW.status);
END;
