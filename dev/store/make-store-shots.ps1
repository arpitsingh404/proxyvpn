# Renders the Chrome Web Store screenshots (1280x800) from dev/store/template.html.
# Run:  powershell -ExecutionPolicy Bypass -File .\dev\store\make-store-shots.ps1

$ErrorActionPreference = "Continue"
$store = $PSScriptRoot
$dev = Split-Path -Parent $store
$root = Split-Path -Parent $dev
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$ud = Join-Path $env:TEMP "proxyvpn-store"

function Enc([string]$s) {
    # Escape for a query value but keep path separators readable.
    return ([uri]::EscapeDataString($s)) -replace '%2F', '/'
}

$shots = @(
    @{
        file  = "store-1-connect.png"
        img   = "../docs/ui-live.png"
        title = "One-click proxy switching"
        sub   = "Save your proxies once, then toggle them on and off like a VPN."
        b1    = "HTTP, HTTPS, SOCKS4 and SOCKS5"
        b2    = "Live exit-IP and latency check"
        b3    = "Auto-connect when Chrome starts"
    },
    @{
        file  = "store-2-profiles.png"
        img   = "../docs/ui-form.png"
        title = "Save unlimited named profiles"
        sub   = "Keep every server you use, with optional username and password."
        b1    = "Named profiles you switch between"
        b2    = "Per-profile bypass lists"
        b3    = "Auth handled automatically"
    },
    @{
        file  = "store-3-privacy.png"
        img   = "../docs/ui-settings.png"
        title = "Local-only and private"
        sub   = "No account, no telemetry, no remote code. Everything stays on your machine."
        b1    = "Profiles stored in Chrome locally"
        b2    = "Nothing sent to any server"
        b3    = "Open source and auditable"
    }
)

$tpl = ([uri](Join-Path $store "template.html")).AbsoluteUri

foreach ($s in $shots) {
    $query = "img=$(Enc $s.img)&title=$(Enc $s.title)&sub=$(Enc $s.sub)&b1=$(Enc $s.b1)&b2=$(Enc $s.b2)&b3=$(Enc $s.b3)"
    $url = "$tpl`?$query"
    $out = Join-Path $store $s.file
    Remove-Item $out -Force -ErrorAction SilentlyContinue
    Remove-Item $ud -Recurse -Force -ErrorAction SilentlyContinue

    & $chrome --headless=new --disable-gpu --no-first-run --no-default-browser-check `
        --user-data-dir="$ud" --hide-scrollbars --force-device-scale-factor=1 `
        --window-size=1280,800 --virtual-time-budget=3000 `
        --screenshot="$out" "$url" 2>$null | Out-Null

    Start-Sleep -Milliseconds 700
    if (Test-Path $out) {
        Write-Host ("wrote {0} ({1} bytes)" -f $s.file, (Get-Item $out).Length)
    } else {
        Write-Host ("FAILED {0}" -f $s.file)
    }
}
