<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class PromotionsController extends BaseController
{
    public function analytics()
    {
        try {
            $vouchersTotal = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM vouchers")->c ?? 0);
            $vouchersActive = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM vouchers WHERE is_active = 1 AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())")->c ?? 0);
            $flashTotal = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM flash_sales")->c ?? 0);
            $flashActive = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM flash_sales WHERE is_active = 1 AND (end_date IS NULL OR end_date >= NOW())")->c ?? 0);
            $freeTotal = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM free_shipping_promotions")->c ?? 0);
            $freeActive = (int) (DB::selectOne("SELECT COUNT(*) AS c FROM free_shipping_promotions WHERE is_active = 1 AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())")->c ?? 0);
            $totalSavings = 0; // placeholder
            return response()->json([
                'success' => true,
                'data' => [
                    'vouchers' => ['active' => $vouchersActive, 'total' => $vouchersTotal],
                    'flashSales' => ['active' => $flashActive, 'total' => $flashTotal],
                    'productDiscounts' => ['active' => 0],
                    'totalSavings' => $totalSavings,
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Error generating promotion analytics'], 500);
        }
    }

    public function flashSales()
    {
        try {
            $rows = DB::select("SELECT id, name, description, discount_percentage, start_date, end_date, is_active FROM flash_sales ORDER BY id DESC");
            $data = array_map(function($r){
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
            }, $rows);
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function freeShipping()
    {
        try {
            $rows = DB::select("SELECT id, name, description, type, locations, min_amount, categories, start_date, end_date, is_active FROM free_shipping_promotions ORDER BY id DESC");
            $data = array_map(function($r){
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
                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'description' => $r->description ?? '',
                    'type' => $type,
                    'conditions' => $conditions,
                    'startDate' => $r->start_date,
                    'endDate' => $r->end_date,
                    'isActive' => (bool)$r->is_active,
                ];
            }, $rows);
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }
}
