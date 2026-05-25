$ErrorActionPreference = 'Stop'

Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$electron = Join-Path $PSScriptRoot '..\node_modules\.bin\electron.cmd'
Set-Location $projectRoot
& $electron $projectRoot
