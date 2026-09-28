$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiBase = if ($env:AXIOMA_API_BASE) { $env:AXIOMA_API_BASE.TrimEnd('/') } else { 'http://localhost:5000/api' }
$frontendUrl = if ($env:AXIOMA_FRONTEND_URL) { $env:AXIOMA_FRONTEND_URL.TrimEnd('/') } else { 'http://localhost:5174' }
$demoEmail = if ($env:AXIOMA_DEMO_EMAIL) { $env:AXIOMA_DEMO_EMAIL } else { 'admin@fraud.local' }
$demoPassword = if ($env:AXIOMA_DEMO_PASSWORD) { $env:AXIOMA_DEMO_PASSWORD } else { 'Admin@12345' }
$demoUsername = if ($env:AXIOMA_DEMO_USERNAME) { $env:AXIOMA_DEMO_USERNAME } else { 'admin' }
$intervalSeconds = if ($env:AXIOMA_DEMO_INTERVAL) { [Math]::Max(1, [int]$env:AXIOMA_DEMO_INTERVAL) } else { 2 }
$isWindows = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
$backendProcess = $null
$frontendProcess = $null
$tempDirectory = [System.IO.Path]::GetTempPath()

function Test-TcpPort {
    param([int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $pending = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $pending.AsyncWaitHandle.WaitOne(750)) { return $false }
        $client.EndConnect($pending)
        return $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Test-BackendReady {
    try {
        $null = Invoke-WebRequest -Uri "$apiBase/auth/login" -Method Get -TimeoutSec 2
        return $false
    }
    catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 405) {
            return $true
        }
        return $false
    }
}

function Stop-OwnedProcess {
    param($Process)

    if ($null -eq $Process) { return }
    try {
        if (-not $Process.HasExited) {
            try { $Process.Kill($true) } catch { $Process.Kill() }
            $Process.WaitForExit(5000)
        }
    }
    catch {
        Write-Warning "Could not stop process $($Process.Id): $($_.Exception.Message)"
    }
}

function Submit-DemoTransaction {
    param(
        [hashtable]$Transaction,
        [string]$Token
    )

    try {
        $body = ConvertTo-Json -InputObject $Transaction -Depth 6 -Compress
        $response = Invoke-RestMethod -Uri "$apiBase/transactions" -Method Post `
            -Headers @{ Authorization = "Bearer $Token" } `
            -ContentType 'application/json' -Body $body -TimeoutSec 20

        if ($null -eq $response.transaction) {
            Write-Warning "Request rejected: $($response.message)"
            return
        }

        $saved = $response.transaction
        $status = if ($saved.is_fraud_predicted) { 'FLAGGED' } else { 'approved' }
        Write-Host ("TX #{0} | INR {1:N2} | {2} | {3} | {4} (risk {5:N2})" -f `
            $saved.id, $saved.amount, $saved.channel, $saved.merchant_name, $status, $saved.fraud_score)
    }
    catch {
        Write-Warning "Transaction request failed: $($_.Exception.Message)"
    }
}

try {
    Write-Host '=== AXIOMA Real-time Fraud Demo ==='

    if (-not (Test-TcpPort -Port 5000)) {
        $backendDirectory = Join-Path $repoRoot 'backend'
        $pythonCandidates = @(
            (Join-Path $backendDirectory 'venv/Scripts/python.exe'),
            (Join-Path $backendDirectory 'venv/bin/python')
        )
        $pythonPath = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
        if (-not $pythonPath) {
            $pythonCommand = Get-Command python, python3 -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($pythonCommand) { $pythonPath = $pythonCommand.Source }
        }
        if (-not $pythonPath) { throw 'Python was not found. Install Python or create backend/venv.' }

        Write-Host 'Starting backend...'
        $backendProcess = Start-Process -FilePath $pythonPath -ArgumentList @('run.py') `
            -WorkingDirectory $backendDirectory -PassThru `
            -RedirectStandardOutput (Join-Path $tempDirectory 'axioma-demo-backend.log') `
            -RedirectStandardError (Join-Path $tempDirectory 'axioma-demo-backend-error.log')
    }
    else {
        Write-Host 'Backend already running; leaving it untouched.'
    }

    if (-not (Test-TcpPort -Port 5174)) {
        $frontendDirectory = Join-Path $repoRoot 'frontend'
        $npmCommand = if ($isWindows) { Get-Command npm.cmd -ErrorAction SilentlyContinue } else { Get-Command npm -ErrorAction SilentlyContinue }
        if (-not $npmCommand) { throw 'npm was not found. Install Node.js before running the demo.' }

        Write-Host 'Starting frontend...'
        $frontendProcess = Start-Process -FilePath $npmCommand.Source `
            -ArgumentList @('run', 'dev', '--', '--host', '0.0.0.0') `
            -WorkingDirectory $frontendDirectory -PassThru `
            -RedirectStandardOutput (Join-Path $tempDirectory 'axioma-demo-frontend.log') `
            -RedirectStandardError (Join-Path $tempDirectory 'axioma-demo-frontend-error.log')
    }
    else {
        Write-Host 'Frontend port 5174 already in use; leaving it untouched.'
    }

    Write-Host 'Waiting for backend...'
    $backendReady = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Test-BackendReady) {
            $backendReady = $true
            break
        }
        if ($backendProcess -and $backendProcess.HasExited) { break }
        Start-Sleep -Seconds 1
    }
    if (-not $backendReady) {
        throw "Backend did not become ready. Check $(Join-Path $tempDirectory 'axioma-demo-backend-error.log')."
    }

    $registration = @{
        email = $demoEmail
        username = $demoUsername
        password = $demoPassword
    } | ConvertTo-Json -Compress
    try {
        $null = Invoke-RestMethod -Uri "$apiBase/auth/register" -Method Post `
            -ContentType 'application/json' -Body $registration -TimeoutSec 10
    }
    catch {
        # The demo account may already exist; login below is the definitive check.
    }

    $loginBody = @{ email = $demoEmail; password = $demoPassword } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Uri "$apiBase/auth/login" -Method Post `
        -ContentType 'application/json' -Body $loginBody -TimeoutSec 10
    $token = $login.access_token
    if (-not $token) { throw 'Demo login did not return an access token.' }

    $seedTransactions = @(
        @{ customer_id = 'CUST001'; merchant_id = 'MERCH001'; card_id = 'CARD001'; card_last4 = '1001'; card_network = 'Visa'; amount = 120.50; merchant_name = 'Coffee Shop'; merchant_bank = 'HDFC Bank'; merchant_location = 'Mumbai'; category = 'food'; channel = 'Card'; currency = 'INR'; ip_address = '203.0.113.10'; device_id = 'dev-001' },
        @{ customer_id = 'CUST002'; merchant_id = 'MERCH002'; card_id = 'CARD002'; card_last4 = '2002'; card_network = 'RuPay'; amount = 45000; merchant_name = 'Luxury Watches'; merchant_bank = 'ICICI Bank'; merchant_location = 'Delhi'; category = 'shopping'; channel = 'Card'; currency = 'INR'; ip_address = '198.51.100.22'; device_id = 'dev-002' },
        @{ customer_id = 'CUST001'; merchant_id = 'MERCH003'; card_id = ''; amount = 5.99; merchant_name = 'Grocery'; merchant_bank = 'State Bank of India'; merchant_location = 'Mumbai'; category = 'food'; channel = 'UPI'; upi_id = 'demo@okaxis'; payer_bank = 'Axis Bank'; currency = 'INR'; ip_address = '203.0.113.10'; device_id = 'dev-001' },
        @{ customer_id = 'CUST003'; merchant_id = 'MERCH004'; card_id = ''; amount = 2500; merchant_name = 'Electronics Hub'; merchant_bank = 'Kotak Mahindra Bank'; merchant_location = 'Bengaluru'; category = 'electronics'; channel = 'Net Banking'; currency = 'INR'; ip_address = '192.0.2.45'; device_id = 'dev-003' }
    )

    Write-Host 'Seeding demo transactions...'
    foreach ($transaction in $seedTransactions) {
        Submit-DemoTransaction -Transaction $transaction -Token $token
        Start-Sleep -Milliseconds 500
    }

    Write-Host ''
    Write-Host "Open $frontendUrl and log in with $demoEmail / $demoPassword"
    Write-Host "Keep the dashboard open. New INR transactions arrive every $($intervalSeconds)s."
    Write-Host 'UPI, card, and net-banking payments use Indian bank and network details.'
    Write-Host 'Press Ctrl+C to stop the stream and services started by this script.'
    Write-Host ''

    $merchants = @('Cedar Cafe', 'Metro Mart', 'Lotus Electronics', 'Indigo Books', 'Riverfront Hotel', 'City Pharmacy')
    $categories = @('food', 'groceries', 'electronics', 'books', 'travel', 'health')
    $customers = @('CUST1001', 'CUST1002', 'CUST1003', 'CUST1004', 'CUST1005')
    $banks = @('State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank')
    $cities = @('Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Chennai', 'Pune')
    $sequence = 0

    while ($true) {
        $sequence++
        $index = ($sequence - 1) % $merchants.Count
        $customerIndex = ($sequence - 1) % $customers.Count
        $bankIndex = ($sequence - 1) % $banks.Count
        $amount = Get-Random -Minimum 10 -Maximum 50010
        if ((Get-Random -Minimum 0 -Maximum 5) -eq 0) {
            $amount = Get-Random -Minimum 50000 -Maximum 150000
        }

        $transaction = @{
            customer_id = $customers[$customerIndex]
            merchant_id = 'MERCH{0:D3}' -f ($index + 1)
            card_id = ''
            card_last4 = ''
            card_network = ''
            amount = [double]$amount
            merchant_name = $merchants[$index]
            merchant_bank = $banks[$bankIndex]
            merchant_location = $cities[$index]
            category = $categories[$index]
            channel = ''
            currency = 'INR'
            upi_id = ''
            payer_bank = ''
        }

        switch ($sequence % 3) {
            0 {
                $transaction.channel = 'UPI'
                $transaction.upi_id = "demo$sequence@okaxis"
                $transaction.payer_bank = $banks[$bankIndex]
            }
            1 {
                $transaction.channel = 'Card'
                $transaction.card_id = 'CARD{0:D3}' -f ($customerIndex + 1)
                $transaction.card_last4 = '{0:D4}' -f ($sequence % 10000)
                $networkIndex = [int][Math]::Floor(($sequence - 1) / 3) % 3
                $transaction.card_network = @('Visa', 'RuPay', 'Mastercard')[$networkIndex]
            }
            default { $transaction.channel = 'Net Banking' }
        }

        Submit-DemoTransaction -Transaction $transaction -Token $token
        Start-Sleep -Seconds $intervalSeconds
    }
}
finally {
    Write-Host 'Stopping services started by this demo...'
    Stop-OwnedProcess -Process $frontendProcess
    Stop-OwnedProcess -Process $backendProcess
    Write-Host 'Demo stopped.'
}
