<?php

use Illuminate\Support\Facades\Route;

// ==============================
// ADMIN CONTROLLERS
// ==============================
use App\Http\Controllers\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Admin\VoucherController as AdminVoucherController;

// ==============================
// AUTH CONTROLLERS
// ==============================
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\PasswordResetController;

// ==============================
// PUBLIC / MOBILE CONTROLLERS
// ==============================
use App\Http\Controllers\OrderItemController;
use App\Http\Controllers\ProfitLossController;


// ============================================================
// ===============  API PUBLIC (Mobile / Flutter)  =============
// ============================================================

Route::prefix('mobile')->group(function () {
    // Registrasi dari Flutter
    Route::post('/register', [AdminCustomerController::class, 'registerFromMobile']);

    // Login (jika ada)
    Route::post('/login', [AuthController::class, 'login']);

    // Endpoint publik lainnya…
});


// ============================================================
// ====================  ADMIN API SECTION  ====================
// ============================================================

// CUSTOMER (Admin Dashboard)
Route::prefix('admin/customers')->group(function () {
    Route::get('/', [AdminCustomerController::class, 'index']);
    Route::get('/pending/count', [AdminCustomerController::class, 'pendingCount']);
    Route::post('/{id}/status', [AdminCustomerController::class, 'updateStatus']);
});

// PRODUCTS
Route::prefix('admin/products')->group(function () {
    Route::get('/', [AdminProductController::class, 'index']);
    Route::post('/', [AdminProductController::class, 'store']);
    Route::get('/{id}', [AdminProductController::class, 'show']);
    Route::put('/{id}', [AdminProductController::class, 'update']);
    Route::delete('/{id}', [AdminProductController::class, 'destroy']);
});

// ORDERS
Route::prefix('admin/orders')->group(function () {
    Route::get('/', [AdminOrderController::class, 'index']);
    Route::post('/status/{id}', [AdminOrderController::class, 'updateStatus']);
});

// REVIEWS
Route::get('/admin/reviews', [AdminReviewController::class, 'index']);

// VOUCHER
Route::prefix('admin/vouchers')->group(function () {
    Route::get('/', [AdminVoucherController::class, 'index']);
    Route::post('/', [AdminVoucherController::class, 'store']);
    Route::put('/{id}', [AdminVoucherController::class, 'update']);
    Route::delete('/{id}', [AdminVoucherController::class, 'destroy']);
});


// ============================================================
// ====================  PUBLIC API UMUM  ======================
// ============================================================

Route::get('/order_items/{orderId}', [OrderItemController::class, 'getItems']);
Route::get('/profit-loss', [ProfitLossController::class, 'index']);


// ============================================================
// ================  AUTH (Forgot Password) ====================
// ============================================================

Route::post('/password/email', [PasswordResetController::class, 'forgot']);
Route::post('/password/reset', [PasswordResetController::class, 'reset']);
