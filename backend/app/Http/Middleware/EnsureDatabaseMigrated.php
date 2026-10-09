<?php

namespace App\Http\Middleware;

use App\Models\Product;
use App\Models\User;
use Closure;
use Database\Seeders\DemoSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * With AUTO_MIGRATE on, brings the database up to date once per container: runs pending
 * migrations and seeds the owner account on an empty database. A failure is logged and
 * retried on the next request; it never blocks the current one.
 */
class EnsureDatabaseMigrated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('app.auto_migrate')) {
            $this->migrateOnce();
        }

        return $next($request);
    }

    private function migrateOnce(): void
    {
        $flag = storage_path('framework/database-migrated');
        if (is_file($flag)) {
            return;
        }

        try {
            set_time_limit(300);
            Artisan::call('migrate', ['--force' => true]);
            if (! User::query()->exists()) {
                Artisan::call('db:seed', ['--force' => true]);
            }
            if (config('app.demo_data') && ! Product::query()->exists()) {
                Artisan::call('db:seed', ['--class' => DemoSeeder::class, '--force' => true]);
            }
            file_put_contents($flag, now()->toIso8601String());
            @unlink(self::errorFile());
        } catch (Throwable $e) {
            Log::error('Automatic migration failed: '.$e->getMessage());
            @file_put_contents(self::errorFile(), $e->getMessage());
        }
    }

    /** Last failure, shown by /api/health (credentials never appear in these messages). */
    public static function lastError(): ?string
    {
        $message = @file_get_contents(self::errorFile());

        return $message === false ? null : mb_substr($message, 0, 500);
    }

    private static function errorFile(): string
    {
        return storage_path('framework/database-migration-error');
    }
}
