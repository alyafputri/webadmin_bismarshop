<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class ProductController extends BaseController
{
    private function ensureProductSchema(): void
    {
        try {
            if (!Schema::hasTable('products')) {
                Schema::create('products', function (Blueprint $table) {
                    $table->increments('id');
                    $table->string('name', 200);
                    $table->string('category', 100)->default('');
                    $table->bigInteger('regular_price')->default(0);
                    $table->bigInteger('promo_price')->nullable();
                    $table->integer('stock')->default(0);
                    $table->string('status', 20)->default('active');
                    $table->text('description')->nullable();
                    $table->integer('sold_count')->default(0);
                    $table->string('product_image', 500)->nullable();
                    $table->text('variants_json')->nullable();
                    $table->timestamps();
                });
            }
        } catch (\Throwable $e) {
            // ignore schema ensure errors
        }
    }

    /* =========================
     * LIST PRODUCTS
     * ========================= */
    public function index(Request $req)
    {
        $limit = min((int)$req->query('limit', 200), 500);
        $q = $req->query('q');

        $where = [];
        $params = [];

        if ($q) {
            $where[] = '(name LIKE ? OR description LIKE ?)';
            $params[] = "%$q%";
            $params[] = "%$q%";
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        try {
            // MERGED: ambil status + variants_json
            $rows = DB::select(
                "SELECT id, name, category, regular_price, promo_price, stock, status, variants_json
                 FROM products $whereSql
                 ORDER BY id DESC
                 LIMIT $limit",
                $params
            );

            if ($rows) {
                $ids = array_map(fn($r) => $r->id, $rows);
                $ph = implode(',', array_fill(0, count($ids), '?'));

                try {
                    $imgRows = DB::select(
                        "SELECT product_id, image_url
                         FROM product_images
                         WHERE product_id IN ($ph)
                         ORDER BY sort_order, id",
                        $ids
                    );

                    $imgMap = [];
                    foreach ($imgRows as $ir) {
                        $imgMap[$ir->product_id][] = $ir->image_url;
                    }

                    foreach ($rows as $r) {
                        $r->images = $imgMap[$r->id] ?? [];
                    }
                } catch (\Throwable $e) {}
            }

            return response()->json([
                'success' => true,
                'count' => count($rows),
                'data' => $rows
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => true,
                'count' => 0,
                'data' => []
            ]);
        }
    }

    /* =========================
     * SHOW PRODUCT
     * ========================= */
    public function show($id)
    {
        try {
            $id = (int)$id;
            $rows = DB::select('SELECT * FROM products WHERE id = ? LIMIT 1', [$id]);
            if (!$rows) {
                return response()->json(['success' => false, 'message' => 'Product not found'], 404);
            }

            $images = DB::select(
                'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id',
                [$id]
            );

            $variants = DB::select(
                'SELECT type, name, stock FROM product_variants WHERE product_id = ? ORDER BY id',
                [$id]
            );

            $data = (array)$rows[0];
            $data['images'] = array_map(fn($r) => $r->image_url, $images);

            $data['variants'] = $variants
                ? array_map(fn($v) => [
                    'type' => $v->type,
                    'name' => $v->name,
                    'stock' => $v->stock
                ], $variants)
                : (json_decode($data['variants_json'] ?? '[]', true) ?: []);

            return response()->json(['success' => true, 'data' => $data]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to fetch product'], 500);
        }
    }

    /* =========================
     * CREATE PRODUCT
     * ========================= */
    public function store(Request $req)
    {
        try {
            $this->ensureProductSchema();

            $name = (string)$req->input('name');
            $category = (string)$req->input('category');
            $regular = (int)$req->input('regular_price', 0);
            $promo = $req->input('promo_price');
            $stock = (int)$req->input('stock', 0);
            $description = $req->input('description');
            $status = (string)$req->input('status', 'active');
            $variants = $req->input('variants');

            if ($name === '' || $category === '') {
                return response()->json(['success' => false, 'message' => 'Invalid data'], 422);
            }

            $id = DB::table('products')->insertGetId([
                'name' => $name,
                'category' => $category,
                'regular_price' => $regular,
                'promo_price' => $promo !== '' ? $promo : null,
                'stock' => $stock,
                'status' => $status,
                'description' => $description,
                'variants_json' => is_array($variants) ? json_encode($variants) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['success' => true, 'message' => 'Product created', 'id' => $id]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to create product'], 500);
        }
    }

    /* =========================
     * UPDATE PRODUCT
     * ========================= */
    public function update(Request $req, $id)
    {
        try {
            $id = (int)$id;
            $fields = [];
            $params = [];

            foreach (['name', 'category', 'description', 'status'] as $f) {
                if ($req->has($f)) {
                    $fields[] = "$f = ?";
                    $params[] = (string)$req->input($f);
                }
            }

            if ($req->has('regular_price')) {
                $fields[] = 'regular_price = ?';
                $params[] = (int)$req->input('regular_price');
            }

            if ($req->has('promo_price')) {
                $fields[] = 'promo_price = ?';
                $params[] = $req->input('promo_price') !== '' ? (int)$req->input('promo_price') : null;
            }

            if ($req->has('stock')) {
                $fields[] = 'stock = ?';
                $params[] = (int)$req->input('stock');
            }

            if ($req->has('variants')) {
                $fields[] = 'variants_json = ?';
                $params[] = json_encode($req->input('variants'));
            }

            if (!$fields) {
                return response()->json(['success' => true, 'message' => 'Nothing to update']);
            }

            $params[] = $id;
            DB::update(
                'UPDATE products SET ' . implode(', ', $fields) . ', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                $params
            );

            return response()->json(['success' => true, 'message' => 'Product updated']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update product'], 500);
        }
    }

    /* =========================
     * DELETE PRODUCT
     * ========================= */
    public function destroy($id)
    {
        try {
            $id = (int)$id;
            DB::delete('DELETE FROM product_images WHERE product_id = ?', [$id]);
            DB::delete('DELETE FROM product_variants WHERE product_id = ?', [$id]);
            DB::delete('DELETE FROM products WHERE id = ?', [$id]);

            return response()->json(['success' => true, 'message' => 'Product deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete product'], 500);
        }
    }
}
