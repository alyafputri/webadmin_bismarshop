<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseController
{
    public function enhanced(Request $request)
    {
        // permission not strictly enforced here; rely on auth.token; optionally check 'dashboard' perm
        $now = now();
        $todayStart = $now->copy()->startOfDay();
        $weekStart = $todayStart->copy()->subDays($todayStart->dayOfWeek);
        $monthStart = $now->copy()->startOfMonth();

        // Sales summary
        $todayRows = DB::selectOne("SELECT COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE status='completed' AND created_at >= ?", [$todayStart]);
        $weekRows = DB::selectOne("SELECT COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE status='completed' AND created_at >= ?", [$weekStart]);
        $monthRows = DB::selectOne("SELECT COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE status='completed' AND created_at >= ?", [$monthStart]);

        $salesSummary = [
            'today' => (array)($todayRows ?: ['orders'=>0,'revenue'=>0]),
            'week' => (array)($weekRows ?: ['orders'=>0,'revenue'=>0]),
            'month' => (array)($monthRows ?: ['orders'=>0,'revenue'=>0]),
        ];

        // Order status counts
        $statusRows = DB::select("SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status");
        $orderStats = ['pending'=>0,'processing'=>0,'shipped'=>0,'completed'=>0,'cancelled'=>0];
        foreach ($statusRows as $r) { $orderStats[$r->status] = (int)$r->cnt; }

        // Best sellers (by sold_count)
        $bestRows = DB::select("SELECT p.id, p.name, p.sold_count, (p.sold_count * p.regular_price) AS revenue, (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image FROM products p ORDER BY p.sold_count DESC LIMIT 5");
        $lowStockRows = DB::select("SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC");

        // Recent orders in last 1 day -> notifications
        $recentOrderRows = DB::select("SELECT id, customer_name, total_amount, created_at FROM orders WHERE created_at >= (NOW() - INTERVAL 1 DAY) ORDER BY created_at DESC");
        $notifications = [];
        foreach ($recentOrderRows as $o) {
            $notifications[] = [
                'id' => 'order_'.$o->id,
                'type' => 'order',
                'title' => 'Pesanan Baru',
                'message' => 'Pesanan #'.$o->id.' dari '.$o->customer_name,
                'amount' => $o->total_amount,
                'time' => $o->created_at,
                'read' => false,
            ];
        }
        foreach ($lowStockRows as $p) {
            $notifications[] = [
                'id' => 'stock_'.$p->id,
                'type' => 'stock',
                'title' => 'Stok Menipis',
                'message' => $p->name.' tersisa '.$p->stock.' unit',
                'time' => now()->toDateTimeString(),
                'read' => false,
            ];
        }
        usort($notifications, fn($a,$b)=>strtotime($b['time']) <=> strtotime($a['time']));

        return response()->json([
            'salesSummary' => $salesSummary,
            'orderStats' => $orderStats,
            'bestSellers' => $bestRows,
            'lowStockProducts' => $lowStockRows,
            'notifications' => array_slice($notifications, 0, 10),
        ]);
    }
}
