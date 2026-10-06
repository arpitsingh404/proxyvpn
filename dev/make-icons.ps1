# Generates the ProxyVPN PNG icons (16/48/128) using System.Drawing.
# Run from this folder:  powershell -ExecutionPolicy Bypass -File .\make-icons.ps1

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Icon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
    $c2 = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)

    $r = [Math]::Max(2, [int]($size * 0.22))
    $bg = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $bg.AddArc(0, 0, $d, $d, 180, 90)
    $bg.AddArc($size - $d, 0, $d, $d, 270, 90)
    $bg.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $bg.AddArc(0, $size - $d, $d, $d, 90, 90)
    $bg.CloseFigure()
    $g.FillPath($brush, $bg)

    # Shield
    $s = $size
    $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shield.AddLine([float](0.28 * $s), [float](0.20 * $s), [float](0.72 * $s), [float](0.20 * $s))
    $shield.AddLine([float](0.72 * $s), [float](0.20 * $s), [float](0.76 * $s), [float](0.46 * $s))
    $shield.AddBezier(
        [float](0.76 * $s), [float](0.46 * $s),
        [float](0.76 * $s), [float](0.66 * $s),
        [float](0.62 * $s), [float](0.79 * $s),
        [float](0.50 * $s), [float](0.85 * $s))
    $shield.AddBezier(
        [float](0.50 * $s), [float](0.85 * $s),
        [float](0.38 * $s), [float](0.79 * $s),
        [float](0.24 * $s), [float](0.66 * $s),
        [float](0.24 * $s), [float](0.46 * $s))
    $shield.AddLine([float](0.24 * $s), [float](0.46 * $s), [float](0.28 * $s), [float](0.20 * $s))
    $shield.CloseFigure()

    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($white, $shield)

    # Keyhole / lock dot
    $k = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
    $dot = [float](0.045 * $s)
    $g.FillEllipse($k, [float](0.5 * $s - $dot), [float](0.40 * $s - $dot), $dot * 2, $dot * 2)
    $g.FillRectangle($k, [float](0.5 * $s - 0.018 * $s), [float](0.42 * $s), [float](0.036 * $s), [float](0.18 * $s))

    $path = Join-Path $outDir ("icon{0}.png" -f $size)
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $bg.Dispose(); $shield.Dispose(); $white.Dispose(); $k.Dispose()
    Write-Host "wrote $path"
}

foreach ($s in 16, 48, 128) { New-Icon $s }
