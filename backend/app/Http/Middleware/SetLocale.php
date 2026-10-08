<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Uses the X-Locale header (or Accept-Language) to pick English or Marathi messages.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('X-Locale') ?: $request->getPreferredLanguage(['mr', 'en']);
        app()->setLocale(in_array($locale, ['mr', 'en'], true) ? $locale : 'en');

        return $next($request);
    }
}
