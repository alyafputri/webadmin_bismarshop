<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class ProductDiscountController extends BaseController
{
    private function ensureTable(): void
    {
        try {
            DB::statement("CREATE TABLE IF NOT EXISTS product_discounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                discount_type ENUM('percentage','fixed_amount') NOT NULL,
                discount_value INT NOT NULL DEFAULT 0,
                start_date DATETIME NOT NULL,
                end_date DATETIME NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                reason TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (\Throwable $e) {}
    }

    private function mapRow(object $r): array
    {
        return [
            'id' => $r->id,
            'productId' => $r->product_id,
            'productName' => $r->product_name,
            'discountType' => $r->discount_type,
            'discountValue' => (int)($r->discount_value ?? 0),
            'startDate' => $r->start_date,
            'endDate' => $r->end_date,
            'isActive' => (bool)$r->is_active,
            'reason' => $r->reason,
        ];
    }

    public function index()
    {
        try {
            $this->ensureTable();
            $rows = DB::select("SELECT d.id, d.product_id, p.name AS product_name, d.discount_type, d.discount_value, d.start_date, d.end_date, d.is_active, d.reason FROM product_discounts d LEFT JOIN products p ON p.id = d.product_id ORDER BY d.id DESC");
            return response()->json(['success'=>true,'data'=>array_map(fn($r)=>$this->mapRow($r), $rows)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function show($id)
    {
        $this->ensureTable();
        $r = DB::selectOne("SELECT d.id, d.product_id, p.name AS product_name, d.discount_type, d.discount_value, d.start_date, d.end_date, d.is_active, d.reason FROM product_discounts d LEFT JOIN products p ON p.id = d.product_id WHERE d.id = ? LIMIT 1", [(int)$id]);
        if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
        return response()->json(['success'=>true,'data'=>$this->mapRow($r)]);
    }

    public function store(Request $req)
    {
        try {
            $this->ensureTable();
            $id = DB::table('product_discounts')->insertGetId([
                'product_id' => (int)$req->input('productId'),
                'discount_type' => (string)$req->input('discountType'),
                'discount_value' => (int)($req->input('discountValue') ?? 0),
                'start_date' => $req->input('startDate') ?: now(),
                'end_date' => $req->input('endDate') ?: null,
                'is_active' => $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : 1,
                'reason' => $req->input('reason'),
            ]);
            $r = DB::selectOne("SELECT d.id, d.product_id, p.name AS product_name, d.discount_type, d.discount_value, d.start_date, d.end_date, d.is_active, d.reason FROM product_discounts d LEFT JOIN products p ON p.id = d.product_id WHERE d.id = ? LIMIT 1", [$id]);
            return response()->json(['success'=>true,'message'=>'Created','data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to create','error'=>$e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            $this->ensureTable();
            DB::update(
                "UPDATE product_discounts SET
                    product_id = COALESCE(?, product_id),
                    discount_type = COALESCE(?, discount_type),
                    discount_value = COALESCE(?, discount_value),
                    start_date = COALESCE(?, start_date),
                    end_date = COALESCE(?, end_date),
                    is_active = COALESCE(?, is_active),
                    reason = COALESCE(?, reason)
                 WHERE id = ?",
                [
                    $req->input('productId') !== null ? (int)$req->input('productId') : null,
                    $req->input('discountType'),
                    $req->input('discountValue') !== null ? (int)$req->input('discountValue') : null,
                    $req->input('startDate') ?: null,
                    $req->input('endDate') ?: null,
                    $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : null,
                    $req->input('reason'),
                    (int)$id,
                ]
            );
            $r = DB::selectOne("SELECT d.id, d.product_id, p.name AS product_name, d.discount_type, d.discount_value, d.start_date, d.end_date, d.is_active, d.reason FROM product_discounts d LEFT JOIN products p ON p.id = d.product_id WHERE d.id = ? LIMIT 1", [(int)$id]);
            if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'message'=>'Updated','data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to update','error'=>$e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $this->ensureTable();
            $n = DB::delete('DELETE FROM product_discounts WHERE id = ?', [(int)$id]);
            if ($n === 0) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'message'=>'Deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to delete'], 500);
        }
    }
}
