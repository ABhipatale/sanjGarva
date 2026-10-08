<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Resolves ?period=today|yesterday|week|month|last_month|all or ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * into an inclusive [start, end] range in the app timezone.
 */
final class DateRange
{
    public function __construct(public readonly ?Carbon $from, public readonly ?Carbon $to) {}

    public static function fromRequest(Request $request, string $default = 'today'): self
    {
        $from = $request->query('from');
        $to = $request->query('to');

        if ($from || $to) {
            $start = $from ? self::parse($from)?->startOfDay() : null;
            $end = $to ? self::parse($to)?->endOfDay() : null;
            if ($start && $end && $start->gt($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }

            return new self($start, $end);
        }

        return self::period((string) $request->query('period', $default));
    }

    public static function period(string $period): self
    {
        $now = now();

        return match ($period) {
            'yesterday' => new self($now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()),
            'week' => new self($now->copy()->startOfWeek(), $now->copy()->endOfDay()),
            'month' => new self($now->copy()->startOfMonth(), $now->copy()->endOfDay()),
            'last_month' => new self($now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()),
            'all' => new self(null, null),
            default => new self($now->copy()->startOfDay(), $now->copy()->endOfDay()),
        };
    }

    public function toArray(): array
    {
        return [
            'from' => $this->from?->toDateString(),
            'to' => $this->to?->toDateString(),
        ];
    }

    private static function parse(string $value): ?Carbon
    {
        try {
            return Carbon::createFromFormat('Y-m-d', $value) ?: null;
        } catch (\Throwable) {
            return null;
        }
    }
}
