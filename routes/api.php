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

// Prefix otomatis /api dari Laravel

// ============================================================
// ================ ADMIN CUSTOMER (JSON) =====================
// ============================================================
Route::prefix('admin')->group(function () {
    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/customers/pending-count', [AdminCustomerController::class, 'pendingCount']);
    Route::patch('/customers/{id}/status', [AdminCustomerController::class, 'updateStatus']);
});

// ============================================================
// ================ MOBILE CUSTOMER ENDPOINTS =================
// ============================================================

// Public endpoint untuk membuat/menyimpan customer dari mobile app
Route::post('/customers', [AdminCustomerController::class, 'registerFromMobile']);

// (Status akun untuk mobile akan disediakan di prefix 'public' di bawah)

// ============================================================
// ======================= AUTH ROUTES ========================
// ============================================================
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-superadmin', [AuthController::class, 'verifySuperAdmin']);
    Route::post('/resend-superadmin-code', [AuthController::class, 'resendSuperAdminCode']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth.token');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth.token');
    Route::get('/status', [AuthController::class, 'status'])->middleware('auth.token');
});

// ============================================================
// =================== ADMIN AREA (TOKEN) =====================
// ============================================================
Route::middleware('auth.token')->group(function () {
    // Dashboard
    Route::get('/dashboard/enhanced', [DashboardController::class, 'enhanced']);

    // Orders & Customers
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::delete('/orders/{id}', [AdminOrderController::class, 'destroy']);

    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/customers/pending/count', [AdminCustomerController::class, 'pendingCount']);
    Route::put('/customers/{id}/status', [AdminCustomerController::class, 'updateStatus']);

    // Reviews
    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::post('/reviews/{id}', [AdminReviewController::class, 'action']);
    Route::post('/reviews/{id}/delete', [AdminReviewController::class, 'delete']);

    // Promotions analytics
    Route::get('/promotions/analytics', [AdminPromotionsController::class, 'analytics']);

    // Products (for dropdowns etc.)
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::get('/products/{id}', [AdminProductController::class, 'show']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    // Vouchers list (admin)
    Route::get('/vouchers', [AdminVoucherController::class, 'index']);
    Route::get('/vouchers/{id}', [AdminVoucherController::class, 'show']);
    Route::post('/vouchers', [AdminVoucherController::class, 'store']);
    Route::put('/vouchers/{id}', [AdminVoucherController::class, 'update']);
    Route::delete('/vouchers/{id}', [AdminVoucherController::class, 'destroy']);

    // Widgets (admin)
    Route::get('/widgets', [AdminWidgetController::class, 'index']);
    Route::post('/widgets', [AdminWidgetController::class, 'store']);
    Route::put('/widgets/{id}', [AdminWidgetController::class, 'update']);
    Route::delete('/widgets/{id}', [AdminWidgetController::class, 'destroy']);
    Route::get('/widgets/banner', [AdminWidgetController::class, 'getBanner']);
    Route::post('/widgets/banner', [AdminWidgetController::class, 'uploadBanner']);

    // Upload (multipart images)
    Route::post('/upload', [AdminUploadController::class, 'upload']);

    // Reports & Analytics
    Route::get('/reports/best-sellers', [AdminAnalyticsController::class, 'bestSellers']);
    Route::get('/analytics', [AdminAnalyticsController::class, 'analyticsSummary']);
    Route::get('/analytics/product-sales', [AdminAnalyticsController::class, 'productSales']);
    Route::get('/analytics/category-sales', [AdminAnalyticsController::class, 'categorySales']);
    Route::get('/analytics/sales-trend', [AdminAnalyticsController::class, 'salesTrend']);
    Route::get('/analytics/monthly-profit-loss', [AdminAnalyticsController::class, 'monthlyProfitLoss']);
    Route::get('/analytics/monthly-bestsellers', [AdminAnalyticsController::class, 'monthlyBestsellers']);

    // Product Discounts CRUD
    Route::get('/product-discounts', [AdminProductDiscountController::class, 'index']);
    Route::get('/product-discounts/{id}', [AdminProductDiscountController::class, 'show']);
    Route::post('/product-discounts', [AdminProductDiscountController::class, 'store']);
    Route::put('/product-discounts/{id}', [AdminProductDiscountController::class, 'update']);
    Route::delete('/product-discounts/{id}', [AdminProductDiscountController::class, 'destroy']);

    // Product Vouchers CRUD (uses product_vouchers table)
    Route::get('/product-vouchers', [AdminProductVoucherController::class, 'index']);
    Route::get('/product-vouchers/{id}', [AdminProductVoucherController::class, 'show']);
    Route::post('/product-vouchers', [AdminProductVoucherController::class, 'store']);
    Route::put('/product-vouchers/{id}', [AdminProductVoucherController::class, 'update']);
    Route::delete('/product-vouchers/{id}', [AdminProductVoucherController::class, 'destroy']);

    // Flash Sales CRUD
    Route::get('/flash-sales', [AdminFlashSaleController::class, 'index']);
    Route::get('/flash-sales/{id}', [AdminFlashSaleController::class, 'show']);
    Route::post('/flash-sales', [AdminFlashSaleController::class, 'store']);
    Route::put('/flash-sales/{id}', [AdminFlashSaleController::class, 'update']);
    Route::delete('/flash-sales/{id}', [AdminFlashSaleController::class, 'destroy']);

    // Free Shipping CRUD
    Route::get('/free-shipping', [AdminFreeShippingController::class, 'index']);
    Route::get('/free-shipping/{id}', [AdminFreeShippingController::class, 'show']);
    Route::post('/free-shipping', [AdminFreeShippingController::class, 'store']);
    Route::put('/free-shipping/{id}', [AdminFreeShippingController::class, 'update']);
    Route::delete('/free-shipping/{id}', [AdminFreeShippingController::class, 'destroy']);

    // Categories (Admin)
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::get('/categories/{id}', [AdminCategoryController::class, 'show']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);
    Route::get('/categories/test', [AdminCategoryController::class, 'test']);
    Route::post('/categories/init', [AdminCategoryController::class, 'init']);

    // Admin management
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::post('/admin/users', [AdminUserController::class, 'store']);
    Route::put('/admin/users/{id}', [AdminUserController::class, 'update']);
    Route::patch('/admin/users/{id}/status', [AdminUserController::class, 'toggleStatus']);
    Route::delete('/admin/users/{id}', [AdminUserController::class, 'destroy']);

    // Featured products (Best Sellers publishing to user page)
    Route::get('/featured-products', [AdminFeaturedProductController::class, 'index']);
    Route::post('/featured-products', [AdminFeaturedProductController::class, 'store']);
    Route::delete('/featured-products/{id}', [AdminFeaturedProductController::class, 'destroy']);
});

// ============================================================
// ========== PUBLIC ENDPOINTS UNTUK MOBILE / USER ============
// ============================================================
Route::prefix('public')->group(function () {
    Route::get('/products', [PublicApiController::class, 'products']);
    Route::get('/top-products', [PublicApiController::class, 'topProducts']);
    Route::get('/widgets', [PublicApiController::class, 'widgets']);
    Route::get('/vouchers', [PublicApiController::class, 'vouchers']);
    Route::get('/flash-sales', [PublicApiController::class, 'flashSales']);
    Route::get('/free-shipping', [PublicApiController::class, 'freeShipping']);

    Route::post('/orders', [PublicApiController::class, 'createOrder']);
    Route::get('/orders', [PublicApiController::class, 'listOrders']);
    Route::post('/orders/{id}/complete', [PublicApiController::class, 'completeOrder']);

    Route::post('/reviews', [PublicApiController::class, 'upsertReview']);
    Route::get('/reviews', [PublicApiController::class, 'listReviews']);

    Route::get('/categories', [PublicApiController::class, 'categories']);

    // Status akun customer (dipakai Flutter /pending_approval + auto refresh)
    Route::get('/customer-status', [AdminCustomerController::class, 'statusForMobile']);

    // (opsional) daftar pelanggan publik (kalau memang mau)
    Route::get('/customers', [AdminCustomerController::class, 'index']);
});

// ============================================================
// =================== API FALLBACK HANDLER ===================
// ============================================================
Route::any('/{any}', function () {
    return response()->json(['success' => false, 'message' => 'API endpoint not found'], 404);
})->where('any', '.*');