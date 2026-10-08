@echo off
chcp 65001 >nul
title PUBLICAR ZINUP IA - GITHUB E VERCEL
color 0b

echo =========================================================================
echo                  PUBLICADOR AUTOMATICO - ZINUP IA WEB
echo =========================================================================
echo.

:: 1. Verificacao de Login no GitHub
echo [1/3] Verificando login no GitHub...
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Voce ainda nao esta conectado ao GitHub.
    echo     Vamos fazer o login agora. Pressione qualquer tecla para abrir o login...
    pause >nul
    gh auth login -w -p https
) else (
    echo [OK] Conectado ao GitHub com sucesso!
)

:: 2. Criacao e Envio do Repositorio no GitHub
echo.
echo [2/3] Enviando projeto para o seu GitHub...
gh repo create zinup-web --public --source=. --push 2>nul
if %errorlevel% neq 0 (
    git push -u origin main 2>nul
)
echo [OK] Codigo sincronizado no GitHub!

:: 3. Verificacao de Login no Vercel
echo.
echo [3/3] Verificando login no Vercel e publicando...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Faca login no Vercel agora pelo navegador:
    vercel login
)

echo.
echo [*] Fazendo deploy em producao no Vercel...
vercel --prod --yes

echo.
echo =========================================================================
echo  [SUCESSO] O seu aplicativo Zinup IA esta no ar!
echo  Abra o link gerado acima no seu celular para acessar de qualquer lugar.
echo =========================================================================
pause
