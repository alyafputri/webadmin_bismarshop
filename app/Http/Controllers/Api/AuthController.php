<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Str;

class AuthController extends BaseController
{
    // ============================================================
    // ========================== REGISTER =========================
    // ============================================================
    public function register(Request $request)
    {
        $name     = trim((string) $request->input('name'));
        $email    = trim((string) $request->input('email'));
        $password = (string) $request->input('password');
        $phone    = trim((string) $request->input('phone'));

        if ($name === '' || $email === '' || $password === '') {
            return response()->json(['success' => false, 'message' => 'Semua field harus diisi'], 400);
        }
        if (strlen($password) < 6) {
            return response()->json(['success' => false, 'message' => 'Password minimal 6 karakter'], 400);
        }

        $exists = DB::table('users')->where('email', $email)->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Email sudah terdaftar'], 400);
        }

        // Pastikan kolom opsional ada
        try {
            if (!Schema::hasColumn('users', 'role_id')) {
                DB::statement("ALTER TABLE users ADD COLUMN role_id INT NULL");
            }
        } catch (\Throwable $e) {}
        try {
            if (!Schema::hasColumn('users', 'is_active')) {
                DB::statement("ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 0");
            }
        } catch (\Throwable $e) {}
        // Tambahkan kolom phone jika belum ada
        try {
            if (!Schema::hasColumn('users', 'phone')) {
                DB::statement("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL");
            }
        } catch (\Throwable $e) {}

        $hash = Hash::make($password);

        // Susun data insert users secara dinamis agar aman jika kolom tertentu belum ada
        $userData = [
            'name'       => $name,
            'email'      => $email,
            'password'   => $hash,
            'role_id'    => null,
            'is_active'  => 0,            // default: belum disetujui admin
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if (Schema::hasColumn('users', 'phone')) {
            $userData['phone'] = $phone !== '' ? $phone : null;
        }

        $id = DB::table('users')->insertGetId($userData);

        // Opsional: tampilkan di tabel customers sebagai inactive
        try {
            if (DB::getSchemaBuilder()->hasTable('customers')) {
                $customerData = [
                    'name'       => $name,
                    'status'     => 'inactive',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('customers', 'phone')) {
                    $customerData['phone'] = $phone !== '' ? $phone : null;
                }
                // Kolom tambahan seperti total_orders / total_spent hanya diisi jika ada
                if (Schema::hasColumn('customers', 'total_orders')) {
                    $customerData['total_orders'] = DB::raw('COALESCE(total_orders,0)');
                }
                if (Schema::hasColumn('customers', 'total_spent')) {
                    $customerData['total_spent'] = DB::raw('COALESCE(total_spent,0)');
                }
                if (Schema::hasColumn('customers', 'joined_date')) {
                    $customerData['joined_date'] = now();
                }

                DB::table('customers')->updateOrInsert(
                    ['email' => $email],
                    $customerData
                );
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'success'  => true,
            'message'  => 'Registrasi berhasil. Akun menunggu persetujuan admin.',
            'user_id'  => $id,
        ]);
    }

    // ============================================================
    // =========================== LOGIN ===========================
    // ============================================================
    public function login(Request $request)
    {
        // Pastikan kolom dan tabel pendukung ada
        try {
            if (!Schema::hasColumn('users', 'role_id')) {
                DB::statement("ALTER TABLE users ADD COLUMN role_id INT NULL");
            }
        } catch (\Throwable $e) {}
        try {
            if (!Schema::hasColumn('users', 'is_active')) {
                DB::statement("ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
            }
        } catch (\Throwable $e) {}
        try {
            DB::statement("CREATE TABLE IF NOT EXISTS api_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(100) NOT NULL UNIQUE,
                expires_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user(user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } catch (\Throwable $e) {}

        $username = trim((string) $request->input('username'));
        $email    = trim((string) $request->input('email'));
        $password = (string) $request->input('password');
        $remember = (bool) $request->input('rememberMe');

        $loginField = $username ?: $email;
        if (!$loginField || $password === '') {
            return response()->json(['success' => false, 'message' => 'Email/username dan password diperlukan'], 400);
        }

        $loginLower = strtolower($loginField);

        // Query user + roles (jika ada)
        $query  = DB::table('users as u');
        $select = ['u.id', 'u.name', 'u.email', 'u.password'];

        $hasRoleId = Schema::hasColumn('users', 'role_id');
        if ($hasRoleId) {
            $select[] = 'u.role_id';
        } else {
            $select[] = DB::raw('NULL as role_id');
        }

        if (Schema::hasColumn('users', 'is_active')) {
            $select[] = 'u.is_active';
        } else {
            $select[] = DB::raw('1 as is_active');
        }

        if ($hasRoleId && Schema::hasTable('roles')) {
            $query->leftJoin('roles as r', 'r.id', '=', 'u.role_id');
            $select[] = 'r.name as role_name';
            $select[] = 'r.display_name as role_display_name';
            $select[] = 'r.permissions as role_permissions';
        } else {
            $select[] = DB::raw('NULL as role_name');
            $select[] = DB::raw('NULL as role_display_name');
            $select[] = DB::raw("'[]' as role_permissions");
        }

        $u = $query->select($select)
            ->whereRaw('LOWER(u.email) = ?', [$loginLower])
            ->orWhereRaw('LOWER(u.name) = ?', [$loginLower])
            ->first();

        if (!$u) {
            return response()->json(['success' => false, 'message' => 'Email/username atau password salah'], 401);
        }

        $stored = (string) $u->password;
        $ok     = false;
        if ($stored !== '') {
            $ok = Hash::check($password, $stored)
                || hash_equals($stored, $password)
                || hash_equals(trim($stored), trim($password));
        }

        if (!$ok) {
            return response()->json(['success' => false, 'message' => 'Email/username atau password salah'], 401);
        }

        // Jika akun belum aktif, tolak login untuk admin panel, 
        // tapi Flutter masih bisa pakai info ini untuk masuk ke PendingApprovalScreen.
        if (isset($u->is_active) && (int) $u->is_active === 0) {
            // Tetap buat token + user, tapi kirim pesan jelas
            $perms = [];
            try {
                $perms = json_decode($u->role_permissions ?? '[]', true) ?: [];
            } catch (\Throwable $e) {
                $perms = [];
            }

            $userPayload = [
                'id'                => $u->id,
                'email'             => $u->email,
                'name'              => $u->name,
                'role_id'           => $u->role_id,
                'role_name'         => $u->role_name,
                'role_display_name' => $u->role_display_name,
                'permissions'       => $perms,
                'is_active'         => 0,
            ];

            $token     = (string) Str::uuid();
            $expiresAt = now()->addSeconds($remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60);

            DB::table('api_tokens')->insert([
                'user_id'    => $u->id,
                'token'      => $token,
                'expires_at' => $expiresAt,
                'created_at' => now(),
            ]);

            // Flutter akan membaca is_active=0 dan mengarahkan ke pending_approval
            return response()->json([
                'success' => true,
                'message' => 'Akun belum disetujui admin',
                'token'   => $token,
                'user'    => $userPayload,
            ]);
        }

        $perms = [];
        try {
            $perms = json_decode($u->role_permissions ?? '[]', true) ?: [];
        } catch (\Throwable $e) {
            $perms = [];
        }

        $userPayload = [
            'id'                => $u->id,
            'email'             => $u->email,
            'name'              => $u->name,
            'role_id'           => $u->role_id,
            'role_name'         => $u->role_name,
            'role_display_name' => $u->role_display_name,
            'permissions'       => $perms,
            'is_active'         => isset($u->is_active) ? (int) $u->is_active : 1,
        ];

        $token     = (string) Str::uuid();
        $expiresAt = now()->addSeconds($remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60);

        DB::table('api_tokens')->insert([
            'user_id'    => $u->id,
            'token'      => $token,
            'expires_at' => $expiresAt,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'token'   => $token,
            'user'    => $userPayload,
        ]);
    }

    // ============================================================
    // =========================== LOGOUT ==========================
    // ============================================================
    public function logout(Request $request)
    {
        $auth  = $request->headers->get('Authorization');
        $token = null;
        if (is_string($auth) && str_starts_with(strtolower($auth), 'bearer ')) {
            $token = substr($auth, 7);
        }
        if ($token) {
            try {
                DB::table('api_tokens')->where('token', $token)->delete();
            } catch (\Throwable $e) {}
        }
        return response()->json(['success' => true, 'message' => 'Logout berhasil']);
    }

    // ============================================================
    // ============================ ME ============================
    // ============================================================
    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        return response()->json([
            'success'     => true,
            'user'        => $user,
            'permissions' => $user['permissions'] ?? [],
        ]);
    }

    // ============================================================
    // ========================== STATUS ==========================
    // ============================================================
    public function status(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if ($user) {
            return response()->json([
                'authenticated' => true,
                'user'          => [
                    'id'       => $user['id'] ?? null,
                    'username' => $user['name'] ?? ($user['email'] ?? null),
                    'email'    => $user['email'] ?? null,
                ],
            ]);
        }
        return response()->json(['authenticated' => false, 'message' => 'Not authenticated'], 401);
    }
}