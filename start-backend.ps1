$backendDir = Join-Path $PSScriptRoot "backend"
$envFile = Join-Path $backendDir ".env"

if (Test-Path $envFile) {
	Get-Content $envFile | ForEach-Object {
		$line = $_.Trim()
		if (-not $line -or $line.StartsWith("#")) {
			return
		}

		$parts = $line -split "=", 2
		if ($parts.Count -ne 2) {
			return
		}

		$name = $parts[0].Trim()
		$value = $parts[1].Trim()

		if ((($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) -and $value.Length -ge 2) {
			$value = $value.Substring(1, $value.Length - 2)
		}

		Set-Item -Path "Env:$name" -Value $value
	}
}

Set-Location $backendDir

$pythonCandidates = @(
	(Join-Path $PSScriptRoot ".venv\Scripts\python.exe"),
	(Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe")
)

$pythonExe = $pythonCandidates |
	Where-Object { Test-Path $_ } |
	Select-Object -First 1

if (-not $pythonExe) {
	Write-Error "Python executable not found. Expected one of: $($pythonCandidates -join ', ')"
	exit 1
}

& $pythonExe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
