# Script para atualizar a versão do jogo baseado na tag do Git
# Uso: .\update-version.ps1

$scriptPath = Join-Path $PSScriptRoot "script.js"

# Tentar obter a tag mais recente do git
try {
    $tag = git describe --tags --abbrev=0 2>$null
    if ($LASTEXITCODE -eq 0 -and $tag) {
        # Remover 'v' do início se existir
        $version = $tag -replace '^v', ''
        Write-Host "Versão encontrada no Git: v$version" -ForegroundColor Green
    } else {
        # Se não houver tag, usar versão padrão ou incrementar
        $version = "1.0.0"
        Write-Host "Nenhuma tag encontrada, usando versão padrão: v$version" -ForegroundColor Yellow
    }
} catch {
    $version = "1.0.0"
    Write-Host "Erro ao ler tag do Git, usando versão padrão: v$version" -ForegroundColor Yellow
}

# Ler o arquivo script.js
$content = Get-Content $scriptPath -Raw -Encoding UTF8

# Substituir a constante GAME_VERSION
$pattern = "const GAME_VERSION = '[^']+';"
$replacement = "const GAME_VERSION = '$version';"

if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    Set-Content -Path $scriptPath -Value $content -Encoding UTF8 -NoNewline
    Write-Host "Versão atualizada para v$version em script.js" -ForegroundColor Green
} else {
    Write-Host "Padrão GAME_VERSION não encontrado em script.js" -ForegroundColor Red
}
