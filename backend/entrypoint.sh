#!/bin/sh
set -e

# Listen on $PORT when the platform provides one.
if [ -n "$PORT" ]; then
    sed -i "s/Listen 80/Listen $PORT/g" /etc/apache2/ports.conf
    sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/g" /etc/apache2/sites-available/*.conf
fi

# Vercel's Neon integration provides DATABASE_URL (or POSTGRES_URL); Laravel reads DB_URL.
DB_URL="${DB_URL:-${DATABASE_URL:-${POSTGRES_URL:-}}}"
if [ -n "$DB_URL" ]; then
    export DB_URL
    export DB_CONNECTION="${DB_CONNECTION:-pgsql}"
fi

if [ -z "$APP_KEY" ]; then
    echo "WARNING: APP_KEY is not set; generating a temporary key. Set APP_KEY in Vercel so logins survive restarts."
    export APP_KEY="$(php artisan key:generate --show)"
fi

if [ -n "$DB_URL" ] || { [ -n "$DB_HOST" ] && [ "$DB_HOST" != "127.0.0.1" ] && [ "$DB_HOST" != "localhost" ]; }; then
    echo "Running migrations..."
    if php artisan migrate --force; then
        php artisan db:seed --force || echo "WARNING: db:seed failed."
    else
        echo "ERROR: migrations failed. Check the database URL and credentials."
    fi
else
    echo "ERROR: no database configured. Connect a Neon database so DATABASE_URL is set."
fi

php artisan config:cache || true
php artisan route:cache || true

# Cached files were written as root; Apache runs as www-data.
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
