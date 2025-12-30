<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PublicApiController;
use App\Http\Controllers\Admin\WidgetController as AdminWidgetController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Admin\PromotionsController as AdminPromotionsController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\VoucherController as AdminVoucherController;
use App\Http\Controllers\Admin\UploadController as AdminUploadController;
use App\Http\Controllers\Admin\AdminUserController as AdminUserController;
use App\Http\Controllers\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Admin\ProductDiscountController as AdminProductDiscountController;
use App\Http\Controllers\Admin\ProductVoucherController as AdminProductVoucherController;
use App\Http\Controllers\Admin\FlashSaleController as AdminFlashSaleController;
use App\Http\Controllers\Admin\FreeShippingController as AdminFreeShippingController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\FeaturedProductController as AdminFeaturedProductController;

/*
|--------------------------------------------------------------------------
| AUTH & PUBLIC CUSTOMER
|--------------------------------------------------------------------------
*/

Route::post('/customers', [AdminCustomerController::class, 'registerFromMobile']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-superadmin', [AuthController::class, 'verifySuperAdmin']);
    Route::post('/resend-superadmin-code', [AuthController::class, 'resendSuperAdminCode']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth.token');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth.token');
    Route::get('/status', [AuthController::class, 'status'])->middleware('auth.token');
});

/*
|--------------------------------------------------------------------------
| ADMIN (AUTH TOKEN)
|--------------------------------------------------------------------------
*/

Route::middleware('auth.token')->group(function () {

    // Dashboard
    Route::get('/dashboard/enhanced', [DashboardController::class, 'enhanced']);

    // Orders
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::put('/orders/{id}', [AdminOrderController::class, 'update']);
    Route::post('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::put('/orders/{id}/tracking', [AdminOrderController::class, 'updateTracking']);
    Route::get('/orders/{id}/receipt', [AdminOrderController::class, 'getReceipt']);
    Route::delete('/orders/{id}', [AdminOrderController::class, 'destroy']);

    // Customers
    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/customers/pending/count', [AdminCustomerController::class, 'pendingCount']);
    Route::put('/customers/{id}/status', [AdminCustomerController::class, 'updateStatus']);

    // Reviews
    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::post('/reviews/{id}', [AdminReviewController::class, 'action']);
    Route::post('/reviews/{id}/delete', [AdminReviewController::class, 'delete']);

    // Products
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::get('/products/{id}', [AdminProductController::class, 'show']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    // Upload
    Route::post('/upload', [AdminUploadController::class, 'upload']);

    // Analytics
    Route::get('/analytics', [AdminAnalyticsController::class, 'analyticsSummary']);

    // Admin users
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::post('/admin/users', [AdminUserController::class, 'store']);
    Route::put('/admin/users/{id}', [AdminUserController::class, 'update']);
    Route::patch('/admin/users/{id}/status', [AdminUserController::class, 'toggleStatus']);
    Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);

    // Featured Products
    Route::get('/featured-products', [AdminFeaturedProductController::class, 'index']);
    Route::post('/featured-products', [AdminFeaturedProductController::class, 'store']);
    Route::delete('/featured-products/{id}', [AdminFeaturedProductController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| PUBLIC API (MOBILE)
|--------------------------------------------------------------------------
*/

Route::prefix('public')->group(function () {
    Route::get('/products', [PublicApiController::class, 'products']);
    Route::get('/top-products', [PublicApiController::class, 'topProducts']);
    Route::get('/widgets', [PublicApiController::class, 'widgets']);
    Route::get('/vouchers', [PublicApiController::class, 'vouchers']);
    Route::get('/flash-sales', [PublicApiController::class, 'flashSales']);
    Route::get('/free-shipping', [PublicApiController::class, 'freeShipping']);

    Route::post('/orders', [PublicApiController::class, 'createOrder']);
    Route::get('/orders', [PublicApiController::class, 'listOrders']);
    Route::post('/orders/{id}/cancel', [PublicApiController::class, 'cancelOrder']);
    Route::post('/orders/{id}/complete', [PublicApiController::class, 'completeOrder']);

    Route::post('/reviews', [PublicApiController::class, 'upsertReview']);
    Route::get('/reviews', [PublicApiController::class, 'listReviews']);

    Route::get('/categories', [PublicApiController::class, 'categories']);
    Route::get('/customer-status', [AdminCustomerController::class, 'statusForMobile']);
});

/*
|--------------------------------------------------------------------------
| FALLBACK
|--------------------------------------------------------------------------
*/

Route::any('/{any}', function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found'
    ], 404);
})->where('any', '.*');
