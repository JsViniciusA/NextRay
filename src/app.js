(function () {
  'use strict';

  // ===== Google Analytics 4 (só carrega com consentimento) =====
  var GA_ID = window.NEXTRAY_GA_ID || '';
  var gaAtivo = /^G-[A-Z0-9]{6,}$/.test(GA_ID);

  function loadGA() {
    if (!gaAtivo || window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true }); // page_view automático = visualizações
  }

  function track(nome, params) {
    if (window.gtag) window.gtag('event', nome, params || {});
  }

  // ===== Banner de cookies =====
  var banner = document.getElementById('cookies');
  var consent = null;
  try { consent = localStorage.getItem('nr_cookies'); } catch (e) {}
  if (gaAtivo) {
    if (consent === 'yes') loadGA();
    else if (consent === null) banner.hidden = false;
  }
  function decidir(valor) {
    try { localStorage.setItem('nr_cookies', valor); } catch (e) {}
    banner.hidden = true;
    if (valor === 'yes') loadGA();
  }
  document.getElementById('ck-yes').addEventListener('click', function () { decidir('yes'); });
  document.getElementById('ck-no').addEventListener('click', function () { decidir('no'); });

  // ===== Cliques nos botões (cliques reais) =====
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { track('cta_click', { posicao: el.dataset.track }); });
  });

  // ===== Animação do texto cifrado no hero =====
  var cipher = document.getElementById('cipher');
  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cipher && !reduz) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var base = cipher.textContent.split('');
    setInterval(function () {
      for (var i = 0; i < 6; i++) {
        base[Math.floor(Math.random() * base.length)] = chars[Math.floor(Math.random() * chars.length)];
      }
      cipher.textContent = base.join('');
    }, 120);
  }

  // ===== Formulário da lista de espera (Netlify Forms) =====
  var form = document.getElementById('waitlist');
  var contato = document.getElementById('contato');
  var horas = document.getElementById('horas');
  var consentimento = document.getElementById('consentimento');
  var erro = document.getElementById('erro');
  var ok = document.getElementById('ok');
  var enviar = document.getElementById('enviar');
  var iniciou = false;

  form.addEventListener('focusin', function () {
    if (!iniciou) { iniciou = true; track('waitlist_start'); }
  });

  function falhar(msg, campo) {
    erro.textContent = msg;
    erro.hidden = false;
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
  }

  function contatoValido(v) {
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    var digitos = v.replace(/\D/g, '');
    var fone = !/[a-zA-Z@]/.test(v) && digitos.length >= 10 && digitos.length <= 13;
    return email || fone;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    erro.hidden = true;
    [contato, horas].forEach(function (c) { c.removeAttribute('aria-invalid'); });

    if (!contatoValido(contato.value.trim())) return falhar('Informe um e-mail válido ou um WhatsApp com DDD.', contato);
    if (!horas.value) return falhar('Escolha uma faixa de horas por semana.', horas);
    if (!consentimento.checked) return falhar('Para entrar na lista, marque a concordância com o uso do seu contato.', consentimento);

    enviar.disabled = true;
    var texto = enviar.textContent;
    enviar.textContent = 'Enviando...';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      form.hidden = true;
      ok.hidden = false;
      track('waitlist_submit', { horas_semana: horas.value });
    }).catch(function () {
      falhar('Não conseguimos enviar agora. Tente de novo em instantes.');
      enviar.disabled = false;
      enviar.textContent = texto;
    });
  });
})();
