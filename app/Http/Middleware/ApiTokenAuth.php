<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $auth = $request->headers->get('Authorization') ?? $request->headers->get('authorization');
        $token = null;
        if (is_string($auth) && str_starts_with(strtolower($auth), 'bearer ')) {
            $token = substr($auth, 7);
        }
        if (!$token || trim($token) === '' || $token === 'null' || $token === 'undefined') {
            return response()->json(['success' => false, 'message' => 'No token provided'], 401);
        }

        // Find active token
        if (!Schema::hasTable('api_tokens')) {
            return response()->json(['success' => false, 'message' => 'Invalid token'], 401);
        }
        $row = DB::table('api_tokens')->where('token', $token)->first();
        if (!$row) {
            return response()->json(['success' => false, 'message' => 'Invalid token'], 401);
        }
        if (!empty($row->expires_at) && strtotime($row->expires_at) < time()) {
            // Optionally delete expired
            DB::table('api_tokens')->where('id', $row->id)->delete();
            return response()->json(['success' => false, 'message' => 'Expired token'], 401);
        }

        // Load user with role and permissions similar to Node
        $query = DB::table('users as u');
        $select = [
            'u.id','u.name','u.email','u.role_id',
        ];
        if (Schema::hasColumn('users', 'is_active')) {
            $select[] = 'u.is_active';
        } else {
            $select[] = DB::raw('1 as is_active');
        }
        if (Schema::hasTable('roles')) {
            $query->leftJoin('roles as r', 'r.id', '=', 'u.role_id');
            $select[] = 'r.name as role_name';
            $select[] = 'r.display_name as role_display_name';
            $select[] = 'r.permissions as role_permissions';
        } else {
            $select[] = DB::raw('NULL as role_name');
            $select[] = DB::raw('NULL as role_display_name');
            $select[] = DB::raw("'[]' as role_permissions");
        }
        $user = $query->select($select)->where('u.id', $row->user_id)->first();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 401);
        }
        if (isset($user->is_active) && (int)$user->is_active === 0) {
            return response()->json(['success' => false, 'message' => 'Akun dinonaktifkan'], 403);
        }

        $perms = [];
        try { $perms = json_decode($user->role_permissions ?? '[]', true) ?: []; } catch (\Throwable $e) { $perms = []; }
        $request->attributes->set('auth_user', [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'role_id' => $user->role_id,
            'role_name' => $user->role_name,
            'role_display_name' => $user->role_display_name,
            'permissions' => $perms,
        ]);

        return $next($request);
    }
}
