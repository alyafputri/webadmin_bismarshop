<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class CustomerController extends BaseController
{
    public function index(Request $req)
    {
        $status = $req->query('status');
        $q = $req->query('q');
        $where = [];$params=[];
        if ($status) { $where[] = 'status = ?'; $params[] = (string)$status; }
        if ($q) { $where[] = '(name LIKE ? OR email LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
        $whereSql = $where ? ('WHERE '.implode(' AND ',$where)) : '';
        try {
            $rows = DB::select("SELECT * FROM customers $whereSql ORDER BY id DESC LIMIT 200", $params);
            if (!$rows) {
                // Fallback synthesize from users when customers empty
                $synth = DB::select("SELECT NULL AS id, u.name AS name, u.email AS email, NULL AS phone, NULL AS address, CASE WHEN COALESCE(u.is_active,0)=1 THEN 'active' ELSE 'inactive' END AS status, COALESCE(u.created_at, NOW()) AS created_at, COALESCE(u.updated_at, NOW()) AS updated_at FROM users u LEFT JOIN customers c ON c.email = u.email WHERE c.email IS NULL AND (u.role_id IS NULL OR u.role_id = 0) ORDER BY u.id DESC LIMIT 200");
                if ($status) $synth = array_values(array_filter($synth, fn($r)=>$r->status === $status));
                if ($q) { $ql = strtolower((string)$q); $synth = array_values(array_filter($synth, fn($r)=>str_contains(strtolower($r->name ?? ''), $ql) || str_contains(strtolower($r->email ?? ''), $ql))); }
                $rows = $synth;
            }
            return response()->json(['success'=>true,'data'=>$rows ?: []]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'data'=>[]]);
        }
    }

    public function pendingCount()
    {
        try {
            $row = DB::selectOne("SELECT COUNT(*) AS cnt FROM customers WHERE status = 'inactive'");
            return response()->json(['success'=>true,'count'=> (int)($row->cnt ?? 0)]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>true,'count'=>0]);
        }
    }

    public function updateStatus(Request $req, $id)
    {
        $status = $req->input('status');
        $valid = ['active','inactive','banned'];
        if (!in_array($status, $valid)) {
            return response()->json(['success'=>false,'message'=>'Invalid status. Must be one of: active, inactive, banned'], 400);
        }
        try {
            $affected = DB::update('UPDATE customers SET status = ? WHERE id = ?', [$status, (int)$id]);
            // sync users.is_active by email
            try {
                $cust = DB::selectOne('SELECT email FROM customers WHERE id = ? LIMIT 1', [(int)$id]);
                if ($cust && $cust->email) {
                    DB::update('UPDATE users SET is_active = ? WHERE email = ?', [$status === 'active' ? 1 : 0, $cust->email]);
                }
            } catch (\Throwable $e) {}
            if ($affected === 0) return response()->json(['success'=>false,'message'=>'Customer not found'], 404);
            return response()->json(['success'=>true,'message'=>'Customer status updated','data'=>['id'=>(int)$id,'status'=>$status]]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Error updating customer status','error'=>$e->getMessage()], 500);
        }
    }
}
