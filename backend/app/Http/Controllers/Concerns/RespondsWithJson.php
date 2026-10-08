<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Consistent response envelope: { success, data, message?, meta? }.
 */
trait RespondsWithJson
{
    protected function ok(mixed $data = null, ?string $message = null, int $status = 200, array $meta = []): JsonResponse
    {
        $body = ['success' => true, 'data' => $data];
        if ($message !== null) {
            $body['message'] = $message;
        }
        if ($meta) {
            $body['meta'] = $meta;
        }

        return response()->json($body, $status);
    }

    protected function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return $this->ok($data, $message, 201);
    }

    /**
     * @param  class-string<\Illuminate\Http\Resources\Json\JsonResource>  $resource
     */
    protected function paginated(LengthAwarePaginator $paginator, string $resource, array $extraMeta = []): JsonResponse
    {
        return $this->ok(
            $resource::collection($paginator->getCollection())->resolve(),
            null,
            200,
            array_merge([
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ], $extraMeta),
        );
    }

    protected function perPage(int $default = 20): int
    {
        return max(1, min(100, (int) request('per_page', $default)));
    }
}
