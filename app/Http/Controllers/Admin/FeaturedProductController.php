<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class FeaturedProductController extends BaseController
{
    private function ensureTable(): void
    {
        try {
            DB::statement("CREATE TABLE IF NOT EXISTS featured_products (product_id INT NOT NULL UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        } catch (\Throwable $e) {}
    }

    public function index()
    {
        $this->ensureTable();
        try {
            $rows = DB::select("SELECT product_id FROM featured_products ORDER BY created_at DESC");
            $ids = array_map(fn($r) => (int)$r->product_id, $rows);
            return response()->json(['success' => true, 'data' => $ids]);
        } catch (\Throwable $e) {
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    public function store(Request $req)
    {
        $this->ensureTable();
        try {
            $pid = (int)($req->input('product_id'));
            if (!$pid) return response()->json(['success'=>false,'message'=>'product_id required'], 400);
            DB::statement("INSERT IGNORE INTO featured_products (product_id, created_at) VALUES (?, CURRENT_TIMESTAMP)", [$pid]);
            return response()->json(['success'=>true, 'message'=>'Added to featured']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false, 'message'=>'Failed to add featured'], 500);
        }
    }

    public function destroy($id)
    {
        $this->ensureTable();
        try {
            $pid = (int)$id;
            DB::statement("DELETE FROM featured_products WHERE product_id = ?", [$pid]);
            return response()->json(['success'=>true, 'message'=>'Removed from featured']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false, 'message'=>'Failed to remove featured'], 500);
        }
    }
}
