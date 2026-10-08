<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::put('auth/password', [AuthController::class, 'changePassword']);

    Route::get('settings', [SettingsController::class, 'show']);
    Route::put('settings', [SettingsController::class, 'update']);
    Route::post('settings/logo', [SettingsController::class, 'uploadLogo']);
    Route::delete('settings/logo', [SettingsController::class, 'removeLogo']);

    Route::get('dashboard', DashboardController::class);

    Route::apiResource('categories', CategoryController::class)->except('show');
    Route::apiResource('products', ProductController::class);

    // Inventory
    Route::get('store-stock', [StockController::class, 'store']);
    Route::post('store-stock/add', [StockController::class, 'add']);
    Route::get('shop-stock', [StockController::class, 'shop']);
    Route::get('purchases', [StockController::class, 'purchases']);
    Route::post('stock/transfer', [StockController::class, 'transfer']);
    Route::post('stock/adjust', [StockController::class, 'adjust']);
    Route::get('stock/adjustments', [StockController::class, 'adjustments']);
    Route::get('stock/movements', [StockController::class, 'movements']);

    // Sales
    Route::get('sales', [SaleController::class, 'index']);
    Route::post('sales', [SaleController::class, 'store']);
    Route::get('sales/{sale}', [SaleController::class, 'show']);
    Route::post('sales/{sale}/void', [SaleController::class, 'void']);

    // Customers / udhari
    Route::apiResource('customers', CustomerController::class);
    Route::get('customers/{customer}/ledger', [CustomerController::class, 'ledger']);
    Route::post('customers/{customer}/payment', [CustomerController::class, 'payment']);

    // Expenses
    Route::apiResource('expense-categories', ExpenseCategoryController::class)->except('show');
    Route::apiResource('expenses', ExpenseController::class)->except('show');

    // Reports & export
    Route::get('reports/sales', [ReportController::class, 'sales']);
    Route::get('reports/stock', [ReportController::class, 'stock']);
    Route::get('reports/profit-loss', [ReportController::class, 'profitLoss']);
    Route::get('reports/udhari', [ReportController::class, 'udhari']);
    Route::get('reports/expenses', [ReportController::class, 'expenses']);
    Route::get('export/{type}', ExportController::class);
});
