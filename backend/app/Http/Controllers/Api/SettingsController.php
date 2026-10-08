<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\SettingsRequest;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly SettingsService $settings) {}

    public function show(): JsonResponse
    {
        return $this->ok($this->settings->present());
    }

    public function update(SettingsRequest $request): JsonResponse
    {
        $this->settings->update($request->validated());

        return $this->ok($this->settings->present(), __('messages.saved'));
    }

    /** Logo is stored as a data URI (max 300 KB) so it works on stateless hosting. */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'file', 'mimes:png,jpg,jpeg,webp,svg', 'max:300'],
        ]);
        $file = $request->file('logo');
        $mime = $file->getMimeType() === 'image/svg' ? 'image/svg+xml' : $file->getMimeType();
        $this->settings->update(['logo' => 'data:'.$mime.';base64,'.base64_encode($file->get())]);

        return $this->ok($this->settings->present(), __('messages.saved'));
    }

    public function removeLogo(): JsonResponse
    {
        $this->settings->update(['logo' => '']);

        return $this->ok($this->settings->present(), __('messages.saved'));
    }
}
