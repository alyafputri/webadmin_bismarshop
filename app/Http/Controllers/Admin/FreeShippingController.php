<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class FreeShippingController extends BaseController
{
    private function ensureTable(): void
    {
        try {
            DB::statement("CREATE TABLE IF NOT EXISTS free_shipping_promotions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT NULL,
                type ENUM('location','amount','category') NOT NULL,
                locations TEXT NULL,
                min_amount BIGINT NULL,
                max_discount BIGINT NULL,
                categories TEXT NULL,
                usage_limit INT NULL,
                usage_count INT NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                start_date DATETIME NOT NULL,
                end_date DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (\Throwable $e) {}
        // Add missing columns without IF NOT EXISTS for broader MySQL support
        $maybeAdd = [
            'max_discount' => "ALTER TABLE free_shipping_promotions ADD COLUMN max_discount BIGINT NULL",
            'usage_limit' => "ALTER TABLE free_shipping_promotions ADD COLUMN usage_limit INT NULL",
            'usage_count' => "ALTER TABLE free_shipping_promotions ADD COLUMN usage_count INT NOT NULL DEFAULT 0",
        ];
        foreach ($maybeAdd as $col => $sql) {
            try { if (!Schema::hasColumn('free_shipping_promotions', $col)) DB::statement($sql); } catch (\Throwable $e) {}
        }
    }

    private function mapRow(object $r): array
    {
        $conditions = [];
        $type = $r->type;
        if ($type === 'location') {
            $list = [];
            if (!empty($r->locations)) {
                $j = json_decode($r->locations, true);
                if (is_array($j)) $list = $j; else $list = array_values(array_filter(array_map('trim', explode(',', (string)$r->locations))));
            }
            $conditions = ['locations' => $list];
        } elseif ($type === 'amount') {
            $conditions = ['minAmount' => (float)($r->min_amount ?? 0)];
        } elseif ($type === 'category') {
            $cats = [];
            if (!empty($r->categories)) {
                $j = json_decode($r->categories, true);
                if (is_array($j)) $cats = $j; else $cats = array_values(array_filter(array_map('trim', explode(',', (string)$r->categories))));
            }
            $conditions = ['categories' => $cats];
        }
        // Flatten fields expected by frontend
        $coverage = 'All';
        if ($type === 'location') {
            $list = $conditions['locations'] ?? [];
            if (is_array($list) && count($list) > 0) { $coverage = implode(', ', $list); }
        }
        return [
            'id' => $r->id,
            'name' => $r->name,
            'description' => $r->description ?? '',
            'type' => $type,
            'conditions' => $conditions,
            'startDate' => $r->start_date,
            'endDate' => $r->end_date,
            'isActive' => (bool)$r->is_active,
            'minAmount' => (float)($r->min_amount ?? 0),
            'maxDiscount' => (float)($r->max_discount ?? 0),
            'coverageArea' => $coverage,
            'usageLimit' => isset($r->usage_limit) ? (int)$r->usage_limit : null,
            'usageCount' => isset($r->usage_count) ? (int)$r->usage_count : 0,
        ];
    }

    public function index()
    {
        try {
            $this->ensureTable();
            $rows = DB::select("SELECT * FROM free_shipping_promotions ORDER BY id DESC");
            return response()->json(['success'=>true,'data'=>array_map(fn($r)=>$this->mapRow($r), $rows)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function show($id)
    {
        $this->ensureTable();
        $r = DB::selectOne("SELECT * FROM free_shipping_promotions WHERE id = ? LIMIT 1", [(int)$id]);
        if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
        return response()->json(['success'=>true,'data'=>$this->mapRow($r)]);
    }

    public function store(Request $req)
    {
        $this->ensureTable();
        try {
            $type = (string)$req->input('type');
            $name = (string)$req->input('name');
            $desc = $req->input('description');
            // Dates normalization
            $startIn = $req->input('startDate');
            $endIn = $req->input('endDate');
            try { $start = $startIn ? Carbon::parse($startIn)->format('Y-m-d H:i:s') : Carbon::now()->format('Y-m-d H:i:s'); } catch (\Throwable $e) { $start = Carbon::now()->format('Y-m-d H:i:s'); }
            try { $end = $endIn ? Carbon::parse($endIn)->format('Y-m-d H:i:s') : null; } catch (\Throwable $e) { $end = null; }
            $isActive = $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : 1;
            $locations = null; $minAmount = null; $categories = null; $maxDiscount = null; $usageLimit = null;
            // coverageArea compatibility
            $coverage = $req->input('coverageArea');
            if ($type === 'location') {
                if (is_array($coverage)) { $locations = json_encode(array_values(array_map('strval', $coverage))); }
                elseif (is_string($coverage) && $coverage !== '') { $locations = json_encode([$coverage]); }
                else {
                    $loc = $req->input('locations');
                    if (is_array($loc)) $locations = json_encode(array_values(array_map('strval', $loc)));
                    elseif (is_string($loc)) $locations = $loc;
                }
            } else {
                $minAmount = (int)($req->input('minAmount') ?? 0);
            }
            $maxDiscount = $req->input('maxDiscount') !== null ? (int)$req->input('maxDiscount') : null;
            $usageLimit = $req->input('usageLimit') !== null ? (int)$req->input('usageLimit') : null;

            $id = DB::table('free_shipping_promotions')->insertGetId([
                'name'=>$name,
                'description'=>$desc,
                'type'=>$type,
                'locations'=>$locations,
                'min_amount'=>$minAmount,
                'max_discount'=>$maxDiscount,
                'categories'=>$categories,
                'usage_limit'=>$usageLimit,
                'usage_count'=>0,
                'start_date'=>$start,
                'end_date'=>$end,
                'is_active'=>$isActive,
            ]);
            $r = DB::selectOne("SELECT * FROM free_shipping_promotions WHERE id = ? LIMIT 1", [$id]);
            return response()->json(['success'=>true,'message'=>'Created','data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to create free shipping','error'=>$e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        $this->ensureTable();
        try {
            $type = $req->input('type');
            $locations = null; $minAmount = null; $categories = null; $maxDiscount = null; $usageLimit = null; $usageCount = null;
            // coverageArea compatibility
            $coverage = $req->input('coverageArea');
            if ($type === 'location') {
                if (is_array($coverage)) { $locations = json_encode(array_values(array_map('strval', $coverage))); }
                elseif (is_string($coverage) && $coverage !== '') { $locations = json_encode([$coverage]); }
                else {
                    $loc = $req->input('locations');
                    if (is_array($loc)) $locations = json_encode(array_values(array_map('strval', $loc)));
                    elseif (is_string($loc)) $locations = $loc;
                }
            } elseif ($type === 'amount') {
                $minAmount = $req->input('minAmount') !== null ? (int)$req->input('minAmount') : null;
            } elseif ($type === 'category') {
                $cat = $req->input('categories');
                if (is_array($cat)) $categories = json_encode(array_values(array_map('strval', $cat)));
                else if (is_string($cat)) $categories = $cat;
            }
            $maxDiscount = $req->input('maxDiscount') !== null ? (int)$req->input('maxDiscount') : null;
            $usageLimit = $req->input('usageLimit') !== null ? (int)$req->input('usageLimit') : null;
            $usageCount = $req->input('usageCount') !== null ? (int)$req->input('usageCount') : null;
            // Dates normalization
            $startIn = $req->input('startDate');
            $endIn = $req->input('endDate');
            $start = null; $end = null;
            try { if ($startIn !== null) $start = Carbon::parse($startIn)->format('Y-m-d H:i:s'); } catch (\Throwable $e) {}
            try { if ($endIn !== null) $end = Carbon::parse($endIn)->format('Y-m-d H:i:s'); } catch (\Throwable $e) {}

            DB::update(
                "UPDATE free_shipping_promotions SET
                    name = COALESCE(?, name),
                    description = COALESCE(?, description),
                    type = COALESCE(?, type),
                    locations = COALESCE(?, locations),
                    min_amount = COALESCE(?, min_amount),
                    max_discount = COALESCE(?, max_discount),
                    categories = COALESCE(?, categories),
                    usage_limit = COALESCE(?, usage_limit),
                    usage_count = COALESCE(?, usage_count),
                    start_date = COALESCE(?, start_date),
                    end_date = COALESCE(?, end_date),
                    is_active = COALESCE(?, is_active)
                 WHERE id = ?",
                [
                    $req->input('name'),
                    $req->input('description'),
                    $type,
                    $locations,
                    $minAmount,
                    $maxDiscount,
                    $categories,
                    $usageLimit,
                    $usageCount,
                    $start,
                    $end,
                    $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : null,
                    (int)$id,
                ]
            );
            $r = DB::selectOne("SELECT * FROM free_shipping_promotions WHERE id = ? LIMIT 1", [(int)$id]);
            if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'message'=>'Updated','data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to update free shipping','error'=>$e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $this->ensureTable();
        try {
            $n = DB::delete('DELETE FROM free_shipping_promotions WHERE id = ?', [(int)$id]);
            if ($n === 0) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'message'=>'Deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to delete free shipping'], 500);
        }
    }
}
