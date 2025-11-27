<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FlashSaleController extends BaseController
{
    private function mapRow(object $r): array
    {
        return [    
            'id' => $r->id,
            'name' => $r->name,
            'description' => $r->description ?? '',
            'discountPercentage' => (float)($r->discount_percentage ?? 0),
            'startDate' => $r->start_date,
            'endDate' => $r->end_date,
            'isActive' => (bool)$r->is_active,
            'products' => [],
        ];
    }

    private function ensureTable(): void
    {
        try {
            DB::statement("CREATE TABLE IF NOT EXISTS flash_sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT NULL,
                discount_percentage INT NOT NULL,
                start_date DATETIME NOT NULL,
                end_date DATETIME NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (\Throwable $e) {}
    }

    public function index()
    {
        try {
            $this->ensureTable();
            $rows = DB::select("SELECT * FROM flash_sales ORDER BY id DESC");
            return response()->json(array_map(fn($r)=>$this->mapRow($r), $rows));
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function show($id)
    {
        try {
            $this->ensureTable();
            $r = DB::selectOne("SELECT * FROM flash_sales WHERE id = ? LIMIT 1", [(int)$id]);
            if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Not found'], 404);
        }
    }

    public function store(Request $req)
    {
        $this->ensureTable();
        try {
            $name = (string)$req->input('name');
            $desc = $req->input('description');
            $percent = (int)($req->input('discountPercentage') ?? $req->input('discount_percentage') ?? 0);
            $isActive = $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : 1;
            // Normalize dates and optional times
            $startIn = $req->input('startDate');
            $endIn = $req->input('endDate');
            $startTime = $req->input('startTime');
            $endTime = $req->input('endTime');
            try {
                $start = $startIn ? Carbon::parse($startIn) : Carbon::now();
            } catch (\Throwable $e) { $start = Carbon::now(); }
            if (is_string($startTime) && $startTime !== '') {
                try { $start = Carbon::parse(($startIn ?: Carbon::now()->toDateString()).' '.$startTime); } catch (\Throwable $e) {}
            }
            $startStr = $start->format('Y-m-d H:i:s');
            $endStr = null;
            if ($endIn) {
                try { $end = Carbon::parse($endIn); } catch (\Throwable $e) { $end = null; }
                if ($end) {
                    if (is_string($endTime) && $endTime !== '') {
                        try { $end = Carbon::parse(($endIn ?: $end->toDateString()).' '.$endTime); } catch (\Throwable $e) {}
                    }
                    $endStr = $end->format('Y-m-d H:i:s');
                }
            }

            $id = DB::table('flash_sales')->insertGetId([
                'name' => $name,
                'description' => $desc,
                'discount_percentage' => $percent,
                'start_date' => $startStr,
                'end_date' => $endStr,
                'is_active' => $isActive,
            ]);
            $r = DB::selectOne("SELECT id, name, description, discount_percentage, start_date, end_date, is_active FROM flash_sales WHERE id = ? LIMIT 1", [$id]);
            return response()->json(['success'=>true,'message'=>'Created','data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to create flash sale','error'=>$e->getMessage()], 500);
        }
    }

    public function update(Request $req, $id)
    {
        $this->ensureTable();
        try {
            // Normalize date/time inputs if provided
            $startIn = $req->input('startDate');
            $endIn = $req->input('endDate');
            $startTime = $req->input('startTime');
            $endTime = $req->input('endTime');
            $startStr = null; $endStr = null;
            if ($startIn !== null) {
                try { $s = Carbon::parse($startIn); } catch (\Throwable $e) { $s = null; }
                if ($s) {
                    if (is_string($startTime) && $startTime !== '') {
                        try { $s = Carbon::parse(($startIn ?: $s->toDateString()).' '.$startTime); } catch (\Throwable $e) {}
                    }
                    $startStr = $s->format('Y-m-d H:i:s');
                }
            }
            if ($endIn !== null) {
                try { $e = Carbon::parse($endIn); } catch (\Throwable $ex) { $e = null; }
                if ($e) {
                    if (is_string($endTime) && $endTime !== '') {
                        try { $e = Carbon::parse(($endIn ?: $e->toDateString()).' '.$endTime); } catch (\Throwable $ex) {}
                    }
                    $endStr = $e->format('Y-m-d H:i:s');
                }
            }

            DB::update(
                "UPDATE flash_sales SET
                    name = COALESCE(?, name),
                    description = COALESCE(?, description),
                    discount_percentage = COALESCE(?, discount_percentage),
                    start_date = COALESCE(?, start_date),
                    end_date = COALESCE(?, end_date),
                    is_active = COALESCE(?, is_active)
                 WHERE id = ?",
                [
                    $req->input('name'),
                    $req->input('description'),
                    $req->input('discountPercentage') !== null ? (int)$req->input('discountPercentage') : null,
                    $startStr,
                    $endStr,
                    $req->input('isActive') !== null ? ((int)$req->input('isActive') ? 1 : 0) : null,
                    (int)$id,
                ]
            );
            $r = DB::selectOne("SELECT id, name, description, discount_percentage, start_date, end_date, is_active FROM flash_sales WHERE id = ? LIMIT 1", [(int)$id]);
            if (!$r) return response()->json(['success'=>false,'message'=>'Not found'], 404);
            return response()->json(['success'=>true,'message'=>'Updated','data'=>$this->mapRow($r)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to update flash sale','error'=>$e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $this->ensureTable();
        $n = DB::delete('DELETE FROM flash_sales WHERE id = ?', [(int)$id]);
        if ($n === 0) return response()->json(['success'=>false,'message'=>'Not found'], 404);
        return response()->json(['success'=>true,'message'=>'Deleted']);
    }
}
