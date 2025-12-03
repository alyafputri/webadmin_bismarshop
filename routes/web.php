<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\CustomerAddressController;

Route::get('/', function () {
    return redirect('/login.html');
});

// Admin customer addresses endpoints
Route::prefix('admin')->group(function () {
    Route::get('/customers/{user}/addresses', [CustomerAddressController::class, 'index']);
    Route::post('/customers/{user}/addresses', [CustomerAddressController::class, 'store']);
    Route::post('/customers/{user}/addresses/{address}/default', [CustomerAddressController::class, 'setDefault']);
    Route::delete('/customers/{user}/addresses/{address}', [CustomerAddressController::class, 'destroy']);
});