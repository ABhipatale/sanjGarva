<#
.SYNOPSIS
  Loads the Saanj Garva demo data (beer/liquor products with stock, customers, sales, expenses)
  into a PostgreSQL database such as the app's Neon database on Vercel.

.EXAMPLE
  .\scripts\seed-demo.ps1 "postgresql://neondb_owner:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require"

.NOTES
  Copy the URL from Vercel -> Storage -> your Neon database -> .env.local -> Show secret.
  Safe to run more than once. Needs PHP with pdo_pgsql (enabled in XAMPP's php.ini).
  Do NOT run it against a live bar's database.
#>
param(
    [Parameter(Mandatory = $true, HelpMessage = 'PostgreSQL connection URL (DATABASE_URL)')]
    [string]$DatabaseUrl
)

$ErrorActionPreference = 'Stop'

if ($DatabaseUrl -notmatch '^(postgres(?:ql)?)://([^:]+):([^@]+)@([^/:?]+)(:\d+)?/([^?]+)(\?.*)?$') {
    throw 'Not a PostgreSQL URL. Expected postgresql://user:password@host/database?sslmode=require'
}
$user = $Matches[2]; $password = $Matches[3]; $hostName = $Matches[4]; $port = $Matches[5]; $database = $Matches[6]

# Use Neon's direct host (no "-pooler"); the pooler breaks PDO transactions.
$hostName = $hostName -replace '-pooler\.', '.'

# Older libpq builds (such as XAMPP's) cannot send Neon's endpoint ID via SNI, so pass it in the password.
if ($hostName -like '*.neon.tech' -and $password -notlike 'endpoint*') {
    $endpointId = $hostName.Split('.')[0]
    $password = "endpoint%3D$endpointId%3B$password"
}

$url = "postgresql://${user}:${password}@${hostName}${port}/${database}?sslmode=require"

Push-Location (Join-Path $PSScriptRoot '..\backend')
try {
    $env:DB_CONNECTION = 'pgsql'
    $env:DB_URL = $url

    Write-Host "Database: $hostName/$database"
    Write-Host 'Creating/updating tables...'
    php artisan migrate --force
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed (see the error above).' }

    Write-Host 'Loading demo data...'
    php artisan db:seed --class=DemoSeeder --force
    if ($LASTEXITCODE -ne 0) { throw 'Loading demo data failed (see the error above).' }

    Write-Host 'Done. Refresh the app to see the demo products, stock, customers and sales.' -ForegroundColor Green
}
finally {
    Remove-Item Env:DB_CONNECTION, Env:DB_URL -ErrorAction SilentlyContinue
    Pop-Location
}
