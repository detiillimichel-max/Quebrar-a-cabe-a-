/* =========================================================
   Quebra-Cabeça das Fases — script.js
   Para adicionar uma fase nova: coloque a imagem (quadrada)
   na pasta "imagens" e acrescente um item na lista FASES.
   ========================================================= */
(function () {
  'use strict';

  var FASES = [
    { titulo: 'Lago das Montanhas', imagem: 'imagens/fase1.jpg' },
    { titulo: 'Tucano Tropical', imagem: 'imagens/fase2.jpg' },
    { titulo: 'Balões no Céu', imagem: 'imagens/fase3.jpg' },
    { titulo: 'Gatinho Curioso', imagem: 'imagens/fase4.jpg' },
    { titulo: 'Arara Vermelha', imagem: 'imagens/fase5.jpg' },
    { titulo: 'Lago Glacial', imagem: 'imagens/fase6.jpg' }
  ];
  var NIVEIS = { 3: 'Fácil', 4: 'Médio', 5: 'Difícil' };
  var MAX_DICAS = 3;
  var CHAVE = 'quebraCabecaFases.progresso.v1';

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    telaMenu: $('telaMenu'), telaJogo: $('telaJogo'),
    listaFases: $('listaFases'), progressoTexto: $('progressoTexto'),
    tabuleiro: $('tabuleiro'), mensagem: $('mensagem'),
    hudFase: $('hudFase'), hudNome: $('hudNome'),
    tempo: $('tempo'), movimentos: $('movimentos'), corretas: $('corretas'),
    barra: $('barraProgresso'), dicasRestantes: $('dicasRestantes'),
    btnDica: $('btnDica'), btnVer: $('btnVer'), btnEmbaralhar: $('btnEmbaralhar'),
    btnVoltar: $('btnVoltar'), btnSom: $('btnSom'), btnApagar: $('btnApagar'),
    imgMiniatura: $('imgMiniatura'), imgOriginal: $('imgOriginal'),
    modalImagem: $('modalImagem'), btnFecharImagem: $('btnFecharImagem'),
    modalVitoria: $('modalVitoria'), tituloVitoria: $('tituloVitoria'),
    subtituloVitoria: $('subtituloVitoria'), estrelasVitoria: $('estrelasVitoria'),
    novoRecorde: $('novoRecorde'), vitTempo: $('vitTempo'), vitMov: $('vitMov'), vitDicas: $('vitDicas'),
    btnProxima: $('btnProxima'), btnRepetir: $('btnRepetir'), btnMenu: $('btnMenu'),
    confete: $('confete')
  };

  /* ---------------- Progresso salvo no navegador ---------------- */
  function carregar() {
    try {
      var p = JSON.parse(localStorage.getItem(CHAVE));
      if (p && typeof p.liberadas === 'number') {
        return {
          liberadas: Math.min(Math.max(p.liberadas, 1), FASES.length),
          recordes: p.recordes || {},
          n: NIVEIS[p.n] ? p.n : 3,
          som: p.som !== false
        };
      }
    } catch (e) { /* ignora dados inválidos */ }
    return { liberadas: 1, recordes: {}, n: 3, som: true };
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(progresso)); } catch (e) { /* modo privado */ }
  }

  var progresso = carregar();
  var estado = {
    fase: 0, n: 3, ordem: [], selecionada: null, movimentos: 0, segundos: 0,
    timer: null, iniciado: false, dicas: MAX_DICAS, minimo: 0, terminado: false, dicaTimeout: null
  };

  /* ---------------- Sons (Web Audio, sem arquivos) ---------------- */
  var audioCtx = null;
  function tom(freq, dur, tipo, vol, atraso) {
    if (!progresso.som) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime + (atraso || 0);
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = tipo || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* sem som */ }
  }
  var som = {
    clique: function () { tom(520, 0.08, 'triangle', 0.12); },
    troca: function () { tom(620, 0.09, 'sine', 0.14); tom(880, 0.1, 'sine', 0.12, 0.06); },
    certo: function () { tom(784, 0.1, 'triangle', 0.13); tom(1046, 0.16, 'triangle', 0.12, 0.08); },
    bloqueado: function () { tom(180, 0.2, 'square', 0.05); },
    dica: function () { tom(740, 0.12, 'sine', 0.12); tom(988, 0.18, 'sine', 0.1, 0.1); },
    vitoria: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tom(f, 0.28, 'triangle', 0.15, i * 0.12); }); }
  };

  /* ---------------- Utilidades ---------------- */
  function formatar(seg) {
    var m = Math.floor(seg / 60), s = seg % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function estrelasHTML(qtd) {
    var h = '';
    for (var i = 1; i <= 3; i++) h += '<span class="' + (i <= qtd ? '' : 'apagada') + '">★</span>';
    return h;
  }
  function contarCorretas(ordem) {
    var c = 0;
    for (var i = 0; i < ordem.length; i++) if (ordem[i] === i) c++;
    return c;
  }
  function trocasMinimas(ordem) {
    // número mínimo de trocas = peças - quantidade de ciclos
    var visto = [], ciclos = 0;
    for (var i = 0; i < ordem.length; i++) {
      if (visto[i]) continue;
      ciclos++;
      var j = i;
      while (!visto[j]) { visto[j] = true; j = ordem[j]; }
    }
    return ordem.length - ciclos;
  }
  function embaralhar(total) {
    var a = [], i, tentativas = 0;
    for (i = 0; i < total; i++) a.push(i);
    do {
      for (i = total - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      tentativas++;
    } while (contarCorretas(a) > Math.floor(total / 5) && tentativas < 100);
    return a;
  }
  function pecaEm(pos) { return el.tabuleiro.children[pos]; }

  function mostrarMensagem(texto, destaque) {
    el.mensagem.textContent = texto;
    el.mensagem.classList.toggle('destaque', !!destaque);
  }

  /* ---------------- Telas ---------------- */
  function mostrarTela(nome) {
    el.telaMenu.classList.toggle('ativa', nome === 'menu');
    el.telaJogo.classList.toggle('ativa', nome === 'jogo');
    if (nome === 'menu') { pararTimer(); renderMenu(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderMenu() {
    document.querySelectorAll('.dif').forEach(function (b) {
      var ativo = Number(b.dataset.n) === progresso.n;
      b.classList.toggle('ativo', ativo);
      b.setAttribute('aria-checked', ativo ? 'true' : 'false');
    });

    var concluidas = FASES.filter(function (_, i) {
      return Object.keys(progresso.recordes).some(function (k) { return k.indexOf(i + '-') === 0; });
    }).length;
    el.progressoTexto.textContent = concluidas + ' de ' + FASES.length + ' fases concluídas';

    el.listaFases.innerHTML = '';
    FASES.forEach(function (f, i) {
      var liberada = i < progresso.liberadas;
      var rec = progresso.recordes[i + '-' + progresso.n];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'fase-card' + (liberada ? '' : ' bloqueada') + (rec ? ' concluida' : '');
      card.setAttribute('data-testid', 'stage-card-' + (i + 1));
      card.setAttribute('aria-label', 'Fase ' + (i + 1) + ': ' + f.titulo + (liberada ? '' : ' (bloqueada)'));
      card.style.setProperty('--atraso', (i * 60) + 'ms');

      var status;
      if (!liberada) status = '🔒 Complete a fase ' + i + ' para liberar';
      else if (rec) status = '<span class="estrelas">' + estrelasHTML(rec.estrelas) + '</span> <small>' + formatar(rec.tempo) + ' · ' + rec.movimentos + ' mov.</small>';
      else status = '▶ Pronta para jogar (' + NIVEIS[progresso.n] + ')';

      card.innerHTML =
        '<span class="fase-thumb" style="background-image:url(\'' + f.imagem + '\')"></span>' +
        '<span class="fase-info">' +
          '<span class="fase-num">Fase ' + (i + 1) + '</span>' +
          '<span class="fase-nome">' + f.titulo + '</span>' +
          '<span class="fase-status" data-testid="stage-status-' + (i + 1) + '">' + status + '</span>' +
        '</span>';

      card.addEventListener('click', function () {
        if (!liberada) {
          som.bloqueado();
          card.classList.remove('tremer');
          void card.offsetWidth;
          card.classList.add('tremer');
          return;
        }
        som.clique();
        iniciarFase(i);
      });
      el.listaFases.appendChild(card);
    });
  }

  /* ---------------- Partida ---------------- */
  function iniciarFase(i) {
    pararTimer();
    limparDica();
    fecharModal(el.modalVitoria);
    var n = progresso.n;
    estado.fase = i;
    estado.n = n;
    estado.selecionada = null;
    estado.movimentos = 0;
    estado.segundos = 0;
    estado.iniciado = false;
    estado.dicas = MAX_DICAS;
    estado.terminado = false;
    estado.ordem = embaralhar(n * n);
    estado.minimo = trocasMinimas(estado.ordem);

    var f = FASES[i];
    el.hudFase.textContent = 'Fase ' + (i + 1) + ' de ' + FASES.length + ' · ' + NIVEIS[n] + ' ' + n + '×' + n;
    el.hudNome.textContent = f.titulo;
    el.imgMiniatura.src = f.imagem;
    el.imgOriginal.src = f.imagem;
    el.tempo.textContent = '00:00';
    mostrarMensagem('Toque em uma peça e depois em outra para trocá-las — ou arraste.');

    montarTabuleiro();
    atualizarHUD();
    mostrarTela('jogo');
  }

  function montarTabuleiro() {
    var n = estado.n, f = FASES[estado.fase];
    el.tabuleiro.innerHTML = '';
    el.tabuleiro.className = 'tabuleiro n' + n;
    el.tabuleiro.style.setProperty('--n', n);
    estado.ordem.forEach(function (peca, pos) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'peca';
      b.dataset.pos = pos;
      b.setAttribute('role', 'gridcell');
      b.setAttribute('data-testid', 'puzzle-tile-' + pos);
      b.style.backgroundImage = "url('" + f.imagem + "')";
      b.style.backgroundSize = (n * 100) + '% ' + (n * 100) + '%';
      pintar(b, peca);
      el.tabuleiro.appendChild(b);
    });
  }

  function pintar(b, peca) {
    var n = estado.n;
    var x = peca % n, y = Math.floor(peca / n);
    var pos = Number(b.dataset.pos);
    var certa = peca === pos;
    b.style.backgroundPosition = (x * 100 / (n - 1)) + '% ' + (y * 100 / (n - 1)) + '%';
    b.dataset.peca = peca;
    b.classList.toggle('certa', certa);
    b.setAttribute('aria-label', 'Peça ' + (peca + 1) + ' na posição ' + (pos + 1) + (certa ? ', no lugar certo' : ''));
  }

  function atualizarHUD() {
    var total = estado.ordem.length;
    var c = contarCorretas(estado.ordem);
    el.movimentos.textContent = estado.movimentos;
    el.corretas.textContent = c + '/' + total;
    el.barra.style.width = (c / total * 100) + '%';
    el.dicasRestantes.textContent = estado.dicas;
    el.btnDica.disabled = estado.dicas <= 0 || estado.terminado;
    el.btnEmbaralhar.disabled = false;
  }

  function iniciarTimer() {
    if (estado.iniciado || estado.terminado) return;
    estado.iniciado = true;
    var inicio = Date.now() - estado.segundos * 1000;
    estado.timer = setInterval(function () {
      estado.segundos = Math.floor((Date.now() - inicio) / 1000);
      el.tempo.textContent = formatar(estado.segundos);
    }, 250);
  }
  function pararTimer() {
    if (estado.timer) clearInterval(estado.timer);
    estado.timer = null;
    estado.iniciado = false;
  }

  function limparSelecao() {
    if (estado.selecionada !== null) {
      var p = pecaEm(estado.selecionada);
      if (p) p.classList.remove('selecionada');
    }
    estado.selecionada = null;
  }

  function selecionar(p) {
    if (estado.terminado) return;
    iniciarTimer();
    var pos = Number(p.dataset.pos);
    if (estado.selecionada === null) {
      estado.selecionada = pos;
      p.classList.add('selecionada');
      som.clique();
      return;
    }
    if (estado.selecionada === pos) {
      limparSelecao();
      som.clique();
      return;
    }
    var a = estado.selecionada;
    limparSelecao();
    trocar(a, pos);
  }

  function trocar(a, b) {
    if (a === b || estado.terminado) return;
    limparDica();
    var o = estado.ordem;
    var tmp = o[a]; o[a] = o[b]; o[b] = tmp;
    var pa = pecaEm(a), pb = pecaEm(b);
    pintar(pa, o[a]);
    pintar(pb, o[b]);
    [pa, pb].forEach(function (p) { p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); });
    estado.movimentos++;

    var acertou = o[a] === a || o[b] === b;
    if (acertou) som.certo(); else som.troca();
    atualizarHUD();

    if (contarCorretas(o) === o.length) {
      vitoria();
    } else if (acertou) {
      var falta = o.length - contarCorretas(o);
      mostrarMensagem('Boa! ' + (falta === 1 ? 'Falta só 1 peça.' : 'Faltam ' + falta + ' peças.'));
    }
  }

  /* ---------------- Dica ---------------- */
  function limparDica() {
    if (estado.dicaTimeout) clearTimeout(estado.dicaTimeout);
    estado.dicaTimeout = null;
    el.tabuleiro.querySelectorAll('.dica-peca, .dica-alvo').forEach(function (p) {
      p.classList.remove('dica-peca', 'dica-alvo');
    });
    el.mensagem.classList.remove('destaque');
  }

  function darDica() {
    if (estado.terminado) return;
    if (estado.dicas <= 0) {
      som.bloqueado();
      mostrarMensagem('Você já usou todas as dicas desta partida.');
      return;
    }
    var o = estado.ordem;
    var erradas = [];
    for (var i = 0; i < o.length; i++) if (o[i] !== i) erradas.push(i);
    if (!erradas.length) return;

    var alvo = erradas[Math.floor(Math.random() * erradas.length)];
    var origem = o.indexOf(alvo);
    limparDica();
    limparSelecao();
    iniciarTimer();
    estado.dicas--;
    pecaEm(origem).classList.add('dica-peca');
    pecaEm(alvo).classList.add('dica-alvo');
    mostrarMensagem('💡 Dica: leve a peça piscando em rosa até o espaço tracejado.', true);
    som.dica();
    atualizarHUD();
    estado.dicaTimeout = setTimeout(limparDica, 4000);
  }

  /* ---------------- Vitória ---------------- */
  function calcularEstrelas() {
    var min = Math.max(estado.minimo, 1);
    var usadas = MAX_DICAS - estado.dicas;
    var estrelas = estado.movimentos <= Math.ceil(min * 1.25) ? 3 : (estado.movimentos <= min * 2 ? 2 : 1);
    if (usadas >= 2 && estrelas > 1) estrelas--;
    return estrelas;
  }

  function vitoria() {
    estado.terminado = true;
    pararTimer();
    limparSelecao();
    limparDica();
    el.tabuleiro.classList.add('resolvido');
    atualizarHUD();
    mostrarMensagem('🎉 Parabéns! Você montou a imagem!', true);

    var estrelas = calcularEstrelas();
    var chave = estado.fase + '-' + estado.n;
    var anterior = progresso.recordes[chave];
    var novo = !anterior || estrelas > anterior.estrelas ||
      (estrelas === anterior.estrelas && (estado.segundos < anterior.tempo ||
        (estado.segundos === anterior.tempo && estado.movimentos < anterior.movimentos)));
    if (novo) progresso.recordes[chave] = { tempo: estado.segundos, movimentos: estado.movimentos, estrelas: estrelas };
    progresso.liberadas = Math.min(FASES.length, Math.max(progresso.liberadas, estado.fase + 2));
    salvar();

    var ultima = estado.fase === FASES.length - 1;
    el.tituloVitoria.textContent = ultima ? 'Você zerou o jogo! 🏆' : 'Fase ' + (estado.fase + 1) + ' concluída!';
    el.subtituloVitoria.textContent = ultima
      ? 'Todas as fases completas no nível ' + NIVEIS[estado.n] + '. Que tal tentar um nível mais difícil?'
      : 'Muito bem! A fase ' + (estado.fase + 2) + ' foi liberada.';
    el.estrelasVitoria.innerHTML = estrelasHTML(estrelas);
    el.novoRecorde.hidden = !(novo && anterior);
    el.vitTempo.textContent = formatar(estado.segundos);
    el.vitMov.textContent = estado.movimentos;
    el.vitDicas.textContent = MAX_DICAS - estado.dicas;
    el.btnProxima.hidden = ultima;

    som.vitoria();
    soltarConfete();
    setTimeout(function () {
      if (estado.terminado) abrirModal(el.modalVitoria, ultima ? el.btnMenu : el.btnProxima);
    }, 900);
  }

  function soltarConfete() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cores = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#38BDF8', '#FBBF24', '#F8FAFC'];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 100; i++) {
      var s = document.createElement('span');
      s.style.left = (Math.random() * 100) + 'vw';
      s.style.background = cores[i % cores.length];
      s.style.animationDelay = (Math.random() * 0.7) + 's';
      s.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
      s.style.setProperty('--giro', (Math.random() * 900 - 450) + 'deg');
      s.style.setProperty('--desvio', (Math.random() * 200 - 100) + 'px');
      frag.appendChild(s);
    }
    el.confete.appendChild(frag);
    setTimeout(function () { el.confete.innerHTML = ''; }, 5000);
  }

  /* ---------------- Modais ---------------- */
  function abrirModal(m, foco) {
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('aberto'); });
    if (foco) setTimeout(function () { foco.focus(); }, 50);
  }
  function fecharModal(m) {
    m.classList.remove('aberto');
    m.hidden = true;
  }

  /* ---------------- Arrastar e soltar (mouse e toque) ---------------- */
  var arraste = null;
  var ignorarClique = false;

  el.tabuleiro.addEventListener('pointerdown', function (e) {
    var p = e.target.closest('.peca');
    if (!p || estado.terminado || (e.pointerType === 'mouse' && e.button !== 0)) return;
    arraste = { peca: p, x: e.clientX, y: e.clientY, ativo: false, alvo: null, id: e.pointerId };
  });

  window.addEventListener('pointermove', function (e) {
    if (!arraste || e.pointerId !== arraste.id) return;
    var dx = e.clientX - arraste.x, dy = e.clientY - arraste.y;
    if (!arraste.ativo && Math.sqrt(dx * dx + dy * dy) > 8) {
      arraste.ativo = true;
      limparSelecao();
      arraste.peca.classList.add('arrastando');
      iniciarTimer();
    }
    if (!arraste.ativo) return;
    e.preventDefault();
    arraste.peca.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)';
    var embaixo = document.elementFromPoint(e.clientX, e.clientY);
    var alvo = embaixo ? embaixo.closest('.peca') : null;
    if (alvo === arraste.peca || (alvo && alvo.parentNode !== el.tabuleiro)) alvo = null;
    if (alvo !== arraste.alvo) {
      if (arraste.alvo) arraste.alvo.classList.remove('alvo-solta');
      if (alvo) alvo.classList.add('alvo-solta');
      arraste.alvo = alvo;
    }
  }, { passive: false });

  function terminarArraste(e, cancelado) {
    if (!arraste || e.pointerId !== arraste.id) return;
    var a = arraste;
    arraste = null;
    if (!a.ativo) return; // foi só um toque: o evento "click" cuida disso
    ignorarClique = true;
    setTimeout(function () { ignorarClique = false; }, 0);
    a.peca.classList.remove('arrastando');
    a.peca.style.transform = '';
    if (a.alvo) a.alvo.classList.remove('alvo-solta');
    if (!cancelado && a.alvo) trocar(Number(a.peca.dataset.pos), Number(a.alvo.dataset.pos));
  }
  window.addEventListener('pointerup', function (e) { terminarArraste(e, false); });
  window.addEventListener('pointercancel', function (e) { terminarArraste(e, true); });

  // Toque/clique simples (e Enter/Espaço no teclado)
  el.tabuleiro.addEventListener('click', function (e) {
    var p = e.target.closest('.peca');
    if (!p || ignorarClique) return;
    selecionar(p);
  });

  // Setas do teclado movem o foco entre as peças
  el.tabuleiro.addEventListener('keydown', function (e) {
    var p = e.target.closest('.peca');
    if (!p) return;
    var n = estado.n, pos = Number(p.dataset.pos), novo = -1;
    if (e.key === 'ArrowLeft' && pos % n > 0) novo = pos - 1;
    else if (e.key === 'ArrowRight' && pos % n < n - 1) novo = pos + 1;
    else if (e.key === 'ArrowUp' && pos - n >= 0) novo = pos - n;
    else if (e.key === 'ArrowDown' && pos + n < n * n) novo = pos + n;
    else if (e.key === 'Escape') { limparSelecao(); return; }
    else return;
    e.preventDefault();
    if (novo >= 0) pecaEm(novo).focus();
  });

  /* ---------------- Botões ---------------- */
  document.querySelectorAll('.dif').forEach(function (b) {
    b.addEventListener('click', function () {
      progresso.n = Number(b.dataset.n);
      salvar();
      som.clique();
      renderMenu();
    });
  });

  el.btnDica.addEventListener('click', darDica);
  el.btnEmbaralhar.addEventListener('click', function () { som.clique(); iniciarFase(estado.fase); });
  el.btnVoltar.addEventListener('click', function () { som.clique(); mostrarTela('menu'); });
  el.btnVer.addEventListener('click', function () { som.clique(); abrirModal(el.modalImagem, el.btnFecharImagem); });
  el.btnFecharImagem.addEventListener('click', function () { fecharModal(el.modalImagem); });
  el.modalImagem.addEventListener('click', function (e) { if (e.target === el.modalImagem) fecharModal(el.modalImagem); });

  el.btnProxima.addEventListener('click', function () {
    if (estado.fase + 1 < FASES.length) iniciarFase(estado.fase + 1);
  });
  el.btnRepetir.addEventListener('click', function () { iniciarFase(estado.fase); });
  el.btnMenu.addEventListener('click', function () { fecharModal(el.modalVitoria); mostrarTela('menu'); });

  el.btnSom.addEventListener('click', function () {
    progresso.som = !progresso.som;
    salvar();
    atualizarBotaoSom();
    som.clique();
  });
  function atualizarBotaoSom() {
    el.btnSom.textContent = progresso.som ? '🔊' : '🔇';
    el.btnSom.setAttribute('aria-pressed', progresso.som ? 'true' : 'false');
    el.btnSom.setAttribute('aria-label', progresso.som ? 'Som ligado' : 'Som desligado');
  }

  el.btnApagar.addEventListener('click', function () {
    if (!window.confirm('Apagar todo o progresso e recordes?')) return;
    progresso = { liberadas: 1, recordes: {}, n: progresso.n, som: progresso.som };
    salvar();
    renderMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.modalImagem.hidden) fecharModal(el.modalImagem);
  });

  /* ---------------- Início ---------------- */
  FASES.forEach(function (f) { var img = new Image(); img.src = f.imagem; });
  atualizarBotaoSom();
  renderMenu();
})();
