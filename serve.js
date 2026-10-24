#!/usr/bin/env node
// Servidor local simples para ver a pasta dist/ no navegador (sem dependências).
// Uso: node serve.js   →   abre em http://localhost:5173
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 5173;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png' };

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('A pasta dist/ não existe. Rode antes: node build.js --sem-dados');
  process.exit(1);
}

http.createServer((req, res) => {
  // Simula o Netlify Forms localmente: aceita o envio e só mostra no terminal.
  if (req.method === 'POST') {
    let corpo = '';
    req.on('data', (c) => (corpo += c));
    req.on('end', () => {
      console.log('📩 Formulário recebido (teste local):', Object.fromEntries(new URLSearchParams(corpo)));
      res.writeHead(200).end('ok');
    });
    return;
  }
  let arquivo = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!arquivo.startsWith(DIST)) return res.writeHead(403).end();
  if (fs.existsSync(arquivo) && fs.statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, 'index.html');
  fs.readFile(arquivo, (err, dados) => {
    if (err) return res.writeHead(404).end('Não encontrado');
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' }).end(dados);
  });
}).listen(PORT, () => console.log('NextRay rodando em http://localhost:' + PORT + '  (Ctrl+C para parar)'));
