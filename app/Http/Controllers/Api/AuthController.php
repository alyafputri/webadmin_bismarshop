<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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

        $hash = Hash::make($password);

        $id = DB::table('users')->insertGetId([
            'name'       => $name,
            'email'      => $email,
            'password'   => $hash,
            'role_id'    => null,
            'is_active'  => 0,            // default: belum disetujui admin
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Opsional: tampilkan di tabel customers sebagai inactive
        try {
            if (DB::getSchemaBuilder()->hasTable('customers')) {
                DB::table('customers')->updateOrInsert(
                    ['email' => $email],
                    [
                        'name'         => $name,
                        'status'       => 'inactive',
                        'total_orders' => DB::raw('COALESCE(total_orders,0)'),
                        'total_spent'  => DB::raw('COALESCE(total_spent,0)'),
                        'joined_date'  => now(),
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]
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

        // Jika role super admin (role_id = 1), wajib verifikasi kode via email terlebih dahulu
        if ((int) ($u->role_id ?? 0) === 1) {
            try {
                // Pastikan tabel verifikasi super admin tersedia
                DB::statement("CREATE TABLE IF NOT EXISTS superadmin_verifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    code VARCHAR(10) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_user(user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

                // Hapus kode lama untuk user ini
                DB::table('superadmin_verifications')->where('user_id', $u->id)->delete();

                // Generate kode 6 digit
                $code = (string) random_int(100000, 999999);

                $expiresAt = now()->addMinutes(10);

                DB::table('superadmin_verifications')->insert([
                    'user_id'    => $u->id,
                    'code'       => $code,
                    'expires_at' => $expiresAt,
                    'created_at' => now(),
                ]);

                // Kirim kode ke email tujuan tetap
                try {
                    Mail::raw('Kode verifikasi super admin BismarShop: ' . $code . "\n\nKode berlaku sampai: " . $expiresAt->format('d-m-Y H:i'), function ($m) {
                        $m->to('divisipendidikan@indobismar.org')
                          ->subject('Kode Verifikasi Super Admin BismarShop');
                    });
                } catch (\Throwable $e) {
                    // Jika pengiriman email gagal, beri tahu di response tetapi tetap jangan login
                    return response()->json([
                        'success' => false,
                        'message' => 'Gagal mengirim kode verifikasi ke email tujuan',
                    ], 500);
                }

                return response()->json([
                    'success'              => true,
                    'message'              => 'Kode verifikasi telah dikirim ke email tujuan',
                    'requires_verification' => true,
                    'user'                 => [
                        'id'                => $u->id,
                        'email'             => $u->email,
                        'name'              => $u->name,
                        'role_id'           => $u->role_id,
                        'role_name'         => $u->role_name,
                        'role_display_name' => $u->role_display_name,
                    ],
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal membuat kode verifikasi super admin',
                ], 500);
            }
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

    // ============================================================
    // ================== VERIFY SUPER ADMIN CODE =================
    // ============================================================
    public function verifySuperAdmin(Request $request)
    {
        $userId = (int) $request->input('user_id');
        $code   = trim((string) $request->input('code'));

        if (!$userId || $code === '') {
            return response()->json([
                'success' => false,
                'message' => 'User ID dan kode verifikasi wajib diisi',
            ], 400);
        }

        if (!Schema::hasTable('superadmin_verifications')) {
            return response()->json([
                'success' => false,
                'message' => 'Kode verifikasi tidak ditemukan atau sudah kadaluarsa',
            ], 400);
        }

        $row = DB::table('superadmin_verifications')
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->first();

        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => 'Kode verifikasi tidak ditemukan',
            ], 400);
        }

        if (strtotime($row->expires_at) < time()) {
            return response()->json([
                'success' => false,
                'message' => 'Kode verifikasi sudah kadaluarsa',
            ], 400);
        }

        if (!hash_equals((string) $row->code, $code)) {
            return response()->json([
                'success' => false,
                'message' => 'Kode verifikasi tidak sesuai',
            ], 400);
        }

        // Ambil data user dan pastikan benar-benar super admin yang aktif
        $u = DB::table('users as u')
            ->leftJoin('roles as r', 'r.id', '=', 'u.role_id')
            ->select(
                'u.id', 'u.name', 'u.email', 'u.password', 'u.role_id', 'u.is_active',
                'r.name as role_name', 'r.display_name as role_display_name', 'r.permissions as role_permissions'
            )
            ->where('u.id', $userId)
            ->first();

        if (!$u || (int) ($u->role_id ?? 0) !== 1) {
            return response()->json([
                'success' => false,
                'message' => 'User bukan super admin yang valid',
            ], 403);
        }

        if (isset($u->is_active) && (int) $u->is_active === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Akun super admin dinonaktifkan',
            ], 403);
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

        $remember = (bool) $request->input('rememberMe');
        $token    = (string) Str::uuid();
        $expiresAt = now()->addSeconds($remember ? 7 * 24 * 60 * 60 : 24 * 60 * 60);

        DB::table('api_tokens')->insert([
            'user_id'    => $u->id,
            'token'      => $token,
            'expires_at' => $expiresAt,
            'created_at' => now(),
        ]);

        // Opsional: hapus kode setelah sukses digunakan
        DB::table('superadmin_verifications')->where('user_id', $u->id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Verifikasi super admin berhasil',
            'token'   => $token,
            'user'    => $userPayload,
        ]);
    }

    // ============================================================
    // ============== RESEND VERIFICATION CODE (SUPER ADMIN) ======
    // ============================================================
    public function resendSuperAdminCode(Request $request)
    {
        $userId = (int) $request->input('user_id');

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'User ID wajib diisi',
            ], 400);
        }

        // Ambil data user dan pastikan benar-benar super admin yang aktif
        $u = DB::table('users as u')
            ->leftJoin('roles as r', 'r.id', '=', 'u.role_id')
            ->select(
                'u.id', 'u.name', 'u.email', 'u.role_id', 'u.is_active',
                'r.name as role_name', 'r.display_name as role_display_name'
            )
            ->where('u.id', $userId)
            ->first();

        if (!$u || (int) ($u->role_id ?? 0) !== 1) {
            return response()->json([
                'success' => false,
                'message' => 'User bukan super admin yang valid',
            ], 403);
        }

        if (isset($u->is_active) && (int) $u->is_active === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Akun super admin dinonaktifkan',
            ], 403);
        }

        try {
            // Pastikan tabel verifikasi super admin tersedia
            DB::statement("CREATE TABLE IF NOT EXISTS superadmin_verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                code VARCHAR(10) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user(user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // Hapus kode lama untuk user ini
            DB::table('superadmin_verifications')->where('user_id', $u->id)->delete();

            // Generate kode 6 digit baru
            $code = (string) random_int(100000, 999999);

            $expiresAt = now()->addMinutes(10);

            DB::table('superadmin_verifications')->insert([
                'user_id'    => $u->id,
                'code'       => $code,
                'expires_at' => $expiresAt,
                'created_at' => now(),
            ]);

            // Kirim kode ke email tujuan tetap
            try {
                Mail::raw('Kode verifikasi super admin BismarShop (kirim ulang): ' . $code . "\n\nKode berlaku sampai: " . $expiresAt->format('d-m-Y H:i'), function ($m) {
                    $m->to('divisipendidikan@indobismar.org')
                      ->subject('Kirim Ulang Kode Verifikasi Super Admin BismarShop');
                });
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengirim ulang kode verifikasi ke email tujuan',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Kode verifikasi baru telah dikirim ke email tujuan',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat ulang kode verifikasi super admin',
            ], 500);
        }
    }
}