#!/bin/sh
set -e

# Listen on $PORT when the platform provides one.
if [ -n "$PORT" ]; then
    sed -i "s/Listen 80/Listen $PORT/g" /etc/apache2/ports.conf
    sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/g" /etc/apache2/sites-available/*.conf
fi

# config/database.php picks up DB_URL, DATABASE_URL or POSTGRES_URL (Vercel's Neon integration).
if [ -z "${DB_URL:-${DATABASE_URL:-${POSTGRES_URL:-}}}" ] && [ -z "$DB_HOST" ]; then
    echo "ERROR: no database configured. Connect a Neon database in Vercel → Storage, then redeploy."
fi

# APP_KEY is optional here: without one, derive a stable key from the database URL so every
# container agrees. (The API uses Sanctum tokens stored in the database, not encrypted cookies.)
if [ -z "$APP_KEY" ]; then
    APP_KEY="$(php -r '$s = getenv("DB_URL") ?: getenv("DATABASE_URL") ?: getenv("POSTGRES_URL") ?: random_bytes(32); echo "base64:".base64_encode(hash("sha256", "saanj-garva|".$s, true));')"
    export APP_KEY
fi

php artisan config:cache || true
php artisan route:cache || true

# Cache files were written as root; Apache runs as www-data.
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
