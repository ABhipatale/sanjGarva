<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use RespondsWithJson;

    public function login(LoginRequest $request): JsonResponse
    {
        $login = trim($request->string('login'));
        $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'mobile';
        $user = User::where($field, $field === 'email' ? mb_strtolower($login) : $login)->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            Log::notice('Failed login attempt', ['login' => $login, 'ip' => $request->ip()]);
            throw ValidationException::withMessages(['login' => __('messages.invalid_login')]);
        }

        $remember = $request->boolean('remember');
        $expiresAt = $remember ? now()->addDays(30) : now()->addHours(16);
        $token = $user->createToken('pwa', ['*'], $expiresAt)->plainTextToken;

        return $this->ok([
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok($this->userPayload($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->ok(null, __('messages.logged_out'));
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->password = $request->string('password');
        $user->save();
        // Sign out other devices.
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return $this->ok(null, __('messages.password_changed'));
    }

    private function userPayload(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'mobile' => $user->mobile];
    }
}
