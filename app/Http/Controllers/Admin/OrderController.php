<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class OrderController extends BaseController
{
    public function index(Request $req)
    {
        $customerEmail = $req->query('customer_email');
        $status = $req->query('status');
        $limit = min((int)($req->query('limit', 50)), 200);
        $where = [];$params = [];
        if ($customerEmail) { $where[] = 'customer_email = ?'; $params[] = (string)$customerEmail; }
        if ($status) { $where[] = 'status = ?'; $params[] = (string)$status; }
        $whereSql = $where ? ('WHERE '.implode(' AND ',$where)) : '';
        try {
            $rows = DB::select("SELECT * FROM orders $whereSql ORDER BY id DESC LIMIT $limit", $params);
            return response()->json(['success'=>true,'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function destroy(Request $req, $id)
    {
        try {
            $orderId = (int)$id;
            if ($orderId <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid order ID'], 400);
            }

            $deleted = DB::delete('DELETE FROM orders WHERE id = ? LIMIT 1', [$orderId]);
            if ($deleted === 0) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Order deleted successfully']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete order'], 500);
        }
    }
}
