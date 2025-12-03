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
                } // status 'banned' tidak berlaku untuk users sintetis
            }

            if ($q) {
                $synthWhere[]  = '(u.name LIKE ? OR u.email LIKE ?)';
                $synthParams[] = "%$q%";
                $synthParams[] = "%$q%";
            }

            $synthWhereSql = $synthWhere ? ('AND ' . implode(' AND ', $synthWhere)) : '';

            $synthetic = DB::select("
                SELECT
                    u.id AS id, -- gunakan id user sebagai id baris untuk approve
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

            // 3) Gabungkan: customers terlebih dulu, lalu user sintetis
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
            // inactive di customers
            $c1  = DB::selectOne("SELECT COUNT(*) AS cnt FROM customers WHERE status = 'inactive'");
            $cnt1 = (int) ($c1->cnt ?? 0);

            // user tanpa customers, role_id null/0, is_active = 0
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

            // 1) Coba update di tabel customers berdasarkan id
            $affected = DB::update(
                'UPDATE customers SET status = ? WHERE id = ?',
                [$status, $customerId]
            );

            if ($affected > 0) {
                // Sinkronisasikan users.is_active berdasarkan email customer
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
                } catch (\Throwable $e) {
                    // diamkan error sinkronisasi kecil
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Customer status updated',
                    'data'    => [
                        'id'     => $customerId,
                        'status' => $status,
                    ],
                ]);
            }

            // 2) Jika tidak ada di customers, perlakukan id sebagai user.id
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

            // Upsert ke tabel customers
            DB::insert(
                'INSERT INTO customers (name, email, phone, address, status, created_at, updated_at)
                 VALUES (?, ?, NULL, NULL, ?, NOW(), NOW())',
                [$user->name, $user->email, $status]
            );

            // Update status aktif di users
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

    /**
     * Opsional: endpoint yang dipakai APK untuk membuat/menyimpan customer.
     * Jika Anda sudah punya method storeFromMobile sebelumnya, biarkan yang lama
     * atau gabungkan dengan kebutuhan Anda.
     */
    public function storeFromMobile(Request $req)
    {
        $data = $req->validate([
            'name'    => ['required', 'string', 'max:255'],
            'email'   => ['required', 'email', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'source'  => ['nullable', 'string', 'max:50'], // contoh: 'mobile'
            'status'  => ['nullable', 'string', 'max:50'], // default 'inactive'
        ]);

        $status = $data['status'] ?? 'inactive';

        try {
            $existing = DB::selectOne(
                'SELECT * FROM customers WHERE email = ? LIMIT 1',
                [$data['email']]
            );

            if ($existing) {
                DB::update(
                    'UPDATE customers SET name = ?, phone = ?, address = ?, status = ?, updated_at = NOW() WHERE id = ?',
                    [
                        $data['name'],
                        $data['phone']   ?? $existing->phone,
                        $data['address'] ?? $existing->address,
                        $status,
                        (int) $existing->id,
                    ]
                );
                $id = (int) $existing->id;
            } else {
                DB::insert(
                    'INSERT INTO customers (name,email,phone,address,status,created_at,updated_at)
                     VALUES (?,?,?,?,?,NOW(),NOW())',
                    [
                        $data['name'],
                        $data['email'],
                        $data['phone']   ?? null,
                        $data['address'] ?? null,
                        $status,
                    ]
                );
                $row = DB::selectOne(
                    'SELECT id FROM customers WHERE email = ? ORDER BY id DESC LIMIT 1',
                    [$data['email']]
                );
                $id = (int) ($row->id ?? 0);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'     => $id,
                    'name'   => $data['name'],
                    'email'  => $data['email'],
                    'phone'  => $data['phone'] ?? null,
                    'status' => $status,
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating customer',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}