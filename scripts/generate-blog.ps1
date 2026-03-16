param(
  [string]$BaseUrl = "https://pinpointaccountingservice.com"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "generate-blog.mjs"
if (-not (Test-Path $scriptPath)) {
  throw "Missing script: $scriptPath"
}

$env:PINPOINT_BASE_URL = $BaseUrl
node $scriptPath
