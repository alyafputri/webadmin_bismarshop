<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class UploadController extends BaseController
{
    public function upload(Request $request)
    {
        try {
            $files = $request->file('images');
            if (!$files) {
                return response()->json(['success' => false, 'message' => 'No files uploaded'], 400);
            }
            if (!is_array($files)) $files = [$files];

            $uploaded = [];
            $dest = public_path('../uploads');
            if (!is_dir($dest)) @mkdir($dest, 0775, true);

            // Ensure product_images table exists before inserting placeholders
            try {
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
                        if (!Schema::hasColumn('product_images', 'product_id')) $t->integer('product_id')->index();
                        if (!Schema::hasColumn('product_images', 'image_url')) $t->string('image_url', 500);
                        if (!Schema::hasColumn('product_images', 'sort_order')) $t->integer('sort_order')->default(0);
                        if (!Schema::hasColumn('product_images', 'created_at')) $t->timestamp('created_at')->useCurrent();
                    });
                }
            } catch (\Throwable $e0) {
                try {
                    if (!Schema::hasTable('product_images')) {
                        $driver = DB::getDriverName();
                        if ($driver === 'mysql') {
                            DB::statement("CREATE TABLE IF NOT EXISTS product_images (
                                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                                product_id INT NOT NULL,
                                image_url VARCHAR(500) NOT NULL,
                                sort_order INT NOT NULL DEFAULT 0,
                                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                                INDEX (product_id)
                            )");
                        } elseif ($driver === 'sqlite') {
                            DB::statement("CREATE TABLE IF NOT EXISTS product_images (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                product_id INTEGER NOT NULL,
                                image_url TEXT NOT NULL,
                                sort_order INTEGER NOT NULL DEFAULT 0,
                                created_at TEXT DEFAULT CURRENT_TIMESTAMP
                            )");
                            DB::statement("CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)");
                        } else {
                            DB::statement("CREATE TABLE IF NOT EXISTS product_images (
                                id SERIAL PRIMARY KEY,
                                product_id INTEGER NOT NULL,
                                image_url VARCHAR(500) NOT NULL,
                                sort_order INTEGER NOT NULL DEFAULT 0,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )");
                        }
                    }
                } catch (\Throwable $_) {}
            }

            foreach ($files as $file) {
                if (!$file->isValid()) continue;
                $orig = $file->getClientOriginalName();
                $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
                $name = time() . '_' . $safe;
                $file->move($dest, $name);
                $uploaded[] = [
                    'filename' => $name,
                    'originalname' => $orig,
                    'url' => '/uploads/' . $name,
                    'size' => @filesize($dest . DIRECTORY_SEPARATOR . $name) ?: 0,
                ];
                // Best-effort placeholder row that can be relinked on product save
                try {
                    DB::table('product_images')->insert([
                        'product_id' => 0,
                        'image_url' => '/uploads/' . $name,
                        'sort_order' => 0,
                        'created_at' => now(),
                    ]);
                } catch (\Throwable $_) {}
            }

            return response()->json(['success' => true, 'files' => $uploaded]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
