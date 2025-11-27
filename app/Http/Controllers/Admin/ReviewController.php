<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class ReviewController extends BaseController
{
    public function index(Request $req)
    {
        $q = trim((string)$req->query('q', ''));
        $limit = min((int)$req->query('limit', 50), 200);
        $page = max((int)$req->query('page', 1), 1);
        $offset = ($page - 1) * $limit;

        $where = [];$params = [];
        if ($q !== '') { $where[] = '(customer_email LIKE ? OR product_name LIKE ? OR comment LIKE ?)'; array_push($params, "%$q%", "%$q%", "%$q%"); }
        $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';

        $rows = DB::select("SELECT id, customer_email, order_id, product_id, rating, comment, product_name, product_image, created_at FROM reviews $whereSql ORDER BY id DESC LIMIT $limit OFFSET $offset", $params);
        $data = array_map(function($r){
            return [
                'id' => $r->id,
                'customer' => $r->customer_email,
                'product' => $r->product_name ?? $r->product_id,
                'rating' => (int)$r->rating,
                'review' => $r->comment,
                'date' => $r->created_at,
                'status' => 'published',
                'orderId' => $r->order_id,
                'productId' => $r->product_id,
                'productImage' => $r->product_image ?? null,
            ];
        }, $rows);
        return response()->json(['success'=>true, 'data'=>$data, 'pagination'=>['page'=>$page,'limit'=>$limit]]);
    }

    public function action(Request $req, $id)
    {
        $action = strtolower((string)$req->input('action', ''));
        if ($action === 'delete') {
            $result = DB::delete('DELETE FROM reviews WHERE id = ?', [(int)$id]);
            if ($result === 0) return response()->json(['success'=>false,'message'=>'Review not found'], 404);
            return response()->json(['success'=>true,'message'=>'Review deleted']);
        }
        return response()->json(['success'=>false,'message'=>'Unsupported action'], 400);
    }

    public function delete($id)
    {
        $result = DB::delete('DELETE FROM reviews WHERE id = ?', [(int)$id]);
        if ($result === 0) return response()->json(['success'=>false,'message'=>'Review not found'], 404);
        return response()->json(['success'=>true,'message'=>'Review deleted']);
    }
}
