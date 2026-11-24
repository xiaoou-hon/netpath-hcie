﻿# 安装 eNSP-MCP 到独立虚拟环境（不污染全局 Python）
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/setup-ensp-mcp.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/setup-ensp-mcp.ps1 -Python "C:\Python312\python.exe"
param(
    [string]$Python = '',
    [string]$Venv = "$env:USERPROFILE\.venvs\ensp-mcp",
    [switch]$SkipDoctor
)

$ErrorActionPreference = 'Stop'

function Resolve-Python {
    param([string]$Explicit)
    if ($Explicit) {
        if (-not (Test-Path $Explicit)) { throw "指定的 Python 不存在：$Explicit" }
        return $Explicit
    }
    foreach ($candidate in @('py -3.12', 'py -3.11', 'py -3.10')) {
        try {
            $parts = $candidate.Split(' ')
            & $parts[0] $parts[1..($parts.Length - 1)] --version *> $null
            if ($LASTEXITCODE -eq 0) { return $candidate }
        } catch {
            # 尝试下一个解释器
        }
    }
    $fallback = Get-Command python -ErrorAction SilentlyContinue
    if ($fallback) { return 'python' }
    throw '未找到 Python。请安装 Python 3.10–3.12，或用 -Python 指定路径。'
}

$resolved = Resolve-Python -Explicit $Python
Write-Host "[1/4] 使用 Python：$resolved"

$venvPython = Join-Path $Venv 'Scripts\python.exe'
if (-not (Test-Path $venvPython)) {
    Write-Host "[2/4] 创建虚拟环境：$Venv"
    $parts = $resolved.Split(' ')
    if ($parts.Length -gt 1) {
        & $parts[0] $parts[1..($parts.Length - 1)] -m venv $Venv
    } else {
        & $resolved -m venv $Venv
    }
    if ($LASTEXITCODE -ne 0) { throw "创建虚拟环境失败（退出码 $LASTEXITCODE）" }
} else {
    Write-Host "[2/4] 复用已有虚拟环境：$Venv"
}

Write-Host "[3/4] 安装 ensp-mcp"
& $venvPython -m pip install --upgrade pip | Out-Host
& $venvPython -m pip install ensp-mcp | Out-Host
if ($LASTEXITCODE -ne 0) { throw "安装 ensp-mcp 失败（退出码 $LASTEXITCODE）" }

if (-not $SkipDoctor) {
    Write-Host "[4/4] 环境自检：python -m ensp_mcp.doctor"
    & $venvPython -m ensp_mcp.doctor
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "doctor 返回非零退出码 $LASTEXITCODE，请检查上方输出（常见原因：eNSP 未启动、VirtualBox 未安装或镜像缺失）。"
    }
} else {
    Write-Host "[4/4] 已跳过 doctor"
}

Write-Host ''
Write-Host '安装完成。桥接服务会自动探测该虚拟环境。' -ForegroundColor Green
Write-Host "手动启动 MCP：\"$venvPython\" -m ensp_mcp.server"
Write-Host '如需固定命令，可在 ensp-bridge.config.json 中设置：'
Write-Host ('  "mcpCommands": [' + '"' + $venvPython.Replace('\', '\\') + ' -m ensp_mcp.server"' + ']')
