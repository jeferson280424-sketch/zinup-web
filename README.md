# 🚀 ZINUP IA - Controle Remoto & Chat Mobile

Aplicação Web moderna, responsiva e protegida por PIN para controle e utilização remota do seu servidor local de Inteligência Artificial com GPU **NVIDIA GeForce RTX 5060 Ti 16GB** (Ollama + Cloudflare Tunnel).

---

## ✨ Funcionalidades

- 🔒 **Proteção por PIN de Acesso:** Protege o acesso ao seu servidor com PIN mestre de segurança (padrão: `1234`, alterável no app).
- 📱 **Mobile-First & PWA:** Interface desenhada para celulares (iOS e Android), podendo ser instalada direto na tela inicial.
- ⚡ **Chat com Streaming em Tempo Real:** Respostas fluidas token a token direto do Ollama.
- 🏷️ **Seletor Automático de Modelos:** Detecta e lista todos os modelos instalados na sua máquina (`gpt-oss:20b`, `llama3.1:8b`, `hermes3:8b`, etc.).
- 📊 **Monitor de Saúde & Latência:** Ping em tempo real medindo a conexão com `https://zinia.sjlsolucoes.com.br`.
- 🧹 **Descarregador de VRAM (1-Clique):** Botão para descarregar o modelo da memória de vídeo da RTX 5060 Ti quando terminar de usar.
- 💬 **Histórico de Conversas:** Criação de múltiplas conversas salvas no aparelho.
- ⚙️ **Configurações Avançadas:** Ajuste de System Prompt, Temperatura e Endpoint.

---

## 🛠️ Como Testar Localmente

Na pasta `zinup-web`, execute:

```bash
npm install
npm run dev
```

Abra o link gerado no terminal (geralmente `http://localhost:5173`).

---

## 🌐 Como Publicar no GitHub e Hospedar no Vercel (Grátis)

### Passo 1: Criar o Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new) e crie um repositório (exemplo: `zinup-ai-web`).
2. No seu computador, abra o PowerShell nesta pasta (`zinup-web`) e execute:

```bash
git remote add origin https://github.com/SEU_USUARIO/zinup-ai-web.git
git branch -M main
git push -u origin main
```

*(Substitua `SEU_USUARIO` pelo seu usuário do GitHub).*

### Passo 2: Hospedar no Vercel (1 Minuto)
1. Acesse [vercel.com](https://vercel.com) e faça login com seu GitHub.
2. Clique no botão **"Add New..."** > **"Project"**.
3. Selecione o repositório `zinup-ai-web` que você acabou de subir.
4. O Vercel detectará o framework **Vite** automaticamente. Basta clicar em **"Deploy"**!
5. Pronto! Você receberá uma URL pública como `https://zinup-ai-web.vercel.app` para acessar do seu celular de qualquer lugar do mundo!

---

## 📲 Adicionar como Aplicativo no Celular

Quando abrir a URL da Vercel no celular:
- **No iPhone (Safari):** Toque no botão de compartilhar (ícone com quadrado e seta) e selecione **"Adicionar à Tela de Início"**.
- **No Android (Chrome):** Toque nos 3 pontinhos no canto superior e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.

---

## 🛡️ Segurança & Boas Práticas

- O aplicativo exige um PIN numérico para ser desbloqueado (padrão: `1234`). Altere nas configurações do app.
- O endpoint configurado por padrão é `https://zinia.sjlsolucoes.com.br`.
- Se você trocar de domínio ou porta, basta ajustar no menu de configurações do próprio app.
