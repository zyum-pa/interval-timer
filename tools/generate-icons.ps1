# Run on Windows to regenerate the icons using built-in drawing tools.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../public/icons'
New-Item -ItemType Directory -Path $iconDirectory -Force | Out-Null

foreach ($size in @(180, 192, 512)) {
    $bitmap = New-Object System.Drawing.Bitmap ($size * 4), ($size * 4)
    $drawing = [System.Drawing.Graphics]::FromImage($bitmap)
    $drawing.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $drawing.ScaleTransform(($size * 4 / 512.0), ($size * 4 / 512.0))
    $drawing.Clear([System.Drawing.ColorTranslator]::FromHtml('#176b58'))
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 24
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $drawing.DrawLine($pen, 224, 102, 288, 102)
    $drawing.DrawLine($pen, 256, 102, 256, 134)
    $drawing.DrawLine($pen, 356, 148, 378, 126)
    $drawing.DrawEllipse($pen, 120, 136, 272, 272)
    $drawing.DrawLine($pen, 256, 272, 256, 190)
    $drawing.DrawLine($pen, 256, 272, 312, 310)
    $icon = New-Object System.Drawing.Bitmap $size, $size
    $output = [System.Drawing.Graphics]::FromImage($icon)
    $output.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $output.DrawImage($bitmap, 0, 0, $size, $size)
    $icon.Save((Join-Path $iconDirectory "timer-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose()
    $icon.Dispose()
    $pen.Dispose()
    $drawing.Dispose()
    $bitmap.Dispose()
}
