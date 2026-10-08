<?php

namespace App\Support;

/**
 * Exact decimal arithmetic for money (bcmath, strings). Never use floats for money.
 */
final class Money
{
    private const SCALE = 6;

    public static function add(string|int|float|null ...$values): string
    {
        $sum = '0';
        foreach ($values as $v) {
            $sum = bcadd($sum, self::norm($v), self::SCALE);
        }

        return $sum;
    }

    public static function sub(string|int|float|null $a, string|int|float|null $b): string
    {
        return bcsub(self::norm($a), self::norm($b), self::SCALE);
    }

    public static function mul(string|int|float|null $a, string|int|float|null $b): string
    {
        return bcmul(self::norm($a), self::norm($b), self::SCALE);
    }

    public static function div(string|int|float|null $a, string|int|float|null $b): string
    {
        $b = self::norm($b);
        if (bccomp($b, '0', self::SCALE) === 0) {
            return '0';
        }

        return bcdiv(self::norm($a), $b, self::SCALE);
    }

    public static function cmp(string|int|float|null $a, string|int|float|null $b): int
    {
        return bccomp(self::norm($a), self::norm($b), self::SCALE);
    }

    /** Round half away from zero to the given number of decimals. */
    public static function round(string|int|float|null $value, int $decimals = 2): string
    {
        $value = self::norm($value);
        $half = '0.'.str_repeat('0', $decimals).'5';
        $result = str_starts_with($value, '-')
            ? bcsub($value, $half, $decimals)
            : bcadd($value, $half, $decimals);

        // Avoid "-0.00".
        return bccomp($result, '0', $decimals) === 0 ? bcadd('0', '0', $decimals) : $result;
    }

    /** Percentage a/b*100 rounded to 1 decimal (0 when b is 0). */
    public static function percent(string|int|float|null $a, string|int|float|null $b): string
    {
        return self::round(self::mul(self::div($a, $b), '100'), 1);
    }

    private static function norm(string|int|float|null $v): string
    {
        if ($v === null || $v === '') {
            return '0';
        }
        if (is_float($v)) {
            // Floats only arrive from validated request input; format without scientific notation.
            return number_format($v, self::SCALE, '.', '');
        }

        return (string) $v;
    }
}
