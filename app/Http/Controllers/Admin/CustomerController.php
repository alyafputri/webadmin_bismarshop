<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\DB;

class CustomerController extends BaseController
{
    // ============================================================
    // ===============  LIST CUSTOMER + PENDING USER ===============
    // ============================================================
    public function index(Request $req)
    {
        $status = $req->query('status');
        $q      = $req->query('q');

        try {
            // ============================
            // 1. Data customer yang sudah approve
            // ============================
            $query = DB::table('customers')->orderBy('id', 'DESC');

            if ($status) {
                $query->where('status', $status);
            }

            if ($q) {
                $query->where(function ($w) use ($q) {
                    $w->where('name', 'like', "%$q%")
                      ->orWhere('email', 'like', "%$q%");
                });
            }

            $customers = $query->get();

            // ============================
            // 2. User pending (belum masuk customers)
            // ============================
            $pending = DB::table('users as u')
                ->leftJoin('customers as c', 'c.email', '=', 'u.email')
                ->whereNull('c.email') // FIX UTAMA
                ->select(
                    'u.id as id',
                    'u.name',
                    'u.email',
                    DB::raw('NULL as phone'),
                    DB::raw('NULL as address'),
                    DB::raw("'pending' as status"),
                    'u.created_at',
                    'u.updated_at'
                );

            if ($q) {
                $pending->where(function ($w) use ($q) {
                    $w->where('u.name', 'like', "%$q%")
                      ->orWhere('u.email', 'like', "%$q%");
                });
            }

            $pendingUsers = $pending->get();

            // ============================
            // Gabungkan semuanya
            // ============================
            $rows = $customers->merge($pendingUsers)->sortByDesc('id')->values();

            return response()->json([
                'success' => true,
                'data'    => $rows,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'data'    => [],
                'error'   => $e->getMessage(),
            ]);
        }
    }

    // ============================================================
    // ====================== PENDING COUNT ========================
    // ============================================================
    public function pendingCount()
    {
        try {
            // Customer inactive = belum approve
            $c1   = DB::selectOne("SELECT COUNT(*) AS cnt FROM customers WHERE status = 'inactive'");
            $cnt1 = (int) ($c1->cnt ?? 0);

            // User pending = belum masuk customers
            $c2 = DB::selectOne("
                SELECT COUNT(*) AS cnt
                FROM users u
                LEFT JOIN customers c ON c.email = u.email
                WHERE c.email IS NULL
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

    // ============================================================
    // ==================== UPDATE STATUS ==========================
    // ============================================================
    public function updateStatus(Request $req, $id)
    {
        $status = $req->input('status');
        $valid  = ['active', 'inactive', 'banned'];

        if (!in_array($status, $valid, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status.',
            ], 400);
        }

        try {
            $customerId = (int) $id;

            // 1. Update existing customer
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
                } catch (\Throwable $e) {
                    // ignore sync error
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

            // 2. Jika belum customer → jadikan customer baru
            $userId = (int) $id;

            $user = DB::selectOne(
                'SELECT id, name, email FROM users WHERE id = ? LIMIT 1',
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
    // ===============  REGISTER DARI APK FLUTTER  ================
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

            // Buat user login (is_active = 0 agar pending)
            DB::insert("
                INSERT INTO users (name, email, password, role_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 0, 0, NOW(), NOW())
            ", [
                $data['name'],
                $data['email'],
                password_hash($data['password'], PASSWORD_BCRYPT),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Registrasi berhasil. Menunggu persetujuan admin.',
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan server.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // ===============  ALIAS UNTUK ROUTE MOBILE  =================
    // ============================================================
    /**
     * Alias untuk kompatibilitas:
     * Route: POST /api/customers → CustomerController@storeFromMobile
     * Method ini hanya meneruskan ke registerFromMobile.
     */
    public function storeFromMobile(Request $req)
    {
        return $this->registerFromMobile($req);
    }
}