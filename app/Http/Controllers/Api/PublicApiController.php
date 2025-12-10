<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PublicApiController extends BaseController
{
    // ... (tidak ada perubahan)

    public function upsertReview(Request $req)
    {
        try {
            $b           = $req->all();
            $email       = trim((string)($b['email'] ?? ''));
            $rawOrderId  = $b['orderId'] ?? null;
            $orderId     = is_numeric($rawOrderId) ? (int)$rawOrderId : 0;
            $productId   = trim((string)($b['productId'] ?? ''));
            $rating      = (int)($b['rating'] ?? 0);
            $comment     = $b['comment'] ?? null;
            $productName = $b['productName'] ?? null;
            $productImage= $b['productImage'] ?? null;

            // Hanya wajib email dan rating, supaya review dari aplikasi tidak mudah gagal
            if ($email === '' || $rating <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'email dan rating wajib diisi',
                ], 400);
            }

            // Jika productId kosong tetapi ada nama produk, gunakan nama produk sebagai pengganti ID
            if ($productId === '' && $productName) {
                $productId = substr(preg_replace('/\s+/', '-', strtolower((string) $productName)), 0, 64) ?: 'unknown';
            }
            if ($productId === '') {
                $productId = 'unknown';
            }

            // Pastikan tabel reviews ada dengan kolom minimal yang dibutuhkan
            if (!Schema::hasTable('reviews')) {
                Schema::create('reviews', function ($table) {
                    /** @var \Illuminate\Database\Schema\Blueprint $table */
                    $table->increments('id');
                    $table->string('customer_email', 255);
                    $table->integer('order_id')->default(0);
                    $table->string('product_id', 64);
                    $table->integer('rating');
                    $table->text('comment')->nullable();
                    $table->string('product_name', 255)->nullable();
                    $table->text('product_image')->nullable();
                    $table->timestamp('created_at')->useCurrent();
                    $table->timestamp('updated_at')->nullable();
                    $table->unique(['customer_email', 'order_id', 'product_id'], 'uniq_review');
                });
            }

            // Simpan atau update review menggunakan Query Builder
            $review = DB::table('reviews')
                ->where('customer_email', $email)
                ->where('order_id', $orderId)
                ->where('product_id', $productId)
                ->first();

            if ($review) {
                DB::table('reviews')
                    ->where('id', $review->id)
                    ->update([
                        'rating'       => $rating,
                        'comment'      => $comment,
                        'product_name' => $productName,
                        'product_image'=> $productImage,
                        'updated_at'   => now(),
                    ]);
            } else {
                DB::table('reviews')->insert([
                    'customer_email' => $email,
                    'order_id'       => $orderId,
                    'product_id'     => $productId,
                    'rating'         => $rating,
                    'comment'        => $comment,
                    'product_name'   => $productName,
                    'product_image'  => $productImage,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            return response()->json(['success' => true, 'message' => 'Review saved']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save review',
                'error'   => $e->getMessage(),
            ], 500);
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
