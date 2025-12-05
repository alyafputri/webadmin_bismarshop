<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
class PublicApiController extends BaseController
{
    private function normalizeImage(?string $p): string
    {
        if (!$p) return '';
        $str = (string)$p;
        if (str_starts_with($str, 'http://') || str_starts_with($str, 'https://')) return $str;
        $idx = stripos($str, 'uploads');
        if ($idx !== false) {
            $sub = '/' . str_replace('\\', '/', substr($str, $idx));
            return str_replace(' ', '%20', $sub);
        }
        if (str_starts_with($str, '/')) return $str;
        return '/' . str_replace('\\', '/', $str);
    }

    public function products(Request $req)
    {
        try {
            try { DB::statement("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NULL AFTER category"); } catch (\Throwable $e) {}
            $category = $req->query('category');
            $brand = $req->query('brand');
            $q = $req->query('q');
            $limit = min((int)($req->query('limit', 200)), 500);

            $where = [];$params = [];
            if ($category) { $where[] = 'category = ?'; $params[] = (string)$category; }
            if ($brand) { $where[] = 'brand = ?'; $params[] = (string)$brand; }
            if ($q) { $where[] = '(name LIKE ? OR description LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
            $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

            $rows = DB::select("SELECT * FROM products $whereSql ORDER BY id DESC LIMIT $limit", $params);
            if (!$rows) return response()->json(['success' => true, 'data' => []]);

            $ids = array_map(fn($r) => $r->id, $rows);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $imagesRows = DB::select("SELECT product_id, image_url FROM product_images WHERE product_id IN ($placeholders) ORDER BY sort_order, id", $ids);
            $imgMap = [];
            foreach ($imagesRows as $r) { $imgMap[$r->product_id] = ($imgMap[$r->product_id] ?? []); $imgMap[$r->product_id][] = $this->normalizeImage($r->image_url); }

            // Variants
            $variantsMap = [];
            try {
                $vrows = DB::select("SELECT product_id, type, name FROM product_variants WHERE product_id IN ($placeholders) ORDER BY type, id", $ids);
                foreach ($vrows as $r) { $variantsMap[$r->product_id] = ($variantsMap[$r->product_id] ?? []); $variantsMap[$r->product_id][] = ['type' => $r->type ?? '', 'name' => $r->name ?? '']; }
            } catch (\Throwable $e) {
                foreach ($rows as $p) {
                    try {
                        $arr = $p->variants_json ? json_decode($p->variants_json, true) : [];
                        if (is_array($arr) && count($arr)) $variantsMap[$p->id] = array_map(fn($v)=>['type'=>$v['type']??'', 'name'=>$v['name']??''], $arr);
                    } catch (\Throwable $e2) {}
                }
            }

            $data = array_map(function ($p) use ($imgMap, $variantsMap) {
                $images = $imgMap[$p->id] ?? [];
                return [
                    'id' => (string)$p->id,
                    'name' => $p->name,
                    'description' => $p->description ?? '',
                    'price' => (int)($p->regular_price ?? 0),
                    'originalPrice' => $p->promo_price ?? null,
                    'imageUrl' => $images ? $images[0] : '',
                    'images' => $images,
                    'category' => $p->category ?? '',
                    'brand' => $p->brand ?? '',
                    'variants' => $variantsMap[$p->id] ?? [],
                    'rating' => 0,
                    'reviewCount' => 0,
                    'sold' => (int)($p->sold ?? 0),
                    'stock' => (int)($p->stock ?? 0),
                    'isFlashSale' => false,
                    'discountPercentage' => null,
                    'seller' => 'Official',
                    'location' => 'Jakarta',
                ];
            }, $rows);

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    public function topProducts(Request $req)
    {
        try {
            $limit = min((int)($req->query('limit', 20)), 100);
            $rows = [];
            // 1) Prefer curated featured products if admin has set them
            try {
                $idsRows = DB::select("SELECT product_id FROM featured_products ORDER BY created_at DESC LIMIT ?", [$limit]);
                $ids = array_map(fn($r)=> (int)$r->product_id, $idsRows);
                if ($ids) {
                    $ph = implode(',', array_fill(0, count($ids), '?'));
                    $rows = DB::select("SELECT id, name, category, 0 AS sold, 0 AS revenue FROM products WHERE id IN ($ph)", $ids);
                    // Reorder rows following ids order
                    $orderMap = array_flip(array_map(fn($i)=> (string)$i, $ids));
                    usort($rows, function($a,$b) use ($orderMap){
                        return ($orderMap[(string)$a->id] ?? 0) <=> ($orderMap[(string)$b->id] ?? 0);
                    });
                }
            } catch (\Throwable $e0) { $rows = []; }
            
            // 2) If none featured, try compute by completed orders (true best sellers)
            // Try compute by completed orders (true best sellers)
            if (!$rows || count($rows) === 0) {
                try {
                    $rows = DB::select(
                    "SELECT 
                       p.id,
                       p.name,
                       p.category,
                       COALESCE(SUM(oi.quantity),0) AS sold,
                       COALESCE(SUM(oi.quantity * oi.price),0) AS revenue
                     FROM orders o
                     JOIN order_items oi ON oi.order_id = o.id
                     LEFT JOIN products p ON p.id = oi.product_id
                     WHERE o.status = 'completed'
                     GROUP BY p.id, p.name, p.category
                     HAVING sold > 0
                     ORDER BY sold DESC, revenue DESC
                     LIMIT ?",
                        [$limit]
                    );
                } catch (\Throwable $e1) { $rows = []; }
            }
            // Fallback: if no orders yet or tables missing, use products table sold_count/sold
            if (!$rows || count($rows) === 0) {
                try {
                    $rows = DB::select(
                        "SELECT 
                           p.id,
                           p.name,
                           p.category,
                           COALESCE(p.sold_count, p.sold, 0) AS sold,
                           COALESCE(p.regular_price, 0) * COALESCE(p.sold_count, p.sold, 0) AS revenue
                         FROM products p
                         ORDER BY sold DESC, p.id DESC
                         LIMIT ?",
                        [$limit]
                    );
                } catch (\Throwable $e2) { $rows = []; }
            }
            // Last resort: minimal list of latest products
            if (!$rows || count($rows) === 0) {
                try {
                    $rows = DB::select(
                        "SELECT p.id, p.name, p.category, 0 AS sold, 0 AS revenue FROM products p ORDER BY p.id DESC LIMIT ?",
                        [$limit]
                    );
                } catch (\Throwable $e5) { $rows = []; }
            }
            if (!$rows) return response()->json(['success'=>true,'data'=>[]]);

            // Load product details and images for these products (optional)
            $ids = array_map(fn($r) => $r->id, $rows);
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $prodMap = [];
            try {
                $prodRows = DB::select("SELECT id, name, description, regular_price, promo_price, stock, category, brand FROM products WHERE id IN ($ph)", $ids);
                foreach ($prodRows as $p) { $prodMap[$p->id] = $p; }
            } catch (\Throwable $e3) { $prodMap = []; }
            $imgMap = [];
            try {
                $imgRows = DB::select("SELECT product_id, image_url FROM product_images WHERE product_id IN ($ph) ORDER BY sort_order, id", $ids);
                foreach ($imgRows as $r) {
                    $imgMap[$r->product_id] = ($imgMap[$r->product_id] ?? []);
                    $imgMap[$r->product_id][] = $this->normalizeImage((string)$r->image_url);
                }
            } catch (\Throwable $e4) { $imgMap = []; }

            // Map response
            $data = array_map(function($r) use ($imgMap, $prodMap) {
                $images = $imgMap[$r->id] ?? [];
                $pd = $prodMap[$r->id] ?? null;
                return [
                    'id' => (string)$r->id,
                    'name' => $pd->name ?? $r->name,
                    'description' => $pd->description ?? '',
                    'price' => isset($pd->regular_price) ? (int)$pd->regular_price : 0,
                    'originalPrice' => isset($pd->promo_price) ? (int)$pd->promo_price : null,
                    'imageUrl' => $images ? $images[0] : '',
                    'images' => $images,
                    'category' => ($pd->category ?? $r->category) ?? '',
                    'brand' => $pd->brand ?? '',
                    'variants' => [],
                    'rating' => 0,
                    'reviewCount' => 0,
                    'sold' => (int)($r->sold ?? 0),
                    'stock' => isset($pd->stock) ? (int)$pd->stock : 0,
                    'isFlashSale' => false,
                    'discountPercentage' => null,
                    'seller' => 'Official',
                    'location' => 'Jakarta',
                    'revenue' => (int)($r->revenue ?? 0),
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function widgets(Request $req)
    {
        try {
            $rows = DB::select("SELECT id, title, type, category_slug, url, is_active FROM widgets WHERE is_active = 1 ORDER BY id DESC");
            $base = (string) env('PUBLIC_BASE_URL', '');
            $data = array_map(function($w) use ($base){
                $img = (string)($w->url ?? '');
                if ($img !== '' && !(str_starts_with($img, 'http://') || str_starts_with($img, 'https://'))) {
                    $img = $base ? ($base.$img) : $img;
                }
                return [
                    'id' => $w->id,
                    'title' => $w->title ?? '',
                    'type' => $w->type ?? 'banner',
                    'categorySlug' => $w->category_slug ?? '',
                    'imageUrl' => $img,
                    'isActive' => (bool)$w->is_active,
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function vouchers(Request $req)
    {
        try {
            $scopeRaw = strtolower((string)($req->query('scope') ?? $req->query('category') ?? 'belanja'));
            $scope = in_array($scopeRaw, ['produk','product']) ? 'produk' : 'belanja';
            if ($scope === 'belanja') {
                $rows = DB::select("SELECT id, code, name, description, type, value, min_purchase, max_discount, start_date, end_date, is_active FROM vouchers WHERE is_active = 1 AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()) ORDER BY id DESC");
                $data = array_map(function($v){
                    $type = strtolower((string)($v->type ?? ''));
                    $type = $type === 'fixed_amount' ? 'fixed' : $type;
                    return [
                        'id'=>$v->id,
                        'code'=>$v->code,
                        'title'=>$v->name,
                        'description'=>$v->description ?? '',
                        'type'=>$type,
                        'value'=> (float)($v->value ?? 0),
                        'minPurchase'=> (float)($v->min_purchase ?? 0),
                        'maxDiscount'=> isset($v->max_discount) ? (float)$v->max_discount : null,
                        'startDate'=>$v->start_date,
                        'endDate'=>$v->end_date,
                        'scope'=>'belanja',
                    ];
                }, $rows);
                return response()->json(['success'=>true,'data'=>$data]);
            }
            // produk scope
            try {
                $rows = DB::select("SELECT pv.id, pv.type, pv.value, pv.max_discount, pv.start_date, pv.end_date, pv.is_active, pv.target_type, pv.target_id, p.name AS product_name, c.name AS category_name FROM product_vouchers pv LEFT JOIN products p ON pv.target_type = 'product' AND p.id = pv.target_id LEFT JOIN categories c ON pv.target_type = 'category' AND c.id = pv.target_id WHERE pv.is_active = 1 AND (pv.start_date IS NULL OR pv.start_date <= CURDATE()) AND (pv.end_date IS NULL OR pv.end_date >= CURDATE()) ORDER BY pv.id DESC");
            } catch (\Throwable $e) { $rows = []; }
            $data = array_map(function($r){
                $type = strtolower((string)($r->type ?? ''));
                $type = $type === 'fixed_amount' ? 'fixed' : $type;
                return [
                    'id'=>$r->id,
                    'productId'=> ($r->target_type === 'product') ? $r->target_id : null,
                    'productName'=> $r->product_name ?? ($r->category_name ? ('Kategori: '.$r->category_name) : 'Voucher Produk'),
                    'type'=>$type,
                    'value'=> (float)($r->value ?? 0),
                    'maxDiscount'=> isset($r->max_discount) ? (float)$r->max_discount : null,
                    'startDate'=>$r->start_date,
                    'endDate'=>$r->end_date,
                    'scope'=>'produk',
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to list public vouchers'], 500);
        }
    }

    public function flashSales(Request $req)
    {
        try {
            $rows = DB::select("SELECT id, name, description, discount_percentage, start_date, end_date, is_active FROM flash_sales WHERE (end_date IS NULL OR end_date >= NOW()) ORDER BY start_date DESC, id DESC");
            $data = array_map(fn($r)=>[
                'id'=>$r->id,
                'name'=>$r->name,
                'description'=>$r->description ?? '',
                'discountPercentage'=>(float)($r->discount_percentage ?? 0),
                'startDate'=>$r->start_date,
                'endDate'=>$r->end_date,
                'isActive'=>(bool)$r->is_active,
            ], $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to list public flash sales'], 500);
        }
    }

    public function freeShipping(Request $req)
    {
        try {
            $rows = DB::select("SELECT id, name, description, min_amount, max_discount, is_active, start_date, end_date FROM free_shipping_promotions WHERE is_active = 1 AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()) ORDER BY id DESC");
            $data = array_map(fn($r)=>[
                'id'=>$r->id,
                'name'=>$r->name,
                'description'=>$r->description ?? '',
                'minAmount'=> isset($r->min_amount)? (float)$r->min_amount : 0,
                'maxDiscount'=> isset($r->max_discount)? (float)$r->max_discount : 0,
                'isActive'=>(bool)$r->is_active,
                'startDate'=>$r->start_date,
                'endDate'=>$r->end_date,
            ], $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to list public free shipping'], 500);
        }
    }

    public function createOrder(Request $req)
    {
        $b = $req->all();
        $customerName    = $b['customerName']    ?? $b['name']    ?? null;
        $customerEmail   = $b['customerEmail']   ?? $b['email']   ?? null;
        $shippingAddress = $b['shippingAddress'] ?? $b['address'] ?? null;
        $trackingNumber  = $b['trackingNumber']  ?? null;
        $totalAmount     = $b['totalAmount']     ?? null;
        $items           = $b['items']           ?? [];

        if (!$customerEmail || !is_array($items) || count($items) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid payload',
            ], 400);
        }

        $emailLower = strtolower((string) $customerEmail);

        // ============================================================
        // VALIDASI: user harus terdaftar & (jika ada is_active) sudah aktif
        // ============================================================
        $exists = false;

        // Cek di tabel users (utama)
        try {
            if (Schema::hasTable('users')) {
                $query = DB::table('users')->whereRaw('LOWER(email) = ?', [$emailLower]);
                if (Schema::hasColumn('users', 'is_active')) {
                    $query->where('is_active', 1);
                }
                $exists = $query->exists();
            }
        } catch (\Throwable $e) {
            $exists = false;
        }

        // Kalau belum ketemu, cek di tabel customers (kalau ada)
        if (!$exists) {
            try {
                if (Schema::hasTable('customers')) {
                    $exists = DB::table('customers')
                        ->whereRaw('LOWER(email) = ?', [$emailLower])
                        ->exists();
                }
            } catch (\Throwable $e) {
                // abaikan
            }
        }

        // Kalau masih belum ketemu dan ada tabel legacy customer, cek juga
        if (!$exists) {
            try {
                if (Schema::hasTable('customer')) {
                    $exists = DB::table('customer')
                        ->whereRaw('LOWER(email) = ?', [$emailLower])
                        ->exists();
                }
            } catch (\Throwable $e) {
                // abaikan
            }
        }

        if (!$exists) {
            return response()->json([
                'success' => false,
                'message' => 'Silakan login terlebih dahulu sebelum checkout',
            ], 401);
        }

        // ============================================================
        // CREATE ORDER
        // ============================================================
        try {
            DB::beginTransaction();

            // Ensure optional columns exist in orders / order_items
            try { DB::statement("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(255) NULL"); } catch (\Throwable $e) {}
            try { DB::statement("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) NULL"); } catch (\Throwable $e) {}
            try { DB::statement("ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL"); } catch (\Throwable $e) {}
            try { DB::statement("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image VARCHAR(1024) NULL"); } catch (\Throwable $e) {}

            $id = DB::table('orders')->insertGetId([
                'customer_id'      => null,
                'customer_name'    => $customerName ?: explode('@', (string) $customerEmail)[0],
                'customer_email'   => $customerEmail,
                'shipping_address' => $shippingAddress,
                'tracking_number'  => $trackingNumber,
                'status'           => 'pending',
                'total_amount'     => (int) round((float) ($totalAmount ?? 0)),
                'created_at'       => now(),
            ]);

            foreach ($items as $it) {
                $pid  = $it['productId'] ?? null;
                $pid  = ($pid === '' ? null : $pid);
                $pimg = isset($it['productImage']) && trim((string) $it['productImage']) !== '' ? (string) $it['productImage'] : null;

                if ($pid !== null) {
                    try {
                        $valid = DB::table('products')->where('id', $pid)->exists();
                        if (!$valid) {
                            $pid = null;
                        }
                    } catch (\Throwable $e) {
                        $pid = null;
                    }
                }

                if (!$pimg) {
                    try {
                        if ($pid !== null) {
                            $imgRow = DB::selectOne(
                                "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1",
                                [$pid]
                            );
                            if ($imgRow && $imgRow->image_url) {
                                $pimg = $imgRow->image_url;
                            }
                        }
                        if (!$pimg) {
                            $pidRow = DB::selectOne(
                                "SELECT id FROM products WHERE name = ? LIMIT 1",
                                [$it['productName'] ?? '']
                            );
                            if ($pidRow) {
                                $imgRow2 = DB::selectOne(
                                    "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1",
                                    [$pidRow->id]
                                );
                                if ($imgRow2 && $imgRow2->image_url) {
                                    $pimg = $imgRow2->image_url;
                                }
                            }
                        }
                    } catch (\Throwable $e) {
                        // abaikan
                    }
                }

                DB::table('order_items')->insert([
                    'order_id'      => $id,
                    'product_id'    => $pid,
                    'product_name'  => $it['productName'] ?? 'Unknown',
                    'product_image' => $pimg,
                    'quantity'      => (int) ($it['quantity'] ?? 1),
                    'price'         => (int) round((float) ($it['price'] ?? 0)),
                ]);
            }

            DB::commit();

            return response()->json(['success' => true, 'id' => $id]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create public order',
            ], 500);
        }
    }
    public function listOrders(Request $req)
    {
        try {
            $email = trim((string)$req->query('email', ''));
            $name = trim((string)$req->query('name', ''));
            $rows = [];
            if ($email !== '') {
                $rows = DB::select("SELECT id, customer_name, customer_email, shipping_address, tracking_number, status, total_amount, created_at FROM orders WHERE customer_email = ? ORDER BY id DESC LIMIT 200", [$email]);
            }
            if ((!$email || count($rows) === 0) && $name !== '') {
                $rows = DB::select("SELECT id, customer_name, customer_email, shipping_address, tracking_number, status, total_amount, created_at FROM orders WHERE customer_name = ? ORDER BY id DESC LIMIT 200", [$name]);
            }
            if (!$rows) return response()->json(['success'=>true,'data'=>[]]);
            $ids = array_map(fn($r)=>$r->id, $rows);
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $items = DB::select("SELECT oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.price, COALESCE(oi.product_image, (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.sort_order, pi.id LIMIT 1), (SELECT pi2.image_url FROM product_images pi2 WHERE pi2.product_id = (SELECT p2.id FROM products p2 WHERE p2.name = oi.product_name LIMIT 1) ORDER BY pi2.sort_order, pi2.id LIMIT 1)) AS product_image FROM order_items oi WHERE oi.order_id IN ($ph) ORDER BY oi.id", $ids);
            $grouped = [];
            foreach ($items as $it) { $grouped[$it->order_id] = ($grouped[$it->order_id] ?? []); $grouped[$it->order_id][] = $it; }
            $data = array_map(function($o) use ($grouped){
                $its = $grouped[$o->id] ?? [];
                return [
                    'id'=>(string)$o->id,
                    'customer_name'=>$o->customer_name,
                    'customer_email'=>$o->customer_email,
                    'shipping_address'=>$o->shipping_address,
                    'tracking_number'=>$o->tracking_number,
                    'status'=>$o->status,
                    'total_amount'=>$o->total_amount,
                    'created_at'=>$o->created_at,
                    'items'=> array_map(fn($i)=>[
                        'product_id'=>$i->product_id,
                        'product_name'=>$i->product_name,
                        'quantity'=>$i->quantity,
                        'price'=>$i->price,
                        'product_image'=>$i->product_image,
                    ], $its),
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function completeOrder(Request $req, $id)
    {
        try {
            $id = (int)$id; $email = trim((string)($req->input('email') ?? ''));
            if (!$id || $email === '') return response()->json(['success'=>false,'message'=>'Invalid id/email'], 400);
            $row = DB::selectOne("SELECT status, customer_email FROM orders WHERE id = ? LIMIT 1", [$id]);
            if (!$row) return response()->json(['success'=>false,'message'=>'Order not found'], 404);
            if (strtolower((string)$row->customer_email) !== strtolower($email)) return response()->json(['success'=>false,'message'=>'Forbidden'], 403);
            if ($row->status === 'completed') return response()->json(['success'=>true,'message'=>'Order already completed']);
            if (!in_array($row->status, ['shipped','processing'])) return response()->json(['success'=>false,'message'=>'Order is not in a completable state'], 400);
            try { DB::statement("ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL"); } catch (\Throwable $e) {}
            $result = DB::update("UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [$id]);
            if ($result === 0) return response()->json(['success'=>false,'message'=>'Order not found'], 404);
            return response()->json(['success'=>true,'message'=>'Order completed']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to complete order'], 500);
        }
    }

    public function upsertReview(Request $req)
    {
        try {
            $b = $req->all();
            $email = trim((string)($b['email'] ?? ''));
            $orderId = (int)($b['orderId'] ?? 0);
            $productId = (string)($b['productId'] ?? '');
            $rating = (int)($b['rating'] ?? 0);
            $comment = $b['comment'] ?? null;
            $productName = $b['productName'] ?? null;
            $productImage = $b['productImage'] ?? null;
            if ($email === '' || !$orderId || $productId === '' || !$rating) return response()->json(['success'=>false,'message'=>'email, orderId, productId, rating wajib'], 400);
            DB::statement("CREATE TABLE IF NOT EXISTS reviews (id INT AUTO_INCREMENT PRIMARY KEY, customer_email VARCHAR(255) NOT NULL, order_id INT NOT NULL, product_id VARCHAR(64) NOT NULL, rating INT NOT NULL, comment TEXT NULL, product_name VARCHAR(255) NULL, product_image TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL, UNIQUE KEY uniq_review (customer_email, order_id, product_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            DB::statement("INSERT INTO reviews (customer_email, order_id, product_id, rating, comment, product_name, product_image, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), product_name = VALUES(product_name), product_image = VALUES(product_image), updated_at = CURRENT_TIMESTAMP", [$email, $orderId, $productId, $rating, $comment, $productName, $productImage]);
            return response()->json(['success'=>true,'message'=>'Review saved']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to save review'], 500);
        }
    }

    public function listReviews(Request $req)
    {
        try {
            $email = trim((string)$req->query('email', ''));
            $orderId = $req->query('orderId');
            if ($email === '') return response()->json(['success'=>false,'message'=>'email diperlukan'], 400);
            DB::statement("CREATE TABLE IF NOT EXISTS reviews (id INT AUTO_INCREMENT PRIMARY KEY, customer_email VARCHAR(255) NOT NULL, order_id INT NOT NULL, product_id VARCHAR(64) NOT NULL, rating INT NOT NULL, comment TEXT NULL, product_name VARCHAR(255) NULL, product_image TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL, UNIQUE KEY uniq_review (customer_email, order_id, product_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $where = ['customer_email = ?']; $params = [$email];
            if ($orderId) { $where[] = 'order_id = ?'; $params[] = (int)$orderId; }
            $rows = DB::select("SELECT id, customer_email, order_id, product_id, rating, comment, product_name, product_image, created_at FROM reviews WHERE ".implode(' AND ', $where)." ORDER BY id DESC LIMIT 500", $params);
            return response()->json(['success'=>true,'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to list reviews'], 500);
        }
    }

    public function categories(Request $req)
    {
        try {
            $rows = DB::select("SELECT id, name, slug, description, image_url, meta_title, meta_description, parent_id, sort_order, is_active FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC");
            $data = array_map(function($c){
                return [
                    'id' => (string)$c->id,
                    'name' => $c->name ?? '',
                    'slug' => $c->slug ?? strtolower($c->name ?? ''),
                    'description' => $c->description ?? '',
                    'image_url' => $c->image_url ?? '',
                    'meta_title' => $c->meta_title ?? null,
                    'meta_description' => $c->meta_description ?? null,
                    'parent_id' => $c->parent_id !== null ? (string)$c->parent_id : null,
                    'sort_order' => (int)($c->sort_order ?? 0),
                    'is_active' => (bool)$c->is_active,
                    'products_count' => 0,
                    'isPopular' => false,
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }
public function customerStatus(Request $req)
{
    $email = $req->query('email');

    if (!$email) {
        return response()->json([
            'success' => false,
            'found'   => false,
            'status'  => null,
            'message' => 'Email is required',
        ], 400);
    }

    try {
        // LANGSUNG cek di tabel users saja
        $user = DB::selectOne(
            'SELECT is_active FROM users WHERE email = ? LIMIT 1',
            [$email]
        );

        if ($user) {
            $status = ((int)($user->is_active ?? 0) === 1) ? 'active' : 'inactive';
            return response()->json([
                'success' => true,
                'found'   => true,
                'status'  => $status,
            ]);
        }

        // tidak ada user dengan email tsb
        return response()->json([
            'success' => true,
            'found'   => false,
            'status'  => null,
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'success' => false,
            'found'   => false,
            'status'  => null,
            'message' => $e->getMessage(),
        ], 500);
    }
}
}
