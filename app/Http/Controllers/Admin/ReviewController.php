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

        // Pastikan struktur tabel reviews sama dengan yang dipakai oleh PublicApiController@upsertReview
        DB::statement("CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_email VARCHAR(255) NOT NULL,
            order_id INT NOT NULL,
            product_id VARCHAR(64) NOT NULL,
            rating INT NOT NULL,
            comment TEXT NULL,
            product_name VARCHAR(255) NULL,
            product_image TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uniq_review (customer_email, order_id, product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $where = [];$params = [];
        if ($q !== '') {
            $where[] = '(customer_email LIKE ? OR product_name LIKE ? OR comment LIKE ?)';
            array_push($params, "%$q%", "%$q%", "%$q%");
        }
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
