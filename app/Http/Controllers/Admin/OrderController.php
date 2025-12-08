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

    public function updateTracking(Request $req, $id)
    {
        try {
            $orderId = (int)$id;
            if ($orderId <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid order ID'], 400);
            }

            $tracking = (string)$req->input('tracking', '');
            $affected = DB::update(
                'UPDATE orders SET tracking_number = ?, tracking = ? WHERE id = ? LIMIT 1',
                [$tracking, $tracking, $orderId]
            );

            if ($affected === 0) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Tracking updated successfully']);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to update tracking'], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            $orderId = (int)$id;
            if ($orderId <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid order ID'], 400);
            }

            $status = (string)$req->input('status', '');
            $body = $req->getContent();
            \Log::debug("OrderController::update - orderId=$orderId, status='$status'");
            \Log::debug("OrderController::update - raw body=$body");
            \Log::debug("OrderController::update - all inputs=" . json_encode($req->all()));
            
            if (!in_array($status, ['pending', 'processing', 'shipped', 'completed', 'canceled'])) {
                \Log::warning("OrderController::update - Invalid status value: '$status'");
                return response()->json(['success' => false, 'message' => 'Invalid status'], 400);
            }

            \Log::debug("OrderController::update - About to execute UPDATE with status='$status', orderId=$orderId");
            
            $affected = DB::update(
                'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? LIMIT 1',
                [$status, $orderId]
            );
            
            \Log::debug("OrderController::update - UPDATE executed, affected rows=$affected");
            
            // Verify the update by reading back
            $verify = DB::selectOne('SELECT id, status FROM orders WHERE id = ? LIMIT 1', [$orderId]);
            if ($verify) {
                \Log::debug("OrderController::update - Verification: order id={$verify->id}, status='{$verify->status}'");
            }

            if ($affected === 0) {
                \Log::warning("OrderController::update - No rows affected, order not found");
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Order updated successfully', 'status' => $status]);
        } catch (\Throwable $e) {
            \Log::error("OrderController::update error: " . $e->getMessage());
            \Log::error("OrderController::update exception: " . $e->__toString());
            return response()->json(['success' => false, 'message' => 'Failed to update order'], 500);
        }
    }

    public function updateStatus(Request $req, $id)
    {
        return $this->update($req, $id);
    }

    public function getReceipt(Request $req, $id)
    {
        try {
            $orderId = (int)$id;
            if ($orderId <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid order ID'], 400);
            }

            // Get order
            $order = DB::selectOne('SELECT * FROM orders WHERE id = ? LIMIT 1', [$orderId]);
            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            // Get order items
            $items = DB::select(
                'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
                [$orderId]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'order' => $order,
                    'items' => $items
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to get receipt'], 500);
        }
    }
}
