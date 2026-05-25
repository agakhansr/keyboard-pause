$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$sourcePng = Join-Path $projectRoot 'src\assets\keyboard.png'
$buildDir = Join-Path $projectRoot 'build'
$iconPath = Join-Path $buildDir 'icon.ico'

if (-not (Test-Path $sourcePng)) {
  throw "Logo not found: $sourcePng"
}

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$pngBytes = [System.IO.File]::ReadAllBytes($sourcePng)
$stream = [System.IO.File]::Create($iconPath)
$writer = New-Object System.IO.BinaryWriter($stream)

try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)

  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$pngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($pngBytes)
}
finally {
  $writer.Dispose()
  $stream.Dispose()
}

Write-Host "Wrote $iconPath"
