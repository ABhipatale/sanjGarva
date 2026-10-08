<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use RespondsWithJson;

    public function __invoke(ReportService $reports): JsonResponse
    {
        return $this->ok($reports->dashboard());
    }
}
