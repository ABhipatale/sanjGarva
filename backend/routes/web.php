<?php

use Illuminate\Support\Facades\Route;

// API-only backend; the PWA is served separately (e.g. Vercel).
Route::get('/', fn () => response()->json(['app' => 'Sanj Garva API', 'status' => 'ok']));
