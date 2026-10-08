<?php

use Illuminate\Support\Facades\Route;

// API-only backend; the PWA is served separately (e.g. Vercel).
Route::get('/', fn () => response()->json(['app' => 'Saanj Garva API', 'status' => 'ok']));
