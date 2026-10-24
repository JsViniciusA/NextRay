# NextRay: landing page + lista de espera

## Abrir no VS Code
1. Instale o Node.js 18 ou mais recente (nodejs.org) e descompacte o zip.
2. No VS Code: File → Open Folder → escolha a pasta `nextray-site`.
3. Abra o terminal (Ctrl + `) e rode:
   - `npm run preview` → gera o site e abre em http://localhost:5173
   - `npm run build` → gera o site e o arquivo de ~160 MB em `dados/`
4. Ou use a aba Run and Debug (F5): as duas opções já estão configuradas.

No teste local, o formulário aparece como enviado e os dados são impressos no terminal. No Netlify, os envios vão para a aba Forms.

## Rodar
```bash
node build.js                # gera dist/ (site) + dados/ (~160 MB)
node build.js --mb=300       # arquivo maior (mínimo 150 MB)
node build.js --sem-dados    # só o site
```
Requer Node.js 18+. Sem dependências.

Variáveis opcionais:
`GA_ID=G-XXXXXXXXXX` · `EMAIL_CONTATO=voce@email.com` · `SENHA_MESTRA=...`

## O que é o arquivo de 150 MB+
`dados/servidor-cego-prontuarios.ndjson` simula o que o servidor do NextRay guardaria.
São prontuários **fictícios**, cifrados com AES-256-GCM e uma chave derivada da senha mestra (scrypt).
A chave nunca é gravada. No fim, o build prova que a senha certa abre os registros e a errada não.
Esse arquivo fica fora de `dist/` e não vai para o Netlify.

## Publicar no Netlify
1. Suba esta pasta para um repositório no GitHub (o `.gitignore` já exclui `dist/` e `dados/`).
2. No Netlify: Add new site → Import from Git. O `netlify.toml` já define o build e a pasta `dist`.
3. Em Site configuration → Environment variables, crie `GA_ID` e `EMAIL_CONTATO`.
4. Em Forms, ative a detecção de formulários e faça um novo deploy.
   Os envios aparecem em Forms → lista-espera.

Sem Git: rode `node build.js --sem-dados` e arraste a pasta `dist/` para app.netlify.com/drop.

## Métricas (Google Analytics 4)
O GA só carrega depois que a pessoa aceita os cookies.
- Visualizações: `page_view`, automático
- Cliques nos botões: `cta_click` (parâmetro `posicao`: nav, hero, hero_como)
- Início do formulário: `waitlist_start`
- Inscrições: `waitlist_submit` (parâmetro `horas_semana`)

Taxa de conversão = waitlist_submit ÷ page_view.
Conte também as inscrições na aba Forms do Netlify, porque elas incluem quem recusou os cookies.
"# NextRay" 
