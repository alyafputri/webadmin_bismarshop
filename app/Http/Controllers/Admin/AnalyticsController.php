<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends BaseController
{
    public function bestSellers()
    {
        try {
            $rows = DB::select(
                "SELECT 
                   p.id,
                   p.name,
                   p.category AS category,
                   COALESCE(SUM(oi.quantity),0) AS sold_count,
                   COALESCE(SUM(oi.quantity * oi.price),0) AS revenue,
                   COALESCE(
                     (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1),
                     ''
                   ) AS image
                 FROM order_items oi
                 INNER JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
                 LEFT JOIN products p ON p.id = oi.product_id
                 GROUP BY p.id, p.name, p.category
                 ORDER BY sold_count DESC, revenue DESC
                 LIMIT 100"
            );
            // Fallback: if there is no completed-order data yet, use products table sorted by sold_count (or sold)
            if (!$rows || count($rows) === 0) {
                try {
                    $rows = DB::select(
                        "SELECT 
                           p.id,
                           p.name,
                           p.category AS category,
                           COALESCE(p.sold_count, p.sold, 0) AS sold_count,
                           COALESCE(p.sold_count, p.sold, 0) * COALESCE(p.regular_price, 0) AS revenue,
                           COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1), '') AS image
                         FROM products p
                         ORDER BY sold_count DESC, p.id DESC
                         LIMIT 100"
                    );
                } catch (\Throwable $e2) {
                    $rows = [];
                }
                // Last resort: minimal fallback without using possibly-missing columns
                if (!$rows || count($rows) === 0) {
                    try {
                        $rows = DB::select(
                            "SELECT p.id, p.name, p.category AS category, 0 AS sold_count, 0 AS revenue, COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1), '') AS image FROM products p ORDER BY p.id DESC LIMIT 100"
                        );
                    } catch (\Throwable $e3) { $rows = []; }
                }
            }
            return response()->json(['success'=>true,'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to compute best sellers'], 500);
        }
    }

    public function productSales(Request $req)
    {
        try {
            $period = (string)$req->query('period', '7days');
            $limit = (int)$req->query('limit', 10);
            $limit = $limit > 0 ? min($limit, 100) : 10;
            $startDate = now()->subDays(match($period) {
                '30days' => 30,
                '90days' => 90,
                '365days' => 365,
                default => 7,
            });
            $rows = DB::select(
                "SELECT 
                   p.id,
                   p.name,
                   p.category,
                   COALESCE(SUM(oi.quantity),0) AS sold,
                   COALESCE(SUM(oi.quantity * oi.price),0) AS revenue
                 FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 LEFT JOIN products p ON p.id = oi.product_id
                 WHERE o.status = 'completed' AND o.created_at >= ?
                 GROUP BY p.id, p.name, p.category
                 ORDER BY sold DESC
                 LIMIT ?",
                [$startDate, $limit]
            );
            return response()->json(['success'=>true,'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to compute product sales analytics'], 500);
        }
    }

    public function categorySales()
    {
        try {
            $rows = DB::select(
                "SELECT 
                   COALESCE(p.category, 'Uncategorized') AS name,
                   COUNT(DISTINCT p.id)                  AS totalProducts,
                   COALESCE(SUM(oi.quantity),0)          AS totalSold,
                   COALESCE(SUM(oi.quantity * oi.price),0) AS totalRevenue
                 FROM products p
                 LEFT JOIN order_items oi ON oi.product_id = p.id
                 LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
                 GROUP BY COALESCE(p.category, 'Uncategorized')
                 ORDER BY totalRevenue DESC"
            );
            return response()->json(['success'=>true,'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to compute category sales analytics'], 500);
        }
    }

    public function salesTrend(Request $req)
    {
        try {
            $period = (string)$req->query('period', '7days');
            $startDate = now()->subDays(match($period) {
                '30days' => 30,
                '90days' => 90,
                '365days' => 365,
                default => 7,
            });
            $rows = DB::select(
                "SELECT 
                   DATE(o.created_at) AS date,
                   COUNT(DISTINCT o.id) AS orders,
                   COALESCE(SUM(oi.quantity * oi.price),0) AS revenue
                 FROM orders o
                 JOIN order_items oi ON oi.order_id = o.id
                 WHERE o.status = 'completed' AND o.created_at >= ?
                 GROUP BY DATE(o.created_at)
                 ORDER BY DATE(o.created_at)",
                [$startDate]
            );
            $trend = array_map(fn($r)=>[
                'date' => $r->date,
                'orders' => (int)$r->orders,
                'revenue' => (int)$r->revenue,
                'visitors' => ((int)$r->orders) * 10,
            ], $rows);
            return response()->json(['success'=>true,'data'=>$trend]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to compute sales trend'], 500);
        }
    }

    public function monthlyProfitLoss(Request $req)
    {
        try {
            $year = (int)($req->query('year', date('Y')));
            $rows = DB::select(
                "SELECT MONTH(created_at) AS m, COALESCE(SUM(total_amount),0) AS revenue
                 FROM orders
                 WHERE YEAR(created_at) = ?
                 GROUP BY MONTH(created_at)
                 ORDER BY m",
                [$year]
            );
            $monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            $byMonth = [];
            foreach ($rows as $r) { $byMonth[(int)$r->m - 1] = (int)$r->revenue; }
            $monthly = [];
            for ($i=0;$i<12;$i++) {
                $revenue = $byMonth[$i] ?? 0;
                $costs = (int) round($revenue * 0.7);
                $profit = $revenue - $costs;
                $profitMargin = $revenue > 0 ? round(($profit / $revenue) * 1000) / 10 : 0;
                $monthly[] = [
                    'monthName'=>$monthNames[$i],
                    'revenue'=>$revenue,
                    'costs'=>$costs,
                    'profit'=>$profit,
                    'profitMargin'=>$profitMargin,
                ];
            }
            $best = array_reduce($monthly, function($best,$cur){ return ($cur['profit'] > ($best['profit'] ?? -INF)) ? $cur : $best; }, $monthly[0] ?? ['monthName'=>'Jan','profit'=>0]);
            $totalProfit = array_sum(array_map(fn($m)=>$m['profit'],$monthly));
            $totalRevenue = array_sum(array_map(fn($m)=>$m['revenue'],$monthly));
            $yearly = [
                'profit'=>$totalProfit,
                'profitMargin'=> $totalRevenue>0 ? round(($totalProfit/$totalRevenue)*1000)/10 : 0,
            ];
            return response()->json(['success'=>true,'data'=>[
                'year'=>$year,
                'monthly'=>$monthly,
                'summary'=>['bestMonth'=>$best],
                'yearly'=>$yearly,
            ]]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to build monthly profit/loss analytics'], 500);
        }
    }

    public function monthlyBestsellers(Request $req)
    {
        try {
            $now = now();
            $month = (int)($req->query('month', $now->month));
            $year = (int)($req->query('year', $now->year));
            $rows = DB::select(
                "SELECT 
                   p.name AS name,
                   COALESCE(SUM(oi.quantity),0) AS totalSold,
                   COALESCE(SUM(oi.quantity * oi.price),0) AS revenue
                 FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
                 LEFT JOIN products p ON p.id = oi.product_id
                 WHERE YEAR(o.created_at) = ? AND MONTH(o.created_at) = ?
                 GROUP BY p.id, p.name
                 HAVING totalSold > 0
                 ORDER BY totalSold DESC, revenue DESC
                 LIMIT 20",
                [$year, $month]
            );
            $monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            $periodLabel = ($monthNames[$month - 1] ?? (string)$month) . '/' . $year;
            $products = array_map(fn($r)=>[
                'name'=>$r->name ?? 'Produk Tanpa Nama',
                'totalSold'=>(int)$r->totalSold,
                'revenue'=>(int)$r->revenue,
                'profit'=> (int) round(((int)$r->revenue) * 0.3),
            ], $rows);
            return response()->json(['success'=>true,'data'=>[
                'period'=>$periodLabel,
                'products'=>$products,
            ]]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to build monthly bestsellers analytics'], 500);
        }
    }

    public function analyticsSummary(Request $req)
    {
        try {
            $period = (string)$req->query('period', '7days');
            $days = match($period) {
                '30days' => 30,
                '90days' => 90,
                default => 7,
            };
            // Status counts and totals
            $row = DB::selectOne(
                "SELECT
                    COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END),0) AS today_amount,
                    COALESCE(SUM(CASE WHEN YEARWEEK(created_at,1) = YEARWEEK(CURDATE(),1) THEN total_amount ELSE 0 END),0) AS week_amount,
                    COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN total_amount ELSE 0 END),0) AS month_amount,
                    COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END),0) AS today_orders,
                    COALESCE(SUM(CASE WHEN YEARWEEK(created_at,1) = YEARWEEK(CURDATE(),1) THEN 1 ELSE 0 END),0) AS week_orders,
                    COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END),0) AS month_orders,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),0) AS status_pending,
                    COALESCE(SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END),0) AS status_processing,
                    COALESCE(SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END),0) AS status_shipped,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END),0) AS status_completed,
                    COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END),0) AS status_cancelled,
                    COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN total_amount ELSE 0 END),0) AS period_amount,
                    COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END),0) AS period_orders
                  FROM orders",
                [$days, $days]
            );
            $r = $row ?: (object) [];
            // Visitors trend approximation
            $trendRows = DB::select(
                "SELECT DATE(created_at) AS d, COUNT(*) AS orders
                 FROM orders
                 WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY d",
                [min($days, 14)]
            );
            $visitorData = array_map(function($row){
                $orders = (int)($row->orders ?? 0);
                $visitors = $orders > 0 ? max($orders * 10, $orders + 5) : 0;
                return [ 'date' => substr((string)$row->d, 0, 10), 'visitors' => $visitors, 'orders' => $orders ];
            }, $trendRows);
            $totalVisitors = array_sum(array_map(fn($v)=> (int)$v['visitors'], $visitorData));
            $todayVisitors = $visitorData ? (int)end($visitorData)['visitors'] : 0;
            $last7 = array_slice($visitorData, -7);
            $last30 = array_slice($visitorData, -30);
            $weekVisitors = array_sum(array_map(fn($v)=> (int)$v['visitors'],$last7));
            $monthVisitors = array_sum(array_map(fn($v)=> (int)$v['visitors'],$last30));
            $avgVisitors = count($visitorData) ? (int) round($totalVisitors / max(count($visitorData),1)) : 0;
            $visitorStats = [
                'today'=>$todayVisitors,
                'week'=>$weekVisitors,
                'month'=>$monthVisitors,
                'average'=>$avgVisitors,
                'peakHour'=>'N/A',
            ];
            // Product performance
            $prodRows = DB::select(
                "SELECT 
                   COALESCE(p.name, oi.product_name) AS name,
                   COALESCE(p.category, 'Lainnya')   AS category,
                   SUM(oi.quantity)                  AS sold,
                   SUM(oi.quantity * oi.price)       AS revenue
                 FROM order_items oi
                 JOIN orders o   ON o.id = oi.order_id
                 LEFT JOIN products p ON p.id = oi.product_id
                 WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                 GROUP BY COALESCE(p.name, oi.product_name), COALESCE(p.category, 'Lainnya')
                 ORDER BY revenue DESC
                 LIMIT 20",
                [$days]
            );
            $totalRevenueAll = array_sum(array_map(fn($r)=> (int)$r->revenue, $prodRows)) ?: 1;
            $productStats = array_map(fn($r)=>[
                'name' => $r->name ?? 'Produk',
                'category' => $r->category ?? 'Lainnya',
                'sold' => (int)($r->sold ?? 0),
                'revenue' => (int)($r->revenue ?? 0),
                'percentage' => (int) round(((int)($r->revenue ?? 0) / $totalRevenueAll) * 100),
            ], $prodRows);
            usort($productStats, fn($a,$b)=> ($b['sold'] ?? 0) <=> ($a['sold'] ?? 0));
            $topProduct = $productStats[0] ?? null;
            $topProducts = array_slice($productStats, 0, 5);

            $summary = [
                'totalSales' => [
                    'amount' => (int)($r->period_amount ?? 0),
                    'count' => (int)($r->period_orders ?? 0),
                    'periodDays' => $days,
                ],
                'totalVisitors' => $totalVisitors,
                'topProduct' => $topProduct ? ['name'=>$topProduct['name'], 'sold'=>$topProduct['sold']] : null,
                'conversionRate' => $totalVisitors > 0 ? round(((int)($r->period_orders ?? 0) / $totalVisitors) * 1000) / 10 : 0,
            ];

            return response()->json([
                'success'=>true,
                'summary'=>[
                    'today'=>[ 'amount'=>(int)($r->today_amount ?? 0), 'orders'=>(int)($r->today_orders ?? 0) ],
                    'week'=> [ 'amount'=>(int)($r->week_amount ?? 0),  'orders'=>(int)($r->week_orders ?? 0) ],
                    'month'=>[ 'amount'=>(int)($r->month_amount ?? 0), 'orders'=>(int)($r->month_orders ?? 0) ],
                    'statusCounts'=>[
                        'pending'=>(int)($r->status_pending ?? 0),
                        'processing'=>(int)($r->status_processing ?? 0),
                        'shipped'=>(int)($r->status_shipped ?? 0),
                        'completed'=>(int)($r->status_completed ?? 0),
                        'cancelled'=>(int)($r->status_cancelled ?? 0),
                    ],
                    'totalSales'=>$summary['totalSales'],
                    'totalVisitors'=>$summary['totalVisitors'],
                    'topProduct'=>$summary['topProduct'],
                    'conversionRate'=>$summary['conversionRate'],
                ],
                'visitorData'=>$visitorData,
                'visitorStats'=>$visitorStats,
                'productStats'=>$productStats,
                'topProducts'=>$topProducts,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to build analytics summary'], 500);
        }
    }
}
