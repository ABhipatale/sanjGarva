<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Key/value business settings with defaults and a small cache.
 */
class SettingsService
{
    public const DEFAULTS = [
        'bar_name' => 'Sanj Garva',
        'bar_name_mr' => 'संज गरवा',
        'phone' => '',
        'address' => '',
        'gstin' => '',
        'currency' => '₹',
        'low_stock_default' => '5',
        'logo' => '', // data URI; kept in DB so it survives stateless/ephemeral hosting
    ];

    private const CACHE_KEY = 'app_settings';

    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $stored = Setting::query()->pluck('value', 'key')->all();

            return array_merge(self::DEFAULTS, array_intersect_key($stored, self::DEFAULTS));
        });
    }

    public function get(string $key): ?string
    {
        return $this->all()[$key] ?? null;
    }

    public function update(array $values): array
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => (string) ($value ?? '')]);
        }
        Cache::forget(self::CACHE_KEY);

        return $this->all();
    }

    /** Public representation (logo as logo_url). */
    public function present(): array
    {
        $all = $this->all();
        $all['logo_url'] = $all['logo'] ?: null;
        unset($all['logo']);
        $all['low_stock_default'] = (int) $all['low_stock_default'];

        return $all;
    }
}
