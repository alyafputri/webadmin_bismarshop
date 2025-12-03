<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class ProductVoucherController extends BaseController
{
    private function mapRow(object $r): array
    {
        return [
            'id' => (int)$r->id,
            'code' => $r->code,
            'name' => $r->name,
            'description' => $r->description,
            'type' => $r->type === 'fixed' ? 'fixed_amount' : $r->type,
            'value' => isset($r->value) ? (float)$r->value : null,
            'maxDiscount' => isset($r->max_discount) ? (float)$r->max_discount : null,
            'targetType' => $r->target_type,
            'targetId' => isset($r->target_id) ? (int)$r->target_id : null,
            'targetName' => $r->target_name ?? null,
            'minPurchase' => isset($r->min_purchase) ? (float)$r->min_purchase : 0,
            'usageLimit' => isset($r->usage_limit) ? (int)$r->usage_limit : null,
            'usageCount' => isset($r->usage_count) ? (int)$r->usage_count : 0,
            'userLimit' => isset($r->user_limit) ? (int)$r->user_limit : null,
            'startDate' => $r->start_date,
            'endDate' => $r->end_date,
            'isActive' => (bool)$r->is_active,
            'createdAt' => $r->created_at ?? null,
            'updatedAt' => $r->updated_at ?? null,
        ];
    }

    public function index()
    {
        try {
            $rows = DB::select('SELECT pv.* FROM product_vouchers pv ORDER BY pv.created_at DESC');
            return response()->json([
                'success' => true,
                'data' => array_map(fn($r) => $this->mapRow($r), $rows),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => true, 'data' => []]);
        }
    }

    public function show($id)
    {
        $row = DB::selectOne('SELECT pv.* FROM product_vouchers pv WHERE pv.id = ? LIMIT 1', [(int)$id]);
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $this->mapRow($row)]);
    }

    public function store(Request $req)
    {
        try {
            $type = $req->input('type') ?? 'percentage';
            if ($type === 'fixed_amount') {
                $type = 'fixed';
            }

            DB::table('product_vouchers')->insert([
                'code' => strtoupper((string)$req->input('code', '')),
                'name' => (string)$req->input('name', ''),
                'description' => $req->input('description'),
                'type' => $type,
                'value' => (int)($req->input('value') ?? 0),
                'max_discount' => $req->input('maxDiscount') !== null ? (int)$req->input('maxDiscount') : null,
                'target_type' => (string)$req->input('targetType', 'all'),
                'target_id' => $req->input('targetId') !== null ? (int)$req->input('targetId') : null,
                'min_purchase' => (int)($req->input('minPurchase') ?? 0),
                'usage_limit' => $req->input('usageLimit') !== null ? (int)$req->input('usageLimit') : null,
                'user_limit' => $req->input('userLimit') !== null ? (int)$req->input('userLimit') : 1,
                'start_date' => $req->input('startDate') ?: now(),
                'end_date' => $req->input('endDate') ?: null,
                'is_active' => $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : 1,
            ]);

            $row = DB::selectOne('SELECT pv.* FROM product_vouchers pv ORDER BY pv.id DESC LIMIT 1');
            return response()->json(['success' => true, 'message' => 'Created', 'data' => $this->mapRow($row)]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Failed to create', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            $fields = [];
            $values = [];

            $map = [
                'code' => 'code',
                'name' => 'name',
                'description' => 'description',
                'type' => 'type',
                'value' => 'value',
                'maxDiscount' => 'max_discount',
                'targetType' => 'target_type',
                'targetId' => 'target_id',
                'minPurchase' => 'min_purchase',
                'usageLimit' => 'usage_limit',
                'userLimit' => 'user_limit',
                'startDate' => 'start_date',
                'endDate' => 'end_date',
                'isActive' => 'is_active',
            ];

            foreach ($map as $inputKey => $col) {
                if ($req->has($inputKey)) {
                    $val = $req->input($inputKey);
                    if ($inputKey === 'type' && $val === 'fixed_amount') {
                        $val = 'fixed';
                    }
                    if ($inputKey === 'isActive') {
                        $val = (int)$val ? 1 : 0;
                    }
                    $fields[] = "$col = ?";
                    $values[] = $val;
                }
            }

            if ($fields) {
                $values[] = (int)$id;
                DB::update(
                    'UPDATE product_vouchers SET ' . implode(', ', $fields) . ' WHERE id = ?',
                    $values
                );
            }

            $row = DB::selectOne('SELECT pv.* FROM product_vouchers pv WHERE pv.id = ? LIMIT 1', [(int)$id]);
            if (!$row) {
                return response()->json(['success' => false, 'message' => 'Not found'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Updated', 'data' => $this->mapRow($row)]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Failed to update', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $n = DB::delete('DELETE FROM product_vouchers WHERE id = ?', [(int)$id]);
            if ($n === 0) {
                return response()->json(['success' => false, 'message' => 'Not found'], 404);
            }
            return response()->json(['success' => true, 'message' => 'Deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete', 'error' => $e->getMessage()], 500);
        }
    }
}
