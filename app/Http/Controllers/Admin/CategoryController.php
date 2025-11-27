<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CategoryController extends BaseController
{
    private function ensureTable(): void
    {
        try {
            if (!Schema::hasTable('categories')) {
                DB::statement("CREATE TABLE categories (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    slug VARCHAR(200) NOT NULL UNIQUE,
                    description TEXT NULL,
                    image_url VARCHAR(1024) NULL,
                    meta_title VARCHAR(200) NULL,
                    meta_description VARCHAR(500) NULL,
                    parent_id INT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT NULL,
                    INDEX idx_slug(slug), INDEX idx_parent(parent_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                return;
            }
        } catch (\Throwable $e) {}
        $cols = [
            'description' => 'ALTER TABLE categories ADD COLUMN description TEXT NULL',
            'image_url' => 'ALTER TABLE categories ADD COLUMN image_url VARCHAR(1024) NULL',
            'meta_title' => 'ALTER TABLE categories ADD COLUMN meta_title VARCHAR(200) NULL',
            'meta_description' => 'ALTER TABLE categories ADD COLUMN meta_description VARCHAR(500) NULL',
            'parent_id' => 'ALTER TABLE categories ADD COLUMN parent_id INT NULL',
            'sort_order' => 'ALTER TABLE categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0',
            'is_active' => 'ALTER TABLE categories ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
            'created_at' => 'ALTER TABLE categories ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP',
            'updated_at' => 'ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL',
        ];
        foreach ($cols as $name => $sql) {
            try { if (!Schema::hasColumn('categories', $name)) DB::statement($sql); } catch (\Throwable $e) {}
        }
    }

    private function slugify(string $text): string
    {
        $text = strtolower(trim($text));
        $text = preg_replace('/[^a-z0-9]+/i', '-', $text);
        $text = trim($text, '-');
        return $text ?: 'category';
    }

    public function test()
    {
        return response()->json(['success'=>true, 'message'=>'Categories API OK']);
    }

    public function init()
    {
        $this->ensureTable();
        try {
            // Seed a few default main categories if table is empty
            $cnt = (int)(DB::selectOne('SELECT COUNT(*) AS c FROM categories')->c ?? 0);
            if ($cnt === 0) {
                $defaults = [
                    ['name'=>'Elektronik','slug'=>'elektronik'],
                    ['name'=>'Fashion','slug'=>'fashion'],
                    ['name'=>'Kesehatan','slug'=>'kesehatan'],
                ];
                foreach ($defaults as $c) {
                    DB::table('categories')->insert([
                        'name'=>$c['name'],
                        'slug'=>$c['slug'],
                        'is_active'=>1,
                        'sort_order'=>0,
                        'created_at'=>now(),
                    ]);
                }
            }
            return response()->json(['success'=>true, 'message'=>'Categories table initialized']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false, 'message'=>'Failed to initialize categories'], 500);
        }
    }

    public function index(Request $req)
    {
        try {
            $this->ensureTable();
            $q = $req->query('q');
            $where = [];$params=[];
            if ($q) { $where[] = '(c.name LIKE ? OR c.slug LIKE ? OR c.description LIKE ?)'; array_push($params, "%$q%", "%$q%", "%$q%"); }
            $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';
            $rows = DB::select("SELECT c.*, p.name AS parent_name FROM categories c LEFT JOIN categories p ON p.id = c.parent_id $whereSql ORDER BY c.sort_order ASC, c.name ASC", $params);
            $data = array_map(function($r){
                return [
                    'id'=>$r->id,
                    'name'=>$r->name,
                    'slug'=>$r->slug,
                    'description'=>$r->description,
                    'image_url'=>$r->image_url,
                    'meta_title'=>$r->meta_title,
                    'meta_description'=>$r->meta_description,
                    'parent_id'=>$r->parent_id,
                    'parent_name'=>$r->parent_name,
                    'sort_order'=>(int)($r->sort_order ?? 0),
                    'is_active'=>(bool)($r->is_active ?? 1),
                    'products_count'=>0,
                    'created_at'=>$r->created_at,
                ];
            }, $rows);
            return response()->json(['success'=>true,'data'=>$data]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[], 'message'=>'table not found or empty']);
        }
    }

    public function show($id)
    {
        $this->ensureTable();
        $r = DB::selectOne('SELECT * FROM categories WHERE id = ? LIMIT 1', [(int)$id]);
        if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
        return response()->json(['success'=>true,'data'=>$r]);
    }

    public function store(Request $req)
    {
        try {
            $this->ensureTable();
            $name = trim((string)$req->input('name'));
            if ($name === '') return response()->json(['success'=>false,'message'=>'Name is required'], 400);
            $slug = $req->input('slug') ?: $this->slugify($name);
            // handle image upload if any
            $url = null;
            if ($req->hasFile('image') && $req->file('image')->isValid()) {
                $dest = public_path('uploads/categories');
                if (!is_dir($dest)) @mkdir($dest, 0775, true);
                $orig = $req->file('image')->getClientOriginalName();
                $safe = preg_replace('/[^A-Za-z0-9._-]+/','_', $orig);
                $fname = time().'_'.$safe;
                $req->file('image')->move($dest, $fname);
                $url = '/uploads/categories/'.$fname;
            }
            $id = DB::table('categories')->insertGetId([
                'name'=>$name,
                'slug'=>$slug,
                'description'=>$req->input('description'),
                'image_url'=>$url,
                'meta_title'=>$req->input('meta_title'),
                'meta_description'=>$req->input('meta_description'),
                'parent_id'=>$req->input('parent_id') !== null && $req->input('parent_id') !== '' ? (int)$req->input('parent_id') : null,
                'sort_order'=>(int)($req->input('sort_order') ?? 0),
                'is_active'=>(int)($req->input('is_active') ?? 1),
                'created_at'=>now(),
            ]);
            return response()->json(['success'=>true,'message'=>'Category created','id'=>$id]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to create category'], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            $this->ensureTable();
            $set = [];$vals=[];
            foreach (['name','slug','description','meta_title','meta_description'] as $f) {
                if ($req->has($f)) { $set[] = "$f = ?"; $vals[] = $req->input($f); }
            }
            if ($req->has('parent_id')) { $set[] = 'parent_id = ?'; $vals[] = ($req->input('parent_id') !== '' ? (int)$req->input('parent_id') : null); }
            if ($req->has('sort_order')) { $set[] = 'sort_order = ?'; $vals[] = (int)$req->input('sort_order'); }
            if ($req->has('is_active')) { $set[] = 'is_active = ?'; $vals[] = (int)$req->input('is_active'); }
            // handle image
            if ($req->hasFile('image') && $req->file('image')->isValid()) {
                $dest = public_path('uploads/categories');
                if (!is_dir($dest)) @mkdir($dest, 0775, true);
                $orig = $req->file('image')->getClientOriginalName();
                $safe = preg_replace('/[^A-Za-z0-9._-]+/','_', $orig);
                $fname = time().'_'.$safe;
                $req->file('image')->move($dest, $fname);
                $url = '/uploads/categories/'.$fname;
                $set[] = 'image_url = ?'; $vals[] = $url;
            }
            if (!$set) return response()->json(['success'=>true,'message'=>'Nothing to update']);
            $set[] = 'updated_at = CURRENT_TIMESTAMP';
            $vals[] = (int)$id;
            DB::update('UPDATE categories SET '.implode(', ',$set).' WHERE id = ?', $vals);
            return response()->json(['success'=>true,'message'=>'Category updated']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to update category'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $this->ensureTable();
            $n = DB::delete('DELETE FROM categories WHERE id = ?', [(int)$id]);
            if ($n === 0) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'message'=>'Category deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to delete category'], 500);
        }
    }
}
