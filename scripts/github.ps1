param(
    [ValidateSet('Check', 'PluginPreflight', 'PublishPlugin')]
    [string]$Action = 'Check',
    [string]$NodePath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$sprintRoot = Split-Path -Parent $PSScriptRoot
if (-not $NodePath) {
    $sprintBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $sprintBundledNode) { $NodePath = $sprintBundledNode }
    else { $NodePath = (Get-Command node.exe -ErrorAction Stop).Source }
}
$sprintNodeVersion = & $NodePath --version
if ($LASTEXITCODE -ne 0 -or [version]$sprintNodeVersion.TrimStart('v') -lt [version]'24.0.0') {
    throw 'Use Node 24 or newer with Windows system certificate support. Pass -NodePath if needed. No system Node installation or PATH was changed.'
}
if ($Action -eq 'Check') {
    & $NodePath --use-system-ca (Join-Path $PSScriptRoot 'github-check.mjs')
}
elseif ($Action -eq 'PluginPreflight') {
    & $NodePath --use-system-ca (Join-Path $sprintRoot 'desktop\publish-plugin.mjs')
}
else {
    # Explicit publishing only. Do not choose this mode for an authentication check.
    & $NodePath --use-system-ca (Join-Path $sprintRoot 'desktop\publish-plugin.mjs') --publish
}
if ($LASTEXITCODE -ne 0) { throw "GitHub $Action failed. No credential was printed by this wrapper." }
