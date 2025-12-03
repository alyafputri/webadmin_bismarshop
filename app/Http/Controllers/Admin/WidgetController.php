<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class WidgetController extends BaseController
{
    private function ensurePermission(Request $req, string $perm)
    {
        $user = $req->attributes->get('auth_user');
        $perms = $user['permissions'] ?? [];
        if (!in_array($perm, $perms)) {
            abort(response()->json(['success'=>false,'message'=>'Forbidden'], 403));
        }
    }

    public function index(Request $req)
    {
        $this->ensurePermission($req, 'widgets');
        try {
            // Ensure widgets table and new columns
            $exists = DB::selectOne("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'widgets'");
            if (!$exists || (int)$exists->c === 0) {
                DB::statement("CREATE TABLE widgets (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, type ENUM('banner','widget','promotion','category') NOT NULL DEFAULT 'banner', category_slug VARCHAR(50) NULL, file_path VARCHAR(500) NOT NULL, url VARCHAR(500) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                try { DB::statement("ALTER TABLE widgets ADD COLUMN IF NOT EXISTS category_slug VARCHAR(50) NULL AFTER type"); } catch (\Throwable $e) {}
                try { DB::statement("ALTER TABLE widgets MODIFY COLUMN type ENUM('banner','widget','promotion','category') NOT NULL DEFAULT 'banner'"); } catch (\Throwable $e) {}
            }
            $rows = DB::select('SELECT * FROM widgets ORDER BY created_at DESC');
            $data = array_map(function($w){
                return [
                    'id'=>$w->id,
                    'title'=>$w->title ?? 'Untitled Widget',
                    'type'=>$w->type ?? 'banner',
                    'category_slug'=>$w->category_slug ?? '',
                    'file_path'=>$w->file_path ?? '',
                    'url'=>$w->url ?? '',
                    'is_active'=> (bool)$w->is_active,
                    'created_at'=>$w->created_at,
                    'updated_at'=>$w->updated_at,
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to fetch widgets','error'=>$e->getMessage()], 500);
        }
    }

    public function store(Request $req)
    {
        $this->ensurePermission($req, 'widgets');
        try {
            // Ensure widgets table exists (same logic as in index()) so upload doesn't fail
            try {
                $exists = DB::selectOne("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'widgets'");
                if (!$exists || (int)$exists->c === 0) {
                    DB::statement("CREATE TABLE widgets (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(150) NOT NULL, type ENUM('banner','widget','promotion','category') NOT NULL DEFAULT 'banner', category_slug VARCHAR(50) NULL, file_path VARCHAR(500) NOT NULL, url VARCHAR(500) NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                } else {
                    try { DB::statement("ALTER TABLE widgets ADD COLUMN IF NOT EXISTS category_slug VARCHAR(50) NULL AFTER type"); } catch (\Throwable $e) {}
                    try { DB::statement("ALTER TABLE widgets MODIFY COLUMN type ENUM('banner','widget','promotion','category') NOT NULL DEFAULT 'banner'"); } catch (\Throwable $e) {}
                }
            } catch (\Throwable $e) {
                // If this fails (e.g. non-MySQL driver), ignore and let DB::table() fail loudly instead
            }

            $file = $req->file('file');
            if (!$file) {
                return response()->json(['success'=>false,'message'=>'No file uploaded. Please select an image file.'], 400);
            }
            $mime = $file->getMimeType();
            $allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];
            if (!in_array($mime, $allowed)) {
                return response()->json(['success'=>false,'message'=>'Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.'], 400);
            }
            $title = $req->input('title', 'New Widget');
            $type = $req->input('type', 'banner');
            $is_active = (int)($req->input('is_active', 1)) ? 1 : 0;
            $category_slug = $req->input('category_slug');

            // Simpan ke public/uploads agar konsisten dengan gambar lain (produk, banner)
            $dir = public_path('../widget');
            if (!is_dir($dir)) @mkdir($dir, 0777, true);
            $filename = 'widget-'.time().'-'.mt_rand(1000,9999).'.'.$file->getClientOriginalExtension();
            $file->move($dir, $filename);
            $filePath = 'uploads'.DIRECTORY_SEPARATOR.$filename; // path informasional
            $url = '/widget/'.$filename;

            $id = DB::table('widgets')->insertGetId([
                'title'=>$title,
                'type'=>$type,
                'category_slug'=> $category_slug ?: null,
                'file_path'=>$filePath,
                'url'=>$url,
                'is_active'=>$is_active,
                'created_at'=>now(),
            ]);
            return response()->json(['success'=>true,'message'=>'Widget uploaded successfully','data'=>[
                'id'=>$id,'title'=>$title,'type'=>$type,'category_slug'=>$category_slug,'url'=>$url,'is_active'=>$is_active
            ]]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to upload widget','error'=>$e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        $this->ensurePermission($req, 'widgets');
        try {
            $title = $req->input('title');
            $is_active = $req->input('is_active');
            $affected = DB::update("UPDATE widgets SET title = COALESCE(?, title), is_active = COALESCE(?, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
                $title ?: null,
                $is_active !== null ? ((int)$is_active ? 1 : 0) : null,
                (int)$id
            ]);
            if ($affected === 0) return response()->json(['success'=>false,'message'=>'Widget not found'], 404);
            return response()->json(['success'=>true,'message'=>'Widget updated successfully']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to update widget','error'=>$e->getMessage()], 500);
        }
    }

    public function destroy(Request $req, $id)
    {
        $this->ensurePermission($req, 'widgets');
        try {
            $row = DB::selectOne('SELECT file_path, title FROM widgets WHERE id = ? LIMIT 1', [(int)$id]);
            if (!$row) return response()->json(['success'=>false,'message'=>'Widget not found'], 404);
            DB::table('widgets')->where('id', (int)$id)->delete();
            if (!empty($row->file_path)) {
                $abs = base_path($row->file_path);
                if (!file_exists($abs)) {
                    $abs = public_path(ltrim((string)str_replace(['public'.DIRECTORY_SEPARATOR,'\\'], ['', '/'], $row->file_path), '/'));
                }
                if (file_exists($abs)) @unlink($abs);
            }
            return response()->json(['success'=>true,'message'=>'Widget deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to delete widget','error'=>$e->getMessage()], 500);
        }
    }

    public function getBanner(Request $req)
    {
        $this->ensurePermission($req, 'widgets');
        // Pick latest active banner
        $row = DB::selectOne("SELECT url FROM widgets WHERE type = 'banner' AND is_active = 1 ORDER BY id DESC LIMIT 1");
        return response()->json(['success'=>true,'banner'=> $row->url ?? null]);
    }

    public function uploadBanner(Request $req)
    {
        $this->ensurePermission($req, 'widgets');
        try {
            $file = $req->file('banner') ?: $req->file('file');
            if (!$file) return response()->json(['success'=>false,'message'=>'No file uploaded'], 400);
            $allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif'];
            if (!in_array($file->getMimeType(), $allowed)) return response()->json(['success'=>false,'message'=>'Only image files are allowed'], 400);

            $dir = public_path('../widget');
            if (!is_dir($dir)) @mkdir($dir, 0777, true);
            $filename = 'banner-'.time().'-'.mt_rand(1000,9999).'.'.$file->getClientOriginalExtension();
            $file->move($dir, $filename);
            $url = '/widget'.$filename;
            // Optionally store as a widget row too for consistency
            try { DB::table('widgets')->insert(['title'=>'Banner','type'=>'banner','file_path'=>'public/uploads/'.$filename,'url'=>$url,'is_active'=>1,'created_at'=>now()]); } catch (\Throwable $e) {}
            return response()->json(['success'=>true,'url'=>$url]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>$e->getMessage()], 400);
        }
    }
}
