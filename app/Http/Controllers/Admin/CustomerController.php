<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class CustomerController extends BaseController
{
    public function index(Request $req)
    {
        $status = $req->query('status'); // 'active' | 'inactive' | 'banned' | null
        $q      = $req->query('q');

        try {
            // 1) Ambil data dari tabel customers
            $where  = [];
            $params = [];

            if ($status) {
                $where[]  = 'c.status = ?';
                $params[] = (string) $status;
            }
            if ($q) {
                $where[]  = '(c.name LIKE ? OR c.email LIKE ?)';
                $params[] = "%$q%";
                $params[] = "%$q%";
            }

            $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

            $customers = DB::select("
                SELECT
                    c.id,
                    c.name,
                    c.email,
                    c.phone,
                    c.address,
                    c.status,
                    c.created_at,
                    c.updated_at
                FROM customers c
                $whereSql
                ORDER BY c.id DESC
                LIMIT 200
            ", $params);

            // 2) Tambahkan data sintetis dari users yang BELUM ada di customers
            $synthWhere  = ['(u.role_id IS NULL OR u.role_id = 0)'];
            $synthParams = [];

            if ($status) {
                if ($status === 'active') {
                    $synthWhere[] = 'COALESCE(u.is_active,0) = 1';
                } elseif ($status === 'inactive') {
                    $synthWhere[] = 'COALESCE(u.is_active,0) = 0';
                }
            }

            if ($q) {
                $synthWhere[]  = '(u.name LIKE ? OR u.email LIKE ?)';
                $synthParams[] = "%$q%";
                $synthParams[] = "%$q%";
            }

            $synthWhereSql = $synthWhere ? ('AND ' . implode(' AND ', $synthWhere)) : '';

            $synthetic = DB::select("
                SELECT
                    u.id AS id,
                    u.name AS name,
                    u.email AS email,
                    NULL AS phone,
                    NULL AS address,
                    CASE WHEN COALESCE(u.is_active,0) = 1 THEN 'active' ELSE 'inactive' END AS status,
                    COALESCE(u.created_at, NOW()) AS created_at,
                    COALESCE(u.updated_at, NOW()) AS updated_at
                FROM users u
                LEFT JOIN customers c ON c.email = u.email
                WHERE c.email IS NULL
                  $synthWhereSql
                ORDER BY u.id DESC
                LIMIT 200
            ", $synthParams);

            // 3) Gabungkan
            $rows = array_merge($customers, $synthetic);

            return response()->json([
                'success' => true,
                'data'    => $rows ?: [],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => true,
                'data'    => [],
            ]);
        }
    }

    public function pendingCount()
    {
        try {
            $c1  = DB::selectOne("SELECT COUNT(*) AS cnt FROM customers WHERE status = 'inactive'");
            $cnt1 = (int) ($c1->cnt ?? 0);

            $c2 = DB::selectOne("
                SELECT COUNT(*) AS cnt
                FROM users u
                LEFT JOIN customers c ON c.email = u.email
                WHERE c.email IS NULL
                  AND (u.role_id IS NULL OR u.role_id = 0)
                  AND COALESCE(u.is_active,0) = 0
            ");
            $cnt2 = (int) ($c2->cnt ?? 0);

            return response()->json([
                'success' => true,
                'count'   => $cnt1 + $cnt2,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => true,
                'count'   => 0,
            ]);
        }
    }

    public function updateStatus(Request $req, $id)
    {
        $status = $req->input('status');
        $valid  = ['active', 'inactive', 'banned'];

        if (!in_array($status, $valid, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status. Must be one of: active, inactive, banned',
            ], 400);
        }

        try {
            $customerId = (int) $id;

            // 1) Coba update di tabel customers
            $affected = DB::update(
                'UPDATE customers SET status = ? WHERE id = ?',
                [$status, $customerId]
            );

            if ($affected > 0) {
                try {
                    $cust = DB::selectOne(
                        'SELECT email FROM customers WHERE id = ? LIMIT 1',
                        [$customerId]
                    );
                    if ($cust && $cust->email) {
                        DB::update(
                            'UPDATE users SET is_active = ? WHERE email = ?',
                            [$status === 'active' ? 1 : 0, $cust->email]
                        );
                    }
                } catch (\Throwable $e) {}

                return response()->json([
                    'success' => true,
                    'message' => 'Customer status updated',
                    'data'    => [
                        'id'     => $customerId,
                        'status' => $status,
                    ],
                ]);
            }

            // 2) Jika tidak ada di customers, cari di users
            $userId = (int) $id;

            $user = DB::selectOne(
                'SELECT id, name, email FROM users WHERE id = ? AND (role_id IS NULL OR role_id = 0) LIMIT 1',
                [$userId]
            );

            if (!$user || !$user->email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer not found',
                ], 404);
            }

            DB::insert(
                'INSERT INTO customers (name, email, phone, address, status, created_at, updated_at)
                 VALUES (?, ?, NULL, NULL, ?, NOW(), NOW())',
                [$user->name, $user->email, $status]
            );

            DB::update(
                'UPDATE users SET is_active = ? WHERE id = ?',
                [$status === 'active' ? 1 : 0, $userId]
            );

            return response()->json([
                'success' => true,
                'message' => 'Customer status updated from users table',
                'data'    => [
                    'id'     => $userId,
                    'status' => $status,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating customer status',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // ===============  REGISTER DARI APK FLUTTER  =================
    // ============================================================
    public function registerFromMobile(Request $req)
    {
        $data = $req->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:6'],
            'phone'    => ['nullable', 'string', 'max:50'],
            'address'  => ['nullable', 'string', 'max:255'],
        ]);

        try {
            // Cek jika user sudah ada
            $existsUser = DB::selectOne(
                "SELECT id FROM users WHERE email = ? LIMIT 1",
                [$data['email']]
            );

            if ($existsUser) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email sudah terdaftar.',
                ], 409);
            }

            // Buat user login
            DB::insert("
                INSERT INTO users (name, email, password, role_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 0, 1, NOW(), NOW())
            ", [
                $data['name'],
                $data['email'],
                password_hash($data['password'], PASSWORD_BCRYPT),
            ]);

            // Ambil ID user
            $user = DB::selectOne(
                "SELECT id FROM users WHERE email = ? ORDER BY id DESC LIMIT 1",
                [$data['email']]
            );
            $userId = (int) ($user->id ?? 0);

            // Buat customer
            DB::insert("
                INSERT INTO customers (name, email, phone, address, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
            ", [
                $data['name'],
                $data['email'],
                $data['phone'] ?? null,
                $data['address'] ?? null,
            ]);

            // Ambil customer ID
            $cust = DB::selectOne(
                "SELECT id FROM customers WHERE email = ? ORDER BY id DESC LIMIT 1",
                [$data['email']]
            );

            return response()->json([
                'success' => true,
                'message' => 'Registrasi berhasil',
                'data' => [
                    'user_id'     => $userId,
                    'customer_id' => $cust->id,
                    'name'        => $data['name'],
                    'email'       => $data['email'],
                ],
            ], 201);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan server.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
