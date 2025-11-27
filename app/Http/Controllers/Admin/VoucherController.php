<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class VoucherController extends BaseController
{
    private function ensureTable(): void
    {
        try {
            if (!Schema::hasTable('vouchers')) {
                DB::statement("CREATE TABLE vouchers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    code VARCHAR(100) NOT NULL UNIQUE,
                    name VARCHAR(150) NOT NULL,
                    description TEXT NULL,
                    type ENUM('percentage','fixed_amount') NOT NULL,
                    value INT NOT NULL DEFAULT 0,
                    min_purchase INT NOT NULL DEFAULT 0,
                    max_discount INT NULL,
                    usage_limit INT NULL,
                    used_count INT NOT NULL DEFAULT 0,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME NULL,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NULL DEFAULT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                return;
            }
        } catch (\Throwable $e) {}
        // Add missing columns defensively (no IF NOT EXISTS)
        $cols = [
            // Ensure essential columns exist for legacy schemas
            'code' => "ALTER TABLE vouchers ADD COLUMN code VARCHAR(100) NULL",
            'name' => "ALTER TABLE vouchers ADD COLUMN name VARCHAR(150) NULL",
            // Use VARCHAR for fallback 'type' to avoid enum mismatch across environments
            'type' => "ALTER TABLE vouchers ADD COLUMN type VARCHAR(50) NULL",
            'value' => "ALTER TABLE vouchers ADD COLUMN value INT NULL",
            'description' => 'ALTER TABLE vouchers ADD COLUMN description TEXT NULL',
            'min_purchase' => 'ALTER TABLE vouchers ADD COLUMN min_purchase INT NOT NULL DEFAULT 0',
            'max_discount' => 'ALTER TABLE vouchers ADD COLUMN max_discount INT NULL',
            'usage_limit' => 'ALTER TABLE vouchers ADD COLUMN usage_limit INT NULL',
            'used_count' => 'ALTER TABLE vouchers ADD COLUMN used_count INT NOT NULL DEFAULT 0',
            'start_date' => 'ALTER TABLE vouchers ADD COLUMN start_date DATETIME NULL',
            'end_date' => 'ALTER TABLE vouchers ADD COLUMN end_date DATETIME NULL',
            'is_active' => 'ALTER TABLE vouchers ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
            'updated_at' => 'ALTER TABLE vouchers ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL',
        ];
        foreach ($cols as $name => $alterSql) {
            try { if (!Schema::hasColumn('vouchers', $name)) DB::statement($alterSql); } catch (\Throwable $e) {}
        }
        // Try add legacy alternative columns when none of type/value exist
        try {
            if (!Schema::hasColumn('vouchers','type') && !Schema::hasColumn('vouchers','voucher_type')) {
                DB::statement("ALTER TABLE vouchers ADD COLUMN voucher_type VARCHAR(50) NULL");
            }
        } catch (\Throwable $e) {}
        try {
            if (!Schema::hasColumn('vouchers','value') && !Schema::hasColumn('vouchers','voucher_value')) {
                DB::statement("ALTER TABLE vouchers ADD COLUMN voucher_value INT NULL");
            }
        } catch (\Throwable $e) {}
        // Best-effort: ensure an auto-increment id exists for compatibility
        try {
            if (!Schema::hasColumn('vouchers','id')) {
                DB::statement("ALTER TABLE vouchers ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST");
            }
        } catch (\Throwable $e) {}
    }

    private function getVoucherTypeEnum(): array
    {
        try {
            $col = DB::selectOne("SHOW COLUMNS FROM vouchers LIKE 'type'");
            if (!$col || !isset($col->Type)) return [];
            $t = strtolower((string)$col->Type);
            if (str_starts_with($t, 'enum(')) {
                $inside = substr($t, 5, -1);
                $vals = array_map(fn($s)=>trim($s, " '\""), explode(',', $inside));
                return array_values(array_filter($vals, fn($v)=>$v!==''));
            }
        } catch (\Throwable $e) {}
        return [];
    }

    private function resolveVoucherType(?string $input): ?string
    {
        if ($input === null || $input === '') return null;
        $in = strtolower($input);
        $allowed = $this->getVoucherTypeEnum();
        if (!$allowed) {
            // Default convention when unknown
            if ($in === 'fixed' || $in === 'fixed_amount') return $in;
            return 'percentage';
        }
        if (in_array($in, $allowed, true)) return $in;
        if ($in === 'fixed_amount' && in_array('fixed', $allowed, true)) return 'fixed';
        if ($in === 'fixed' && in_array('fixed_amount', $allowed, true)) return 'fixed_amount';
        if (in_array('percentage', $allowed, true)) return 'percentage';
        return $allowed[0] ?? 'percentage';
    }

    private function mapVoucherRow(object $r): array
    {
        $type = $r->type ?? ($r->voucher_type ?? null);
        $value = $r->value ?? ($r->voucher_value ?? null);
        return [
            'id' => $r->id,
            'code' => $r->code,
            'name' => $r->name,
            'description' => $r->description ?? null,
            'type' => $type,
            'voucher_type' => $type,
            'value' => $value,
            'voucher_value' => $value,
            'minPurchase' => $r->min_purchase ?? null,
            'maxDiscount' => $r->max_discount ?? null,
            'usageLimit' => $r->usage_limit ?? null,
            'usedCount' => $r->used_count ?? 0,
            'startDate' => $r->start_date ?? null,
            'endDate' => $r->end_date ?? null,
            'isActive' => isset($r->is_active) ? (bool)$r->is_active : true,
            'createdAt' => $r->created_at ?? null,
        ];
    }

    public function index(Request $req)
    {
        try {
            $this->ensureTable();
            $q = $req->query('q');
            $type = $req->query('type');
            $active = $req->query('active'); // '1'|'0'|'true'|'false'
            $startDate = $req->query('startDate');
            $endDate = $req->query('endDate');
            $sortBy = $req->query('sortBy', 'id');
            $sortDir = strtolower((string)$req->query('sortDir', 'desc')) === 'asc' ? 'ASC' : 'DESC';
            $page = $req->query('page');
            $pageSize = $req->query('pageSize');

            $where = [];$params = [];
            if ($q) { $where[] = '(code LIKE ? OR name LIKE ? OR description LIKE ?)'; array_push($params, "%$q%", "%$q%", "%$q%"); }
            if ($type && Schema::hasColumn('vouchers','type')) { $where[] = 'type = ?'; $params[] = (string)$type; }
            if ($active !== null && Schema::hasColumn('vouchers','is_active')) { $where[] = 'is_active = ?'; $params[] = (in_array($active, ['1','true'], true) ? 1 : 0); }
            if ($startDate && Schema::hasColumn('vouchers','start_date')) { $where[] = 'start_date >= ?'; $params[] = $startDate; }
            if ($endDate && Schema::hasColumn('vouchers','end_date')) { $where[] = 'end_date <= ?'; $params[] = $endDate; }
            $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

            $allowed = array_values(array_filter([
                'id', 'code', 'name',
                Schema::hasColumn('vouchers','value') ? 'value' : (Schema::hasColumn('vouchers','voucher_value') ? 'voucher_value' : null),
                Schema::hasColumn('vouchers','used_count') ? 'used_count' : null,
                Schema::hasColumn('vouchers','start_date') ? 'start_date' : null,
                Schema::hasColumn('vouchers','end_date') ? 'end_date' : null,
                Schema::hasColumn('vouchers','is_active') ? 'is_active' : null,
            ]));
            $sortCol = in_array($req->query('sortBy', ''), $allowed, true) ? $req->query('sortBy') : 'id';

            $limitSql = '';
            $meta = [];
            if ($page && $pageSize) {
                $p = max((int)$page, 1); $ps = min(max((int)$pageSize, 1), 100);
                $offset = ($p - 1) * $ps;
                $limitSql = "LIMIT $ps OFFSET $offset";
                $row = DB::selectOne("SELECT COUNT(*) AS total FROM vouchers $whereSql", $params);
                $total = (int)($row->total ?? 0);
                $meta = ['page'=>$p,'pageSize'=>$ps,'total'=>$total,'totalPages'=> max((int)ceil($total/$ps),1)];
            }

            $rows = DB::select("SELECT * FROM vouchers $whereSql ORDER BY $sortCol $sortDir $limitSql", $params);
            $data = array_map(fn($r)=>$this->mapVoucherRow($r), $rows);
            $resp = ['success'=>true,'data'=>$data];
            if ($meta) $resp['meta'] = $meta;
            return response()->json($resp);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function show($id)
    {
        $this->ensureTable();
        $row = DB::selectOne('SELECT * FROM vouchers WHERE id = ? LIMIT 1', [(int)$id]);
        if (!$row) return response()->json(['success'=>false,'message'=>'Voucher not found'], 404);
        return response()->json(['success'=>true,'data'=>$this->mapVoucherRow($row)]);
    }

    public function store(Request $req)
    {
        try {
            $this->ensureTable();
            $code = $req->input('code');
            if ($code) {
                $dup = DB::selectOne('SELECT id FROM vouchers WHERE code = ? LIMIT 1', [$code]);
                if ($dup) return response()->json(['success'=>false,'message'=>'Voucher code already exists'], 400);
            }
            // Normalize type and dates
            $type = $this->resolveVoucherType($req->input('type') ?: $req->input('voucher_type'));
            $startIn = $req->input('startDate') ?: $req->input('start_date') ?: null;
            $endIn = $req->input('endDate') ?: $req->input('end_date') ?: null;
            $startNorm = null; $endNorm = null;
            try { $startNorm = $startIn ? Carbon::parse($startIn)->format('Y-m-d H:i:s') : Carbon::now()->format('Y-m-d H:i:s'); } catch (\Throwable $e) { $startNorm = Carbon::now()->format('Y-m-d H:i:s'); }
            try { $endNorm = $endIn ? Carbon::parse($endIn)->format('Y-m-d H:i:s') : null; } catch (\Throwable $e) { $endNorm = null; }

            // Pick column names for type/value depending on existing schema
            $colType = Schema::hasColumn('vouchers','type') ? 'type' : (Schema::hasColumn('vouchers','voucher_type') ? 'voucher_type' : null);
            $colValue = Schema::hasColumn('vouchers','value') ? 'value' : (Schema::hasColumn('vouchers','voucher_value') ? 'voucher_value' : null);

            $name = (string)($req->input('name') ?? '');
            if ($name === '' && $code) { $name = $code; }
            $payload = [
                'code' => $code,
                'name' => $name,
            ];
            if ($colType) $payload[$colType] = $type;
            if ($colValue) $payload[$colValue] = (int)($req->input('value') ?? $req->input('voucher_value') ?? 0);
            // Ensure required columns exist to avoid SQL errors on NOT NULL
            if (!Schema::hasColumn('vouchers','type') && !Schema::hasColumn('vouchers','voucher_type')) {
                // last resort create a 'type' column
                try { DB::statement("ALTER TABLE vouchers ADD COLUMN type VARCHAR(50) NULL"); } catch (\Throwable $e) {}
                $payload['type'] = $type;
            }
            if (!Schema::hasColumn('vouchers','value') && !Schema::hasColumn('vouchers','voucher_value')) {
                try { DB::statement("ALTER TABLE vouchers ADD COLUMN value INT NULL"); } catch (\Throwable $e) {}
                $payload['value'] = (int)($req->input('value') ?? $req->input('voucher_value') ?? 0);
            }
            if (Schema::hasColumn('vouchers','description')) $payload['description'] = $req->input('description');
            if (Schema::hasColumn('vouchers','min_purchase')) $payload['min_purchase'] = (int)($req->input('minPurchase') ?? $req->input('min_purchase') ?? 0);
            if (Schema::hasColumn('vouchers','max_discount')) $payload['max_discount'] = $req->input('maxDiscount') !== null ? (int)$req->input('maxDiscount') : ($req->input('max_discount') !== null ? (int)$req->input('max_discount') : null);
            if (Schema::hasColumn('vouchers','usage_limit')) $payload['usage_limit'] = $req->input('usageLimit') !== null ? (int)$req->input('usageLimit') : ($req->input('usage_limit') !== null ? (int)$req->input('usage_limit') : null);
            if (Schema::hasColumn('vouchers','used_count')) $payload['used_count'] = 0;
            if (Schema::hasColumn('vouchers','start_date')) $payload['start_date'] = $startNorm;
            if (Schema::hasColumn('vouchers','end_date')) $payload['end_date'] = $endNorm;
            if (Schema::hasColumn('vouchers','is_active')) $payload['is_active'] = $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : ($req->input('is_active') !== null ? ((int)$req->input('is_active') ? 1 : 0) : 1);
            if (Schema::hasColumn('vouchers','created_at')) $payload['created_at'] = now();
            // Assign explicit id if table has an id column (safe even for AUTO_INCREMENT as long as unique)
            if (Schema::hasColumn('vouchers','id')) {
                try {
                    $rowMax = DB::selectOne('SELECT MAX(id) AS m FROM vouchers');
                    $nextId = (int)($rowMax->m ?? 0) + 1;
                    if ($nextId > 0) { $payload['id'] = $nextId; }
                } catch (\Throwable $e) {}
            }
            // Insert without assuming auto-increment primary key exists
            DB::table('vouchers')->insert($payload);
            // Refetch by unique code; fallbacks try by latest created/updated
            $row = null;
            try { $row = DB::selectOne('SELECT * FROM vouchers WHERE code = ? LIMIT 1', [$code]); } catch (\Throwable $e) {}
            if (!$row) {
                try { $row = DB::selectOne('SELECT * FROM vouchers ORDER BY created_at DESC LIMIT 1'); } catch (\Throwable $e) {}
            }
            if (!$row) {
                try { $row = DB::selectOne('SELECT * FROM vouchers ORDER BY id DESC LIMIT 1'); } catch (\Throwable $e) {}
            }
            if ($row) {
                return response()->json(['success'=>true,'message'=>'Voucher created successfully','data'=>$this->mapVoucherRow($row)]);
            }
            return response()->json(['success'=>true,'message'=>'Voucher created successfully','data'=>null]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Error creating voucher','error'=>$e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            $this->ensureTable();
            if ($req->input('code')) {
                $exists = DB::selectOne('SELECT id FROM vouchers WHERE code = ? AND id <> ? LIMIT 1', [$req->input('code'), (int)$id]);
                if ($exists) return response()->json(['success'=>false,'message'=>'Voucher code already exists'], 400);
            }
            // Normalize inputs
            $type = $this->resolveVoucherType($req->input('type') ?: $req->input('voucher_type'));
            $startIn = $req->input('startDate') ?: $req->input('start_date');
            $endIn = $req->input('endDate') ?: $req->input('end_date');
            $startNorm = null; $endNorm = null;
            try { if ($startIn !== null) $startNorm = Carbon::parse($startIn)->format('Y-m-d H:i:s'); } catch (\Throwable $e) {}
            try { if ($endIn !== null) $endNorm = Carbon::parse($endIn)->format('Y-m-d H:i:s'); } catch (\Throwable $e) {}

            // Build dynamic update only for existing columns
            $set = [];$vals=[];
            $colType = Schema::hasColumn('vouchers','type') ? 'type' : (Schema::hasColumn('vouchers','voucher_type') ? 'voucher_type' : null);
            $colValue = Schema::hasColumn('vouchers','value') ? 'value' : (Schema::hasColumn('vouchers','voucher_value') ? 'voucher_value' : null);
            $map = [
                'code' => $req->input('code'),
                'name' => $req->input('name'),
                'description' => $req->input('description'),
                ($colType ?: 'type') => $type,
                ($colValue ?: 'value') => $req->input('value') !== null ? (int)$req->input('value') : ($req->input('voucher_value') !== null ? (int)$req->input('voucher_value') : null),
                'min_purchase' => $req->input('minPurchase') !== null ? (int)$req->input('minPurchase') : ($req->input('min_purchase') !== null ? (int)$req->input('min_purchase') : null),
                'max_discount' => $req->input('maxDiscount') !== null ? (int)$req->input('maxDiscount') : ($req->input('max_discount') !== null ? (int)$req->input('max_discount') : null),
                'usage_limit' => $req->input('usageLimit') !== null ? (int)$req->input('usageLimit') : ($req->input('usage_limit') !== null ? (int)$req->input('usage_limit') : null),
                'used_count' => $req->input('usedCount') !== null ? (int)$req->input('usedCount') : null,
                'start_date' => $startNorm,
                'end_date' => $endNorm,
                'is_active' => $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : ($req->input('is_active') !== null ? ((int)$req->input('is_active') ? 1 : 0) : null),
            ];
            foreach ($map as $col=>$val) {
                if ($val !== null && Schema::hasColumn('vouchers',$col)) { $set[] = "$col = ?"; $vals[] = $val; }
            }
            if ($set) {
                $vals[] = (int)$id;
                DB::update('UPDATE vouchers SET '.implode(', ',$set).' WHERE id = ?', $vals);
            }
            $row = DB::selectOne('SELECT * FROM vouchers WHERE id = ? LIMIT 1', [(int)$id]);
            if (!$row) return response()->json(['success'=>false,'message'=>'Voucher not found'], 404);
            return response()->json(['success'=>true,'message'=>'Voucher updated successfully','data'=>$this->mapVoucherRow($row)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Error updating voucher','error'=>$e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $this->ensureTable();
            $affected = DB::delete('DELETE FROM vouchers WHERE id = ?', [(int)$id]);
            if ($affected === 0) return response()->json(['success'=>false,'message'=>'Voucher not found'], 404);
            return response()->json(['success'=>true,'message'=>'Voucher deleted']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to delete voucher'], 500);
        }
    }
}
