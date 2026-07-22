# merge-settings — ps1-пара tools/merge-settings.py (для apply.ps1 на Windows).
# Parity-контракт: tests/merge-cases/*.json — обе реализации обязаны давать одинаковый результат.
# Меняешь логику здесь — поменяй в python-паре и добавь кейс в merge-cases.
#
# Контракт:
#   - permissions.defaultMode берётся из пресета;
#   - permissions.allow/ask/deny — объединение существующего и пресета без дублей
#     (порядок: сначала существующие, затем новые из пресета);
#   - hooks: если в existing нет своего блока hooks — переносится из пресета целиком;
#     свои hooks пользователя не трогаются (глубокого merge нет);
#   - остальные ключи existing не трогаются;
#   - если результат не отличается — печатается __NOCHANGE__.
#
# Usage: merge-settings.ps1 -PresetPath <preset.json> -ExistingPath <existing.json>
param(
  [Parameter(Mandatory = $true)][string]$PresetPath,
  [Parameter(Mandatory = $true)][string]$ExistingPath
)
$ErrorActionPreference = "Stop"

$preset = Get-Content $PresetPath -Raw | ConvertFrom-Json
$origText = Get-Content $ExistingPath -Raw
$existing = $origText | ConvertFrom-Json

if (-not $existing.permissions) {
  $existing | Add-Member -NotePropertyName permissions -NotePropertyValue ([pscustomobject]@{}) -Force
}
$perm = $existing.permissions
if ($preset.permissions.PSObject.Properties.Name -contains 'defaultMode') {
  $perm | Add-Member -NotePropertyName defaultMode -NotePropertyValue $preset.permissions.defaultMode -Force
}
foreach ($k in 'allow', 'ask', 'deny') {
  $cur = @(); if ($perm.PSObject.Properties.Name -contains $k -and $perm.$k) { $cur = @($perm.$k) }
  $add = @(); if ($preset.permissions.PSObject.Properties.Name -contains $k -and $preset.permissions.$k) { $add = @($preset.permissions.$k) }
  $union = @($cur + $add | Select-Object -Unique)
  $perm | Add-Member -NotePropertyName $k -NotePropertyValue $union -Force
}
if (($preset.PSObject.Properties.Name -contains 'hooks') -and -not ($existing.PSObject.Properties.Name -contains 'hooks')) {
  $existing | Add-Member -NotePropertyName hooks -NotePropertyValue $preset.hooks -Force
}

$mergedJson = $existing | ConvertTo-Json -Depth 20
$origNorm = ($origText | ConvertFrom-Json) | ConvertTo-Json -Depth 20
if ($origNorm -eq $mergedJson) {
  Write-Output "__NOCHANGE__"
}
else {
  Write-Output $mergedJson
}
