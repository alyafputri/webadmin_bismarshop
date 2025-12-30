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
                    // use text to keep DB-agnostic
                    $table->text('variants_json')->nullable();
                    $table->timestamps();
                });
            } else {
                // Add missing columns progressively
                $addCols = [];
                if (!Schema::hasColumn('products','name') || !Schema::hasColumn('products','category') || !Schema::hasColumn('products','regular_price') || !Schema::hasColumn('products','stock')) {
                    Schema::table('products', function (Blueprint $t) {
                        if (!Schema::hasColumn('products','name')) $t->string('name',200)->default('');
                        if (!Schema::hasColumn('products','category')) $t->string('category',100)->default('');
                        if (!Schema::hasColumn('products','regular_price')) $t->bigInteger('regular_price')->default(0);
                        if (!Schema::hasColumn('products','promo_price')) $t->bigInteger('promo_price')->nullable();
                        if (!Schema::hasColumn('products','stock')) $t->integer('stock')->default(0);
                    });
                }
                if (!Schema::hasColumn('products','status') || !Schema::hasColumn('products','description') || !Schema::hasColumn('products','sold_count') || !Schema::hasColumn('products','variants_json') || !Schema::hasColumn('products','product_image')) {
                    Schema::table('products', function (Blueprint $t) {
                        if (!Schema::hasColumn('products','status')) $t->string('status',20)->default('active');
                        if (!Schema::hasColumn('products','description')) $t->text('description')->nullable();
                        if (!Schema::hasColumn('products','sold_count')) $t->integer('sold_count')->default(0);
                        if (!Schema::hasColumn('products','variants_json')) $t->text('variants_json')->nullable();
                        if (!Schema::hasColumn('products','product_image')) $t->string('product_image', 500)->nullable();
                    });
                }
                if (!Schema::hasColumn('products','created_at') || !Schema::hasColumn('products','updated_at')) {
                    Schema::table('products', function (Blueprint $t) {
                        if (!Schema::hasColumn('products','created_at')) $t->timestamp('created_at')->nullable();
                        if (!Schema::hasColumn('products','updated_at')) $t->timestamp('updated_at')->nullable();
                    });
                }
            }

            if (!Schema::hasTable('product_images')) {
                Schema::create('product_images', function (Blueprint $t) {
                    $t->increments('id');
                    $t->integer('product_id')->index();
                    $t->string('image_url', 500);
                    $t->integer('sort_order')->default(0);
                    $t->timestamp('created_at')->useCurrent();
                });
            } else {
                Schema::table('product_images', function (Blueprint $t) {
                    if (!Schema::hasColumn('product_images','product_id')) $t->integer('product_id')->index();
                    if (!Schema::hasColumn('product_images','image_url')) $t->string('image_url',500);
                    if (!Schema::hasColumn('product_images','sort_order')) $t->integer('sort_order')->default(0);
                    if (!Schema::hasColumn('product_images','created_at')) $t->timestamp('created_at')->useCurrent();
                });
            }

            if (!Schema::hasTable('product_variants')) {
                Schema::create('product_variants', function (Blueprint $t) {
                    $t->increments('id');
                    $t->integer('product_id')->index();
                    $t->string('type', 100)->nullable();
                    $t->string('name', 200)->nullable();
                    $t->integer('stock')->default(0);
                });
            } else {
                Schema::table('product_variants', function (Blueprint $t) {
                    if (!Schema::hasColumn('product_variants','product_id')) $t->integer('product_id')->index();
                    if (!Schema::hasColumn('product_variants','type')) $t->string('type',100)->nullable();
                    if (!Schema::hasColumn('product_variants','name')) $t->string('name',200)->nullable();
                    if (!Schema::hasColumn('product_variants','stock')) $t->integer('stock')->default(0);
                });
            }
        } catch (\Throwable $e) {
            // ignore schema ensure errors
        }
    }
    public function index(Request $req)
    {
        $limit = min((int)$req->query('limit', 200), 500);
        $q = $req->query('q');
        $where = [];$params=[];
        if ($q) { $where[] = '(name LIKE ? OR description LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
        $whereSql = $where ? ('WHERE '.implode(' AND ',$where)) : '';
        try {
            $rows = DB::select("SELECT id, name, category, regular_price, promo_price, stock, status, variants_json FROM products $whereSql ORDER BY id DESC LIMIT $limit", $params);
            if ($rows) {
                $ids = array_map(fn($r)=>$r->id, $rows);
                $ph = implode(',', array_fill(0, count($ids), '?'));
                try {
                    $imgRows = DB::select("SELECT product_id, image_url FROM product_images WHERE product_id IN ($ph) ORDER BY sort_order, id", $ids);
                    $imgMap = [];
                    foreach ($imgRows as $ir) {
                        $imgMap[$ir->product_id] = ($imgMap[$ir->product_id] ?? []);
                        $u = (string)$ir->image_url;
                        if ($u !== '' && !(strpos($u, 'http://') === 0 || strpos($u, 'https://') === 0)) {
                            // normalize to '/uploads/...'
                            $u = str_replace('\\', '/', $u);
                            if (strpos($u, 'uploads') !== false) {
                                $u = '/' . substr($u, strpos($u, 'uploads'));
                            } elseif ($u[0] !== '/') {
                                $u = '/' . ltrim($u, '/');
                            }
                        }
                        $imgMap[$ir->product_id][] = $u;
                    }
                    // attach images
                    foreach ($rows as $r) {
                        $r->images = $imgMap[$r->id] ?? [];
                    }
                } catch (\Throwable $e) {}
            }
            return response()->json(['success'=>true,'count'=>count($rows),'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'count'=>0,'data'=>[]]);
        }
    }

    public function show($id)
    {
        try {
            $id = (int)$id;
            $rows = DB::select('SELECT * FROM products WHERE id = ? LIMIT 1', [$id]);
            if (!$rows) return response()->json(['success'=>false,'message'=>'Product not found'], 404);
            $images = DB::select('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [$id]);
            $variants = DB::select('SELECT type, name, stock FROM product_variants WHERE product_id = ? ORDER BY id', [$id]);
            $data = (array)$rows[0];
            $data['images'] = array_map(fn($r)=>$r->image_url, $images);
            if (!$variants) {
                try { $data['variants'] = $data['variants_json'] ? json_decode($data['variants_json'], true) : []; } catch (\Throwable $e) { $data['variants'] = []; }
            } else {
                $data['variants'] = array_map(fn($v)=>['type'=>$v->type,'name'=>$v->name,'stock'=>$v->stock], $variants);
            }
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to fetch product'], 500);
        }
    }

    public function store(Request $req)
    {
        try {
            // Ensure tables/columns exist to prevent insert failures
            $this->ensureProductSchema();

            $name = (string)$req->input('name');
            $category = (string)$req->input('category');
            $regular = (int)($req->input('regular_price') ?? 0);
            $promo = $req->input('promo_price'); $promo = ($promo === null || $promo === '') ? null : (int)$promo;
            $stock = (int)($req->input('stock') ?? 0);
            $description = $req->input('description');
            $variants = $req->input('variants');
            // Accept images from multiple formats: array, JSON string, comma-separated string, or single 'image'
            $images = $req->input('images');
            if (is_string($images)) {
                $tmp = null; try { $tmp = json_decode($images, true); } catch (\Throwable $e) { $tmp = null; }
                if (is_array($tmp)) { $images = $tmp; }
                elseif (strpos($images, ',') !== false) { $images = array_map('trim', explode(',', $images)); }
                else { $images = $images !== '' ? [$images] : []; }
            }
            if (!is_array($images)) { $images = []; }
            $singleImage = $req->input('image');
            if (is_string($singleImage) && $singleImage !== '') { $images[] = $singleImage; }
            // Also accept direct file uploads on this endpoint
            try {
                $files = $req->file('images');
                if ($files) {
                    if (!is_array($files)) $files = [$files];
                    $dest = public_path('uploads'); if (!is_dir($dest)) @mkdir($dest, 0775, true);
                    foreach ($files as $file) {
                        if (!$file || !$file->isValid()) continue;
                        $orig = $file->getClientOriginalName();
                        $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
                        $name = time() . '_' . $safe;
                        $file->move($dest, $name);
                        $images[] = '/uploads/' . $name;
                    }
                }
                $one = $req->file('image');
                if ($one && $one->isValid()) {
                    $dest = public_path('uploads'); if (!is_dir($dest)) @mkdir($dest, 0775, true);
                    $orig = $one->getClientOriginalName();
                    $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
                    $name = time() . '_' . $safe;
                    $one->move($dest, $name);
                    $images[] = '/uploads/' . $name;
                }
            } catch (\Throwable $e) {
                return response()->json(['success'=>false,'message'=>'File upload failed: '.$e->getMessage()], 422);
            }
            $status = (string)($req->input('status') ?? 'active');

            if ($name === '' || $category === '' || !is_int($regular) || !is_int($stock)) {
                return response()->json(['success'=>false,'message'=>'Missing required fields: name, category, regular_price, stock'], 422);
            }

            $id = DB::table('products')->insertGetId([
                'name'=>$name,
                'category'=>$category,
                'regular_price'=>$regular,
                'promo_price'=>$promo,
                'stock'=>$stock,
                'status'=>$status ?: 'active',
                'description'=>$description,
                'product_image'=> is_array($images) && count($images) > 0 ? $images[0] : null,
                'variants_json'=> is_array($variants) ? json_encode($variants) : (is_string($variants)? $variants : null),
                'created_at'=>now(),
                'updated_at'=>now(),
            ]);

            // Best-effort inserts; do not fail the whole request if these throw
            try {
                if (is_array($images) && count($images)) {
                    foreach ($images as $i => $url) {
                        DB::table('product_images')->insert(['product_id'=>$id,'image_url'=>$url,'sort_order'=>$i]);
                    }
                }
            } catch (\Throwable $e) { /* ignore image insert errors */ }

            try {
                if (is_array($variants)) {
                    foreach ($variants as $v) {
                        DB::table('product_variants')->insert([
                            'product_id'=>$id,
                            'type'=> is_array($v)? ($v['type']??null): null,
                            'name'=> is_array($v)? ($v['name']??null): null,
                            'stock'=> (int)(is_array($v)? ($v['stock']??0):0),
                        ]);
                    }
                }
            } catch (\Throwable $e) { /* ignore variant insert errors */ }

            // Return created data with images (best effort)
            try {
                $prow = DB::select('SELECT * FROM products WHERE id = ? LIMIT 1', [$id]);
                $img = DB::select('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [$id]);
                $data = (array)($prow[0] ?? []);
                $data['images'] = array_map(function($r){
                    $u = (string)$r->image_url;
                    if ($u !== '' && !(strpos($u, 'http://') === 0 || strpos($u, 'https://') === 0)) {
                        $u = str_replace('\\', '/', $u);
                        if (strpos($u, 'uploads') !== false) $u = '/' . substr($u, strpos($u, 'uploads'));
                        elseif ($u && $u[0] !== '/') $u = '/' . ltrim($u, '/');
                    }
                    return $u;
                }, $img);
                return response()->json(['success'=>true,'message'=>'Product created','id'=>$id,'data'=>$data]);
            } catch (\Throwable $e) {
                // Even if fetching data failed, product is created
                return response()->json(['success'=>true,'message'=>'Product created','id'=>$id]);
            }
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to create product','error'=>$e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            // Ensure schema to avoid update failures on missing cols
            $this->ensureProductSchema();
            $id = (int)$id;
            $fields = [];$params=[];
            foreach (['name','category','description','status'] as $f) {
                if ($req->has($f)) { $fields[] = "$f = ?"; $params[] = (string)$req->input($f); }
            }
            if ($req->has('regular_price')) { $fields[] = 'regular_price = ?'; $params[] = (int)$req->input('regular_price'); }
            if ($req->has('promo_price')) { $fields[] = 'promo_price = ?'; $val = $req->input('promo_price'); $params[] = ($val === null || $val==='') ? null : (int)$val; }
            if ($req->has('stock')) { $fields[] = 'stock = ?'; $params[] = (int)$req->input('stock'); }
            if ($req->has('variants')) { $fields[] = 'variants_json = ?'; $v = $req->input('variants'); $params[] = is_array($v)? json_encode($v): (is_string($v)? $v: null); }

            // Optional update images/variants arrays if provided fully
            // Accept images in multiple formats on update
            if ($req->has('images') || $req->file('images') || $req->file('image')) {
                $images = $req->input('images');
                if (is_string($images)) {
                    $tmp = null; try { $tmp = json_decode($images, true); } catch (\Throwable $e) { $tmp = null; }
                    if (is_array($tmp)) { $images = $tmp; }
                    elseif (strpos($images, ',') !== false) { $images = array_map('trim', explode(',', $images)); }
                    else { $images = $images !== '' ? [$images] : []; }
                }
                if (!is_array($images)) { $images = []; }
                $singleImage = $req->input('image');
                if (is_string($singleImage) && $singleImage !== '') { $images[] = $singleImage; }
                // Also accept direct file uploads
                try {
                    $files = $req->file('images');
                    if ($files) {
                        if (!is_array($files)) $files = [$files];
                        $dest = public_path('uploads'); if (!is_dir($dest)) @mkdir($dest, 0775, true);
                        foreach ($files as $file) {
                            if (!$file || !$file->isValid()) continue;
                            $orig = $file->getClientOriginalName();
                            $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
                            $name = time() . '_' . $safe;
                            $file->move($dest, $name);
                            $images[] = '/uploads/' . $name;
                        }
                    }
                    $one = $req->file('image');
                    if ($one && $one->isValid()) {
                        $dest = public_path('uploads'); if (!is_dir($dest)) @mkdir($dest, 0775, true);
                        $orig = $one->getClientOriginalName();
                        $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
                        $name = time() . '_' . $safe;
                        $one->move($dest, $name);
                        $images[] = '/uploads/' . $name;
                    }
                } catch (\Throwable $e) {
                    return response()->json(['success'=>false,'message'=>'File upload failed: '.$e->getMessage()], 422);
                }

                if (is_array($images) && count($images) > 0) {
                    $fields[] = 'product_image = ?';
                    $params[] = $images[0];
                }

                try {
                    DB::delete('DELETE FROM product_images WHERE product_id = ?', [$id]);
                    foreach ($images as $i => $url) {
                        DB::table('product_images')->insert(['product_id'=>$id,'image_url'=>$url,'sort_order'=>$i]);
                    }
                } catch (\Throwable $e) { /* ignore image update errors */ }
            }

            if (!$fields) return response()->json(['success'=>true,'message'=>'Nothing to update']);
            $params[] = $id;
            DB::update('UPDATE products SET '.implode(', ',$fields).', updated_at = CURRENT_TIMESTAMP WHERE id = ?', $params);

            if ($req->has('variants') && is_array($req->input('variants'))) {
                DB::delete('DELETE FROM product_variants WHERE product_id = ?', [$id]);
                foreach ($req->input('variants') as $v) {
                    DB::table('product_variants')->insert([
                        'product_id'=>$id,
                        'type'=> is_array($v)? ($v['type']??null): null,
                        'name'=> is_array($v)? ($v['name']??null): null,
                        'stock'=> (int)(is_array($v)? ($v['stock']??0):0),
                    ]);
                }
            }

            $row = DB::select('SELECT * FROM products WHERE id = ? LIMIT 1', [$id]);
            $imgs = DB::select('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order, id', [$id]);
            $data = (array)($row[0] ?? []);
            $data['images'] = array_map(function($r){
                $u = (string)$r->image_url;
                if ($u !== '' && !(strpos($u, 'http://') === 0 || strpos($u, 'https://') === 0)) {
                    $u = str_replace('\\', '/', $u);
                    if (strpos($u, 'uploads') !== false) $u = '/' . substr($u, strpos($u, 'uploads'));
                    elseif ($u && $u[0] !== '/') $u = '/' . ltrim($u, '/');
                }
                return $u;
            }, $imgs);
            return response()->json(['success'=>true,'message'=>'Product updated','data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to update product','error'=>$e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $id = (int)$id;
            DB::delete('DELETE FROM product_images WHERE product_id = ?', [$id]);
            DB::delete('DELETE FROM product_variants WHERE product_id = ?', [$id]);
            DB::delete('DELETE FROM products WHERE id = ?', [$id]);
            return response()->json(['success'=>true,'message'=>'Product deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to delete product','error'=>$e->getMessage()], 500);
        }
    }
}
