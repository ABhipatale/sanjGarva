<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A rule violation the user can understand and fix (e.g. insufficient stock).
 * Rendered as a localized JSON error with a machine-readable code.
 */
class BusinessException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        public readonly array $params = [],
        public readonly int $status = 422,
    ) {
        parent::__construct($errorCode);
    }

    public function localizedMessage(): string
    {
        return __('messages.'.$this->errorCode, $this->params);
    }
}
