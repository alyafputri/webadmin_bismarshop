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

        $where = [];
        $params = [];

        if ($customerEmail) {
            $where[] = 'customer_email = ?';
            $params[] = (string)$customerEmail;
        }

        if ($status) {
            $where[] = 'status = ?';
            $params[] = (string)$status;
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        try {
            $rows = DB::select(
                "SELECT * FROM orders $whereSql ORDER BY id DESC LIMIT $limit",
                $params
            );

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'data' => []], 500);
        }
    }

    public function show($id)
    {
        try {
            $orderId = (int)$id;
            if ($orderId <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid order ID'], 400);
            }

            $order = DB::selectOne(
                'SELECT * FROM orders WHERE id = ? LIMIT 1',
                [$orderId]
            );

            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            $items = DB::select(
                'SELECT * FROM order_items WHERE order_id = ?',
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
            return response()->json(['success' => false, 'message' => 'Failed to fetch order'], 500);
        }
    }

    public function destroy(Request $req, $id)
    {
        try {
            $orderId = (int)$id;
            if ($orderId <= 0) {
                return response()->json(['success' => false, 'message' => 'Invalid order ID'], 400);
            }

            $deleted = DB::delete(
                'DELETE FROM orders WHERE id = ? LIMIT 1',
                [$orderId]
            );

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
            $allowedStatus = ['pending', 'processing', 'shipped', 'completed', 'canceled'];

            if (!in_array($status, $allowedStatus)) {
                return response()->json(['success' => false, 'message' => 'Invalid status'], 400);
            }

            $affected = DB::update(
                'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? LIMIT 1',
                [$status, $orderId]
            );

            if ($affected === 0) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            return response()->json(['success' => true, 'message' => 'Order updated successfully']);
        } catch (\Throwable $e) {
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

            $order = DB::selectOne(
                'SELECT * FROM orders WHERE id = ? LIMIT 1',
                [$orderId]
            );

            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Order not found'], 404);
            }

            $items = DB::select(
                'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
                [$orderId]
            );

            $subtotal = 0;
            foreach ($items as $item) {
                $subtotal += ((int)$item->quantity) * ((float)$item->price);
            }

            $tax = isset($order->tax_amount)
                ? (float)$order->tax_amount
                : round($subtotal * 0.10);

            $shipping = (float)($order->shipping_cost ?? 0);
            $grandTotal = $subtotal + $tax + $shipping;

            return response()->json([
                'success' => true,
                'data' => [
                    'order' => $order,
                    'items' => $items,
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'shipping' => $shipping,
                    'grandTotal' => $grandTotal
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Failed to get receipt'], 500);
        }
    }
}
