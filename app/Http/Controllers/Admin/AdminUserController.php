<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends BaseController
{
    public function index(Request $req)
    {
        try {
            $q = $req->query('q');
            $role_id = $req->query('role_id');
            $status = $req->query('status');
            $where = [];$params=[];
            if ($q) { $where[] = '(u.name LIKE ? OR u.email LIKE ?)'; array_push($params, "%$q%", "%$q%"); }
            if ($role_id) { $where[] = 'u.role_id = ?'; $params[] = (int)$role_id; }
            if ($status !== null && $status !== '') { $where[] = 'u.is_active = ?'; $params[] = ((int)$status ? 1 : 0); }
            $whereSql = $where ? ('WHERE '.implode(' AND ', $where)) : '';
            $rows = DB::select("SELECT u.id, u.name, u.email, u.role_id, u.is_active, r.name AS role_name, r.display_name AS role_display_name FROM users u LEFT JOIN roles r ON r.id = u.role_id $whereSql ORDER BY u.id DESC", $params);
            return response()->json(['success'=>true,'data'=>$rows]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Failed to list users'], 500);
        }
    }

    public function store(Request $req)
    {
        try {
            $name = trim((string)$req->input('name'));
            $email = trim((string)$req->input('email'));
            $password = (string)$req->input('password');
            $role_id = (int)$req->input('role_id');
            if ($name === '' || $email === '' || $password === '' || !$role_id) {
                return response()->json(['success'=>false,'message'=>'Semua field harus diisi'], 400);
            }
            if (!in_array($role_id, [2,3], true)) {
                return response()->json(['success'=>false,'message'=>'Role harus Manager (2) atau Staff (3)'], 400);
            }
            $exists = DB::select('SELECT id FROM users WHERE email = ? LIMIT 1', [$email]);
            if ($exists) return response()->json(['success'=>false,'message'=>'Email sudah terdaftar'], 400);
            $id = DB::table('users')->insertGetId([
                'name'=>$name,
                'email'=>$email,
                'password'=> Hash::make($password),
                'role_id'=> $role_id,
                'is_active'=> 1,
                'created_at'=> now(),
                'updated_at'=> now(),
            ]);
            return response()->json(['success'=>true,'message'=>'Pengguna berhasil dibuat','id'=>$id]);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Terjadi kesalahan server'], 500);
        }
    }

    public function update(Request $req, $id)
    {
        try {
            $id = (int)$id;
            $name = $req->input('name');
            $email = $req->input('email');
            $role_id = $req->input('role_id');
            $password = $req->input('password');
            if ($email) {
                $exists = DB::select('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [$email, $id]);
                if ($exists) return response()->json(['success'=>false,'message'=>'Email sudah digunakan'], 400);
            }
            $fields = [];$params=[];
            if ($name !== null) { $fields[]='name = ?'; $params[]=(string)$name; }
            if ($email !== null) { $fields[]='email = ?'; $params[]=(string)$email; }
            if ($role_id !== null) { $fields[]='role_id = ?'; $params[]=(int)$role_id; }
            if ($password) { $fields[]='password = ?'; $params[]= Hash::make((string)$password); }
            if (!$fields) return response()->json(['success'=>true,'message'=>'Tidak ada perubahan']);
            $params[] = $id;
            DB::update('UPDATE users SET '.implode(', ', $fields).', updated_at = CURRENT_TIMESTAMP WHERE id = ?', $params);
            return response()->json(['success'=>true,'message'=>'Pengguna diperbarui']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Terjadi kesalahan server'], 500);
        }
    }

    public function toggleStatus(Request $req, $id)
    {
        try {
            $id = (int)$id;
            $val = (int)($req->input('is_active') ? 1 : 0);
            DB::update('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [$val, $id]);
            return response()->json(['success'=>true,'message'=> $val ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Terjadi kesalahan server'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $id = (int)$id;
            DB::delete('DELETE FROM users WHERE id = ?', [$id]);
            return response()->json(['success'=>true,'message'=>'Pengguna dihapus']);
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Terjadi kesalahan server'], 500);
        }
    }
}
