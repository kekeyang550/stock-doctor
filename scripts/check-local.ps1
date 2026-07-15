param(
    [string]$BackendUrl = "http://127.0.0.1:8010",
    [string]$FrontendUrl = "http://127.0.0.1:30080",
    [switch]$Strict
)

$ErrorActionPreference = "Stop"
$script:Failures = 0
$script:Warnings = 0

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
}
catch {
    # Keep the script compatible with older hosts that do not allow output encoding changes.
}

function Write-Check {
    param(
        [ValidateSet("OK", "WARN", "FAIL", "INFO")]
        [string]$Status,
        [string]$Name,
        [string]$Detail
    )

    $color = switch ($Status) {
        "OK" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
        default { "Cyan" }
    }

    if ($Status -eq "WARN") {
        $script:Warnings += 1
    }
    if ($Status -eq "FAIL") {
        $script:Failures += 1
    }

    Write-Host ("[{0}] {1} - {2}" -f $Status, $Name, $Detail) -ForegroundColor $color
}

function Get-CommandPath {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        return $null
    }
    return $command.Source
}

function Get-CommandVersion {
    param(
        [string]$CommandPath,
        [string[]]$Arguments
    )

    try {
        $output = & $CommandPath @Arguments 2>&1
        return ($output | Select-Object -First 1).ToString().Trim()
    }
    catch {
        return $null
    }
}

function Test-ListeningPort {
    param([int]$Port)

    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        return $null -ne $connection
    }
    catch {
        $netstat = netstat -ano | Select-String -Pattern (":{0}\s+.*LISTENING" -f $Port)
        return $null -ne $netstat
    }
}

function Invoke-JsonProbe {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $response = Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 8
        Write-Check "OK" $Name "endpoint is reachable"
        return $response
    }
    catch {
        Write-Check "WARN" $Name ("endpoint is not reachable: {0}" -f $_.Exception.Message)
        return $null
    }
}

function Format-ReadinessCheck {
    param([object]$Check)

    $status = "INFO"
    if ($Check.status -eq "pass") {
        $status = "OK"
    }
    elseif ($Check.status -eq "warn") {
        $status = "WARN"
    }
    elseif ($Check.status -eq "fail") {
        $status = "FAIL"
    }

    $checkName = $Check.key
    if (-not $checkName) {
        $checkName = $Check.label
    }

    Write-Check $status ("Backend readiness: {0}" -f $checkName) ("status={0}" -f $Check.status)
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "Stock Doctor local delivery check" -ForegroundColor Cyan
Write-Host ("Repository: {0}" -f $repoRoot)
Write-Host ""

if (Test-Path $backendDir) {
    Write-Check "OK" "Backend directory" $backendDir
}
else {
    Write-Check "FAIL" "Backend directory" "backend directory was not found"
}

if (Test-Path $frontendDir) {
    Write-Check "OK" "Frontend directory" $frontendDir
}
else {
    Write-Check "FAIL" "Frontend directory" "frontend directory was not found"
}

$backendProject = Join-Path $backendDir "pyproject.toml"
$frontendPackage = Join-Path $frontendDir "package.json"

if (Test-Path $backendProject) {
    Write-Check "OK" "Backend project file" "pyproject.toml exists"
}
else {
    Write-Check "FAIL" "Backend project file" "pyproject.toml does not exist"
}

if (Test-Path $frontendPackage) {
    Write-Check "OK" "Frontend project file" "package.json exists"
}
else {
    Write-Check "FAIL" "Frontend project file" "package.json does not exist"
}

$pythonCandidates = @(
    (Join-Path $backendDir ".venv\Scripts\python.exe"),
    (Join-Path $repoRoot ".venv\Scripts\python.exe")
) | Where-Object { Test-Path $_ }

$pythonPath = $pythonCandidates | Select-Object -First 1
if (-not $pythonPath) {
    $pythonPath = Get-CommandPath "python"
}

if ($pythonPath) {
    $pythonVersion = Get-CommandVersion $pythonPath @("--version")
    Write-Check "OK" "Python" ("{0} ({1})" -f $pythonVersion, $pythonPath)

    try {
        Push-Location $backendDir
        & $pythonPath -c "import fastapi, uvicorn, requests; import app.main" | Out-Null
        Write-Check "OK" "Backend dependencies" "FastAPI, Uvicorn, requests, and app.main can be imported"
    }
    catch {
        Write-Check "WARN" "Backend dependencies" ("backend dependencies are not fully importable in this Python environment: {0}" -f $_.Exception.Message)
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Check "FAIL" "Python" "python was not found; install Python 3.12+ or create backend\.venv"
}

$nodePath = Get-CommandPath "node"
if ($nodePath) {
    $nodeVersion = Get-CommandVersion $nodePath @("--version")
    Write-Check "OK" "Node.js" ("{0} ({1})" -f $nodeVersion, $nodePath)
}
else {
    Write-Check "FAIL" "Node.js" "node was not found"
}

$npmPath = Get-CommandPath "npm"
if ($npmPath) {
    $npmVersion = Get-CommandVersion $npmPath @("--version")
    Write-Check "OK" "npm" ("{0} ({1})" -f $npmVersion, $npmPath)
}
else {
    Write-Check "FAIL" "npm" "npm was not found"
}

$frontendModules = Join-Path $frontendDir "node_modules"
if (Test-Path $frontendModules) {
    Write-Check "OK" "Frontend dependencies" "node_modules exists"
}
else {
    Write-Check "WARN" "Frontend dependencies" "node_modules does not exist; run npm install in frontend"
}

$backendUri = [Uri]$BackendUrl
$frontendUri = [Uri]$FrontendUrl
$backendListening = Test-ListeningPort $backendUri.Port
$frontendListening = Test-ListeningPort $frontendUri.Port

if ($backendListening) {
    Write-Check "OK" "Backend port" ("{0} is listening" -f $backendUri.Port)
}
else {
    Write-Check "WARN" "Backend port" ("{0} is not listening; start with: cd backend; python -m uvicorn app.main:app --host 127.0.0.1 --port {0}" -f $backendUri.Port)
}

if ($frontendListening) {
    Write-Check "OK" "Frontend port" ("{0} is listening" -f $frontendUri.Port)
}
else {
    Write-Check "WARN" "Frontend port" ("{0} is not listening; start with: cd frontend; npm run dev -- --host 127.0.0.1 --port {0}" -f $frontendUri.Port)
}

$backendBase = $BackendUrl.TrimEnd("/")
$frontendBase = $FrontendUrl.TrimEnd("/")

$health = Invoke-JsonProbe "Backend health API" ("{0}/api/v1/health" -f $backendBase)
if ($health -and $health.status) {
    Write-Check "OK" "Backend health status" ("status={0}" -f $health.status)
}

$readiness = Invoke-JsonProbe "System readiness API" ("{0}/api/v1/system/readiness" -f $backendBase)
if ($readiness) {
    $checkCount = 0
    if ($readiness.checks) {
        $checkCount = $readiness.checks.Count
    }
    Write-Check "INFO" "System readiness" ("score={0}, status={1}, checks={2}" -f $readiness.score, $readiness.status, $checkCount)
    foreach ($check in $readiness.checks) {
        Format-ReadinessCheck $check
    }
}

$runtime = Invoke-JsonProbe "Runtime config API" ("{0}/api/v1/system/runtime-config" -f $backendBase)
if ($runtime) {
    $provider = $runtime.active_provider
    if (-not $provider) {
        $provider = $runtime.provider
    }
    Write-Check "INFO" "Runtime config" ("provider={0}, timeout={1}s, cache_ttl={2}s, freshness={3}min" -f $provider, $runtime.request_timeout_seconds, $runtime.cache_ttl_seconds, $runtime.freshness_stale_after_minutes)
    if ($runtime.auto_refresh) {
        Write-Check "INFO" "Auto refresh" ("enabled={0}, scope={1}, interval={2}min, run_on_startup={3}" -f $runtime.auto_refresh.enabled, $runtime.auto_refresh.scope, $runtime.auto_refresh.interval_minutes, $runtime.auto_refresh.run_on_startup)
    }
    if ($runtime.secrets) {
        foreach ($secret in $runtime.secrets) {
            Write-Check "INFO" ("Optional integration {0}" -f $secret.label) ("configured={0}" -f $secret.configured)
        }
    }
}

try {
    Invoke-WebRequest -Method Get -Uri $frontendBase -TimeoutSec 8 -UseBasicParsing | Out-Null
    Write-Check "OK" "Frontend page" "Vite page is reachable"
}
catch {
    Write-Check "WARN" "Frontend page" ("page is not reachable: {0}" -f $_.Exception.Message)
}

Write-Host ""
Write-Host ("Summary: {0} failure(s), {1} warning(s)" -f $script:Failures, $script:Warnings) -ForegroundColor Cyan

if ($script:Failures -gt 0) {
    Write-Host "Hard failures exist. Fix the FAIL items before handoff." -ForegroundColor Red
    exit 1
}

if ($Strict -and $script:Warnings -gt 0) {
    Write-Host "Strict mode treats warnings as a failing exit code." -ForegroundColor Yellow
    exit 1
}

Write-Host "Local delivery check complete." -ForegroundColor Green
