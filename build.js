#!/usr/bin/env node
/**
 * NextRay: build da landing page + simulação do "servidor cego"
 *
 * Uso:
 *   node build.js                 gera dist/ (site) e dados/ (arquivo de ~160 MB)
 *   node build.js --mb=300        muda o tamanho do arquivo de dados (mínimo 150)
 *   node build.js --sem-dados     gera só o site (é o que o Netlify executa)
 *
 * Variáveis de ambiente opcionais:
 *   GA_ID=G-XXXXXXXXXX            ID do Google Analytics 4
 *   EMAIL_CONTATO=voce@email.com  e-mail exibido no rodapé e na política
 *   SENHA_MESTRA=...              senha usada na simulação de criptografia
 *
 * Sem dependências: só Node.js 18 ou mais recente.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DADOS = path.join(ROOT, 'dados');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const MIN_MB = 150;
const alvoMB = Math.max(MIN_MB, Number(args.mb) || 160);
const semDados = Boolean(args['sem-dados']);

const GA_ID = process.env.GA_ID || '';
const EMAIL = process.env.EMAIL_CONTATO || 'contato@nextray.com.br';

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ---------------------------------------------------------------------------
// 1. Site: copia src/ para dist/ trocando os marcadores
// ---------------------------------------------------------------------------
function buildSite() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });
  const textos = ['.html', '.css', '.js', '.txt', '.xml'];
  let total = 0;

  for (const nome of fs.readdirSync(SRC)) {
    const de = path.join(SRC, nome);
    const para = path.join(DIST, nome);
    if (!fs.statSync(de).isFile()) continue;

    if (textos.includes(path.extname(nome))) {
      let conteudo = fs.readFileSync(de, 'utf8')
        .replaceAll('%%GA_ID%%', GA_ID)
        .replaceAll('%%EMAIL_CONTATO%%', EMAIL)
        .replaceAll('%%DATA%%', hoje);
      fs.writeFileSync(para, conteudo);
      total += Buffer.byteLength(conteudo);
    } else {
      fs.copyFileSync(de, para);
      total += fs.statSync(para).size;
    }
  }

  fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /privacidade.html\n');

  console.log('✔ Site gerado em dist/ (' + (total / 1024).toFixed(1) + ' KB)');
  if (!GA_ID) console.log('  ⚠ GA_ID não definido: o Google Analytics fica desligado e o aviso de cookies não aparece.');
  if (!process.env.EMAIL_CONTATO) console.log('  ⚠ EMAIL_CONTATO não definido: usando ' + EMAIL + '.');
}

// ---------------------------------------------------------------------------
// 2. Simulação do servidor cego (Zero-Knowledge)
//    Gera prontuários FICTÍCIOS, cifra cada um com AES-256-GCM usando uma chave
//    derivada da senha mestra (scrypt) e grava só o conteúdo cifrado,
//    que é exatamente o que o servidor do NextRay guardaria.
// ---------------------------------------------------------------------------
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Valéria', 'Yuri'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Lima', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Carvalho', 'Gomes', 'Barbosa'];
const QUEIXAS = ['ansiedade no trabalho', 'dificuldade para dormir', 'luto recente', 'conflitos familiares', 'baixa autoestima', 'estresse acadêmico', 'término de relacionamento', 'adaptação a nova cidade'];
const EVOLUCOES = [
  'Paciente relata melhora no sono após ajuste da rotina noturna.',
  'Trabalhado o reconhecimento de pensamentos automáticos em situações de pressão.',
  'Sessão focada na relação com a família e nos limites que deseja estabelecer.',
  'Paciente trouxe episódio da semana e conseguiu nomear as emoções envolvidas.',
  'Revisada a tarefa combinada; paciente aplicou a técnica de respiração em dois momentos.',
  'Retomado o tema do trabalho e a comunicação com a chefia.',
  'Paciente demonstra maior clareza sobre os objetivos da terapia.',
  'Explorado o histórico do sintoma e os fatores que o agravam.'
];

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

// gerador pseudoaleatório com semente, para o arquivo ser reprodutível
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function prontuarioFicticio(i, rnd) {
  const paciente = pick(NOMES, rnd) + ' ' + pick(SOBRENOMES, rnd) + ' (FICTÍCIO)';
  const sessoes = 1 + Math.floor(rnd() * 24);
  const evolucoes = [];
  for (let s = 1; s <= Math.min(sessoes, 4); s++) {
    evolucoes.push({ sessao: s, texto: pick(EVOLUCOES, rnd) });
  }
  return {
    id: 'pac_' + String(i).padStart(7, '0'),
    paciente,
    queixa_inicial: pick(QUEIXAS, rnd),
    total_sessoes: sessoes,
    evolucoes,
    anexos: Math.floor(rnd() * 4)
  };
}

function cifrar(chave, objeto) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([c.update(JSON.stringify(objeto), 'utf8'), c.final()]);
  return { iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), dados: dados.toString('base64') };
}

function decifrar(chave, reg) {
  const d = crypto.createDecipheriv('aes-256-gcm', chave, Buffer.from(reg.iv, 'base64'));
  d.setAuthTag(Buffer.from(reg.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(reg.dados, 'base64')), d.final()]).toString('utf8'));
}

async function gerarDados() {
  fs.mkdirSync(DADOS, { recursive: true });
  const arquivo = path.join(DADOS, 'servidor-cego-prontuarios.ndjson');
  const manifesto = path.join(DADOS, 'manifesto.json');

  const senha = process.env.SENHA_MESTRA || 'senha-mestra-de-demonstracao';
  const sal = crypto.randomBytes(16);
  const chave = crypto.scryptSync(senha, sal, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const alvo = alvoMB * 1024 * 1024;

  console.log('… Gerando ' + alvoMB + ' MB de prontuários fictícios cifrados com AES-256-GCM');

  const out = fs.createWriteStream(arquivo);
  const rnd = mulberry32(2026);
  let bytes = 0;
  let n = 0;
  let ultimoPct = -1;
  const inicio = Date.now();

  await new Promise((resolve, reject) => {
    out.on('error', reject);
    function escrever() {
      let pode = true;
      while (bytes < alvo && pode) {
        const reg = { id: 'blob_' + n.toString(36), ...cifrar(chave, prontuarioFicticio(n, rnd)) };
        const linha = JSON.stringify(reg) + '\n';
        bytes += Buffer.byteLength(linha);
        n++;
        pode = out.write(linha);

        const pct = Math.floor((bytes / alvo) * 100);
        if (pct !== ultimoPct && pct % 10 === 0) {
          ultimoPct = pct;
          process.stdout.write('  ' + Math.min(pct, 100) + '%  ' + fmtMB(bytes) + '\r');
        }
      }
      if (bytes < alvo) out.once('drain', escrever);
      else out.end(resolve);
    }
    escrever();
  });

  // Prova: com a senha certa o primeiro registro abre; com a errada, não.
  const primeira = JSON.parse(fs.readFileSync(arquivo, 'utf8').slice(0, 4096).split('\n')[0]);
  const aberto = decifrar(chave, primeira);
  let senhaErradaFalha = false;
  try {
    const chaveErrada = crypto.scryptSync('senha-errada', sal, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    decifrar(chaveErrada, primeira);
  } catch (e) {
    senhaErradaFalha = true;
  }

  const tamanho = fs.statSync(arquivo).size;
  fs.writeFileSync(manifesto, JSON.stringify({
    descricao: 'Simulação do que o servidor do NextRay guardaria: prontuários FICTÍCIOS cifrados no dispositivo do psicólogo.',
    algoritmo: 'AES-256-GCM',
    derivacao_de_chave: { funcao: 'scrypt', N: 32768, r: 8, p: 1, sal_base64: sal.toString('base64') },
    observacao: 'A chave nunca é gravada. Sem a senha mestra, o conteúdo é ilegível.',
    registros: n,
    tamanho_bytes: tamanho,
    gerado_em: new Date().toISOString()
  }, null, 2));

  const seg = ((Date.now() - inicio) / 1000).toFixed(1);
  process.stdout.write('\n');
  console.log('✔ dados/servidor-cego-prontuarios.ndjson: ' + fmtMB(tamanho) + ', ' + n.toLocaleString('pt-BR') + ' registros, ' + seg + ' s');
  console.log('  Teste com a senha certa: abriu o registro de "' + aberto.paciente + '"');
  console.log('  Teste com a senha errada: ' + (senhaErradaFalha ? 'falhou ao abrir, como esperado' : 'ERRO, abriu sem a senha'));
}

(async () => {
  console.log('NextRay build\n');
  buildSite();
  if (semDados) {
    console.log('\n(--sem-dados) Arquivo de simulação não gerado.');
    return;
  }
  console.log('');
  await gerarDados();
})().catch((e) => {
  console.error('✖ Falha no build:', e.message);
  process.exit(1);
});
