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
            if (!in_array($status, ['pending', 'processing', 'shipped', 'completed', 'canceled'])) {
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

            // Calculate totals
            $subtotal = 0;
            foreach ($items as $it) {
                $qty = isset($it->quantity) ? (int)$it->quantity : 0;
                $price = isset($it->price) ? (float)$it->price : 0.0;
                $subtotal += $qty * $price;
            }

            // Tax: if order has tax field use it, otherwise default 10%
            $tax = 0;
            if (isset($order->tax_amount)) {
                $tax = (float)$order->tax_amount;
            } else {
                $tax = round($subtotal * 0.10);
            }

            $shipping = isset($order->shipping_cost) ? (float)$order->shipping_cost : 0.0;
            $grandTotal = $subtotal + $tax + $shipping;

            // Store info - always use PT Indo Bismar for name, get other details from config
            $storeName = 'PT Indo Bismar'; // Hard-coded for consistency
            $configName = config('app.name') ?: '';
            // Only use config name if it's explicitly set and not "Laravel"
            if (!empty($configName) && strtolower($configName) !== 'laravel') {
                $storeName = $configName;
            }
            
            $store = [
                'name' => $storeName,
                'address' => config('app.store_address') ?? 'Jl. Bismarck, Jakarta',
                'phone' => config('app.store_phone') ?? '(021) 555-0123',
                'email' => config('mail.from.address') ?? 'info@bismarshop.com',
                'website' => config('app.url') ?? 'https://bismarshop.id'
            ];

            $receiptNumber = isset($order->receipt_number) && $order->receipt_number ? $order->receipt_number : ('RE' . str_pad((string)$orderId, 6, '0', STR_PAD_LEFT));

            // Attach items to order object for backward compatibility with client code
            try { $order->items = $items; } catch (\Throwable $_) {}

            return response()->json([
                'success' => true,
                'data' => [
                    'order' => $order,
                    'items' => $items,
                    'store' => $store,
                    'receiptNumber' => $receiptNumber,
                    'printDate' => date('c'),
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
