const transacoes = [
  { iniciais: 'AM', nome: 'Ana Martins', detalhe: 'Transferência recebida', data: dataRelativa(0), categoria: 'Transferência', valor: 1980, tipo: 'entrada', cor: '#67a7ee' },
  { iniciais: 'SM', nome: 'Supermercado Mês', detalhe: 'Cartão final 1810', data: dataRelativa(1), categoria: 'Alimentação', valor: -486.9, tipo: 'saida', cor: '#de8a70' },
  { iniciais: 'NU', nome: 'Nuvem Digital', detalhe: 'Assinatura mensal', data: dataRelativa(2), categoria: 'Assinaturas', valor: -89.9, tipo: 'saida', cor: '#8b86d6' },
  { iniciais: 'RL', nome: 'Ricardo Lima', detalhe: 'Projeto de identidade', data: dataRelativa(4), categoria: 'Trabalho', valor: 2500, tipo: 'entrada', cor: '#4c9b72' },
  { iniciais: 'MU', nome: 'Mobilidade Urbana', detalhe: 'Cartão final 1810', data: dataRelativa(5), categoria: 'Transporte', valor: -42.5, tipo: 'saida', cor: '#525b65' }
];

const CHAVE_DADOS = 'meu-financeiro-dados-v1';
const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const lista = document.querySelector('#lista-transacoes');
const estadoVazio = document.querySelector('#estado-vazio');
const campoBusca = document.querySelector('#busca');
const paginaCadastro = document.querySelector('#pagina-cadastro');
const modalTransferencia = document.querySelector('#modal-transferencia');
const formularioTransferencia = document.querySelector('#formulario-transferencia');
const modalSimulacao = document.querySelector('#modal-simulacao');
const formularioSimulacao = document.querySelector('#formulario-simulacao');
const resultadoSimulacao = document.querySelector('#resultado-simulacao');
const calendarioData = document.querySelector('#calendario-data');
const tituloCalendario = document.querySelector('#titulo-calendario');
const gradeCalendario = document.querySelector('#grade-calendario');
const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
let filtroAtual = 'todas';
let rotaAtual = 'visao-geral';
let mesConsulta = obterMesAtual();
let horizonteProjecao = 6;
let campoDataAtivo = null;
let mesCalendario = new Date();
let seletorAberto = null;
let contadorSeletores = 0;
const posicoesCarrosseis = { dashboard: 0, cadastro: 0 };
let arrastoCarrossel = null;

function obterMesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function obterDataAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
}

function formatarData(dataIso) {
  if (!dataIso) return '—';
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function converterDataParaIso(dataFormatada) {
  const correspondencia = String(dataFormatada || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!correspondencia) return '';
  const [, dia, mes, ano] = correspondencia;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const valida = data.getUTCFullYear() === Number(ano) && data.getUTCMonth() === Number(mes) - 1 && data.getUTCDate() === Number(dia);
  return valida ? `${ano}-${mes}-${dia}` : '';
}

function aplicarMascaraData(valor) {
  const numeros = String(valor).replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

function validarCampoData(campo) {
  const valida = !campo.value || Boolean(converterDataParaIso(campo.value));
  campo.setCustomValidity(valida ? '' : 'Informe uma data válida no formato dd/MM/yyyy.');
  return valida;
}

function validarDatasDoFormulario(formulario) {
  return [...formulario.querySelectorAll('.entrada-data:not(:disabled)')].every(validarCampoData);
}

function aplicarMascaraMonetaria(valor) {
  const numeros = String(valor || '').replace(/\D/g, '').slice(0, 15);
  if (!numeros) return '';
  return formatador.format(Number(numeros) / 100);
}

function converterMoedaParaNumero(valor) {
  const numeros = String(valor || '').replace(/\D/g, '');
  return numeros ? Number(numeros) / 100 : 0;
}

function validarCampoMonetario(campo) {
  const valor = converterMoedaParaNumero(campo.value);
  const minimo = Number(campo.dataset.minimo || 0);
  const valido = !campo.value || valor >= minimo;
  campo.setCustomValidity(valido ? '' : `Informe um valor igual ou superior a ${moeda(minimo)}.`);
  campo.classList.toggle('invalida', !valido);
  return valido;
}

function validarMoedasDoFormulario(formulario) {
  return [...formulario.querySelectorAll('.entrada-monetaria:not(:disabled)')].every(validarCampoMonetario);
}

function prepararCamposMonetarios(raiz) {
  raiz.querySelectorAll('input[name="valor"], input[name="valorTotal"], input[name="limite"]').forEach((campo) => {
    campo.type = 'text';
    campo.inputMode = 'numeric';
    campo.autocomplete = 'off';
    campo.placeholder = 'R$ 0,00';
    campo.dataset.minimo = campo.name === 'limite' ? '0' : '0.01';
    campo.removeAttribute('min');
    campo.removeAttribute('step');
    campo.classList.add('entrada-monetaria');
    if (campo.value) campo.value = aplicarMascaraMonetaria(campo.value);
  });
}

function isoDaData(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function renderizarCalendario() {
  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const inicioGrade = new Date(ano, mes, 1 - primeiroDia.getDay());
  const dataSelecionada = converterDataParaIso(campoDataAtivo?.value);
  const hoje = obterDataAtual();
  tituloCalendario.textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(primeiroDia);

  gradeCalendario.innerHTML = Array.from({ length: 42 }, (_, indice) => {
    const data = new Date(inicioGrade);
    data.setDate(inicioGrade.getDate() + indice);
    const iso = isoDaData(data);
    const classes = [data.getMonth() !== mes ? 'fora-do-mes' : '', iso === hoje ? 'hoje' : '', iso === dataSelecionada ? 'selecionado' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${classes}" data-data-calendario="${iso}" aria-label="${formatarData(iso)}">${data.getDate()}</button>`;
  }).join('');
  animarItens(gradeCalendario, 'button', 8, 'entrada-calendario-item');
}

function posicionarCalendario() {
  if (!campoDataAtivo) return;
  const campo = campoDataAtivo.getBoundingClientRect();
  const largura = 296;
  const altura = calendarioData.offsetHeight || 360;
  const esquerda = Math.min(Math.max(10, campo.left), window.innerWidth - largura - 10);
  const abaixo = campo.bottom + 8;
  const topo = abaixo + altura <= window.innerHeight - 10 ? abaixo : Math.max(10, campo.top - altura - 8);
  calendarioData.style.left = `${esquerda}px`;
  calendarioData.style.top = `${topo}px`;
}

function abrirCalendario(campo) {
  if (campo.disabled) return;
  campoDataAtivo = campo;
  const dataSelecionada = converterDataParaIso(campo.value) || obterDataAtual();
  const [ano, mes] = dataSelecionada.split('-').map(Number);
  mesCalendario = new Date(ano, mes - 1, 1);
  if (!calendarioData.matches(':popover-open')) calendarioData.showPopover();
  renderizarCalendario();
  posicionarCalendario();
}

function fecharCalendario() {
  if (calendarioData.matches(':popover-open')) calendarioData.hidePopover();
  campoDataAtivo = null;
}

function selecionarDataNoCalendario(dataIso) {
  const campo = campoDataAtivo;
  if (!campo) return;
  campo.value = formatarData(dataIso);
  campo.setCustomValidity('');
  fecharCalendario();
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));
}

function dataRelativa(diasAtras) {
  const data = new Date();
  data.setDate(data.getDate() - diasAtras);
  const iso = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  return formatarData(iso);
}

function formatarInicioDoMes(mes) {
  return formatarData(`${mes}-01`);
}

function formatarDataArmazenada(data) {
  return data?.length === 7 ? formatarInicioDoMes(data) : formatarData(data);
}

function formatarDiaNoMes(mes, dia) {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const ultimoDia = new Date(ano, numeroMes, 0).getDate();
  return formatarData(`${mes}-${String(Math.min(Number(dia) || 1, ultimoDia)).padStart(2, '0')}`);
}

function criarDadosIniciais() {
  const mes = obterMesAtual();
  return {
    despesas: [{ id: 'despesa-aluguel', descricao: 'Aluguel', categoria: 'Moradia', valor: 1840, tipo: 'fixa', dia: 10, data: '', formaPagamento: 'pix', cartaoId: '', funcaoCartao: '', ativa: true }],
    cartoes: [{ id: 'cartao-principal', nome: 'Cartão principal', instituicao: 'Nubank', bandeira: 'Visa', final: '1810', limite: 8000, fechamento: 10, vencimento: 17, cor: '#292b2e' }],
    comprasParceladas: [{ id: 'compra-notebook', descricao: 'Notebook', valorTotal: 4800, parcelas: 12, inicio: mes, meio: 'cartao', cartaoId: 'cartao-principal', local: '' }],
    assinaturas: [{ id: 'assinatura-nuvem', servico: 'Nuvem Digital', valor: 89.9, dia: 25, cartaoId: 'cartao-principal', ativa: true }],
    receitas: [{ id: 'receita-salario', descricao: 'Salário', fonte: 'Trabalho', valor: 8260, data: `${mes}-05`, recorrente: true }]
  };
}

function carregarDados() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_DADOS));
    if (!salvos) return criarDadosIniciais();
    return {
      despesas: (salvos.despesas || (salvos.despesasFixas || []).map((item) => ({ ...item, tipo: 'fixa', data: '', formaPagamento: 'dinheiro', cartaoId: '', funcaoCartao: '' }))).map((item) => ({ ...item, formaPagamento: item.formaPagamento === 'sem-cartao' ? 'dinheiro' : item.formaPagamento })), cartoes: salvos.cartoes || [],
      comprasParceladas: salvos.comprasParceladas || [], assinaturas: salvos.assinaturas || [], receitas: salvos.receitas || []
    };
  } catch {
    return criarDadosIniciais();
  }
}

let dados = carregarDados();

function salvarDados() {
  localStorage.setItem(CHAVE_DADOS, JSON.stringify(dados));
  atualizarVisaoGeral();
}

function gerarId(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function moeda(valor) {
  return formatador.format(Number(valor) || 0);
}

function diferencaEmMeses(inicio, fim) {
  const [anoInicio, mesInicio] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);
  return (anoFim - anoInicio) * 12 + mesFim - mesInicio;
}

function adicionarMeses(mesBase, quantidade) {
  const [ano, mes] = mesBase.split('-').map(Number);
  const data = new Date(ano, mes - 1 + quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function nomeMeio(meio) {
  const nomes = { dinheiro: 'Dinheiro', cartao: 'Cartão', financiamento: 'Financiamento', consorcio: 'Consórcio', outro: 'Outro' };
  return nomes[meio] || 'Outro';
}

function nomeFormaPagamento(forma) {
  const nomes = { cartao: 'Cartão', pix: 'Pix', dinheiro: 'Dinheiro' };
  return nomes[forma] || 'Dinheiro';
}

function encontrarCartao(id) {
  return dados.cartoes.find((cartao) => cartao.id === id);
}

function nomeCartao(id) {
  const cartao = encontrarCartao(id);
  return cartao ? `${cartao.nome} •••• ${cartao.final}` : 'Cartão não encontrado';
}

function opcoesCartoes() {
  return dados.cartoes.map((cartao) => `<option value="${cartao.id}">${escapar(cartao.nome)} •••• ${escapar(cartao.final)}</option>`).join('');
}

function despesasDoMes(mes) {
  const detalhePagamento = (item) => item.formaPagamento === 'cartao' ? `${item.categoria} · ${nomeCartao(item.cartaoId)} · ${item.funcaoCartao}` : `${item.categoria} · ${nomeFormaPagamento(item.formaPagamento)}`;
  const fixas = dados.despesas.filter((item) => item.ativa && item.tipo === 'fixa').map((item) => ({ ...item, tipo: 'Fixa', nome: item.descricao, detalhe: detalhePagamento(item) }));
  const variaveis = dados.despesas.filter((item) => item.ativa && item.tipo === 'variavel' && item.data?.slice(0, 7) === mes).map((item) => ({ ...item, tipo: 'Variável', nome: item.descricao, detalhe: detalhePagamento(item), dia: Number(item.data.slice(8, 10)) }));
  const parcelas = dados.comprasParceladas.flatMap((item) => {
    const indice = diferencaEmMeses(item.inicio, mes);
    if (indice < 0 || indice >= item.parcelas) return [];
    const origem = item.meio === 'cartao' ? nomeCartao(item.cartaoId) : `${nomeMeio(item.meio)} · ${item.local}`;
    return [{ ...item, tipo: 'Parcela', nome: item.descricao, detalhe: `${indice + 1}/${item.parcelas} · ${origem}`, valor: item.valorTotal / item.parcelas, dia: encontrarCartao(item.cartaoId)?.vencimento || 10 }];
  });
  const assinaturas = dados.assinaturas.filter((item) => item.ativa).map((item) => ({ ...item, tipo: 'Assinatura', nome: item.servico, detalhe: nomeCartao(item.cartaoId) }));
  return { fixas, variaveis, parcelas, assinaturas, todas: [...fixas, ...variaveis, ...parcelas, ...assinaturas] };
}

function receitasDoMes(mes) {
  return dados.receitas.filter((receita) => {
    const mesReceita = receita.data.slice(0, 7);
    return receita.recorrente ? diferencaEmMeses(mesReceita, mes) >= 0 : mesReceita === mes;
  });
}

function totalizar(itens, propriedade = 'valor') {
  return itens.reduce((total, item) => total + Number(item[propriedade] || 0), 0);
}

function criarLinhaTransacao(transacao) {
  const sinal = transacao.valor > 0 ? '+' : '-';
  return `<article class="linha-transacao" data-tipo="${transacao.tipo}"><div class="identidade-transacao"><div class="avatar" style="background:${transacao.cor}">${transacao.iniciais}</div><div><strong>${transacao.nome}</strong><small>${transacao.detalhe}</small></div></div><span>${transacao.data}</span><span class="etiqueta">${transacao.categoria}</span><strong class="${transacao.tipo}">${sinal} ${moeda(Math.abs(transacao.valor))}</strong></article>`;
}

function renderizarTransacoes() {
  const termo = campoBusca.value.trim().toLocaleLowerCase('pt-BR');
  const resultado = transacoes.filter((transacao) => {
    const correspondeAoFiltro = filtroAtual === 'todas' || transacao.tipo === filtroAtual;
    const texto = `${transacao.nome} ${transacao.detalhe} ${transacao.categoria}`.toLocaleLowerCase('pt-BR');
    return correspondeAoFiltro && texto.includes(termo);
  });
  lista.innerHTML = resultado.map(criarLinhaTransacao).join('');
  estadoVazio.hidden = resultado.length > 0;
  animarItens(lista, '.linha-transacao', 32);
}

function animarItens(raiz, seletor, intervalo = 38, classe = 'entrada-item') {
  if (movimentoReduzido.matches || !raiz) return;
  const elementos = [...raiz.querySelectorAll(seletor)];
  elementos.forEach((elemento, indice) => {
    elemento.classList.remove(classe);
    elemento.style.setProperty('--atraso-entrada', `${Math.min(indice, 10) * intervalo}ms`);
  });
  if (!elementos.length) return;
  void raiz.offsetWidth;
  elementos.forEach((elemento) => elemento.classList.add(classe));
}

function animarEntradaPagina(pagina) {
  if (movimentoReduzido.matches || !pagina) return;
  animarItens(pagina, '.titulo-secao, .grade-saldos, .acoes-rapidas, .cabecalho-lista, .filtros, .tabela-transacoes, .painel-estatisticas, .cabecalho-pagina, .painel-formulario, .painel-listagem, .painel-mensal, .painel-projecao', 55, 'entrada-bloco');
  animarItens(pagina, '.registro, .linha-mensal, .linha-projecao, .cartao-saude, .resumo-mensal article, .lista-categorias article', 32);
}

function adicionarOndaClique(botao, evento) {
  if (movimentoReduzido.matches) return;
  const limites = botao.getBoundingClientRect();
  const onda = document.createElement('span');
  onda.className = 'onda-clique';
  onda.style.left = `${evento.clientX - limites.left}px`;
  onda.style.top = `${evento.clientY - limites.top}px`;
  botao.append(onda);
  onda.addEventListener('animationend', () => onda.remove(), { once: true });
}

function obterRotuloSeletor(select) {
  if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
  const etiqueta = select.closest('label');
  const texto = [...(etiqueta?.childNodes || [])].find((no) => no.nodeType === Node.TEXT_NODE && no.textContent.trim());
  return texto?.textContent.trim() || 'Selecionar opção';
}

function fecharSeletorPersonalizado(devolverFoco = false) {
  if (!seletorAberto) return;
  const { envoltorio, botao, lista } = seletorAberto;
  envoltorio.classList.remove('aberto');
  botao.setAttribute('aria-expanded', 'false');
  lista.hidden = true;
  if (devolverFoco) botao.focus();
  seletorAberto = null;
}

function sincronizarSeletorPersonalizado(select) {
  const componente = select.componentePersonalizado;
  if (!componente) return;
  const opcaoSelecionada = select.options[select.selectedIndex];
  componente.texto.textContent = opcaoSelecionada?.textContent || 'Selecione';
  componente.botao.disabled = select.disabled;
  componente.botao.setAttribute('aria-label', `${componente.rotulo}: ${componente.texto.textContent}`);
  componente.lista.querySelectorAll('[role="option"]').forEach((opcao) => {
    const selecionada = opcao.dataset.valor === select.value;
    opcao.classList.toggle('selecionada', selecionada);
    opcao.setAttribute('aria-selected', String(selecionada));
  });
  if (select.disabled && seletorAberto?.select === select) fecharSeletorPersonalizado();
}

function posicionarOpcoesSeletor(componente) {
  const { botao, lista } = componente;
  const limites = botao.getBoundingClientRect();
  const largura = Math.max(limites.width, 168);
  lista.style.width = `${largura}px`;
  lista.style.left = `${Math.min(Math.max(10, limites.left), window.innerWidth - largura - 10)}px`;
  lista.style.visibility = 'hidden';
  lista.hidden = false;
  const altura = lista.offsetHeight;
  const abreAcima = limites.bottom + altura + 8 > window.innerHeight - 10 && limites.top > altura + 18;
  lista.classList.toggle('acima', abreAcima);
  lista.style.top = `${abreAcima ? limites.top - altura - 7 : limites.bottom + 7}px`;
  lista.style.visibility = '';
}

function abrirSeletorPersonalizado(select) {
  const componente = select.componentePersonalizado;
  if (!componente || select.disabled) return;
  if (seletorAberto?.select === select) { fecharSeletorPersonalizado(); return; }
  fecharSeletorPersonalizado();
  posicionarOpcoesSeletor(componente);
  componente.envoltorio.classList.add('aberto');
  componente.botao.setAttribute('aria-expanded', 'true');
  seletorAberto = { select, ...componente };
  const selecionada = componente.lista.querySelector('.selecionada:not(:disabled)');
  (selecionada || componente.lista.querySelector('[role="option"]:not(:disabled)'))?.focus();
}

function criarSeletorPersonalizado(select) {
  if (select.componentePersonalizado) return;
  const id = `seletor-opcoes-${++contadorSeletores}`;
  const rotulo = obterRotuloSeletor(select);
  const etiqueta = select.closest('label');
  const envoltorio = document.createElement('div');
  const botao = document.createElement('button');
  const texto = document.createElement('span');
  const listaOpcoes = document.createElement('div');

  envoltorio.className = 'seletor-personalizado';
  botao.className = 'botao-seletor';
  botao.type = 'button';
  botao.setAttribute('aria-haspopup', 'listbox');
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', id);
  texto.className = 'texto-seletor';
  botao.append(texto);
  botao.insertAdjacentHTML('beforeend', '<svg aria-hidden="true"><use href="#icone-seta" /></svg>');

  listaOpcoes.className = 'opcoes-seletor';
  listaOpcoes.id = id;
  listaOpcoes.role = 'listbox';
  listaOpcoes.hidden = true;
  listaOpcoes.selectOriginal = select;

  [...select.options].forEach((opcaoOriginal) => {
    const opcao = document.createElement('button');
    opcao.className = 'opcao-seletor';
    opcao.type = 'button';
    opcao.role = 'option';
    opcao.dataset.valor = opcaoOriginal.value;
    opcao.textContent = opcaoOriginal.textContent;
    opcao.disabled = opcaoOriginal.disabled;
    opcao.addEventListener('click', () => {
      if (select.value !== opcaoOriginal.value) {
        select.value = opcaoOriginal.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sincronizarSeletorPersonalizado(select);
      fecharSeletorPersonalizado(true);
    });
    opcao.addEventListener('keydown', (evento) => {
      const opcoes = [...listaOpcoes.querySelectorAll('[role="option"]:not(:disabled)')];
      const indice = opcoes.indexOf(evento.currentTarget);
      if (evento.key === 'ArrowDown') { evento.preventDefault(); opcoes[(indice + 1) % opcoes.length]?.focus(); }
      if (evento.key === 'ArrowUp') { evento.preventDefault(); opcoes[(indice - 1 + opcoes.length) % opcoes.length]?.focus(); }
      if (evento.key === 'Home') { evento.preventDefault(); opcoes[0]?.focus(); }
      if (evento.key === 'End') { evento.preventDefault(); opcoes.at(-1)?.focus(); }
      if (evento.key === 'Escape') { evento.preventDefault(); fecharSeletorPersonalizado(true); }
    });
    listaOpcoes.append(opcao);
  });

  if (etiqueta) {
    const grupo = document.createElement('div');
    const rotuloVisual = document.createElement('span');
    [...etiqueta.attributes].forEach(({ name, value }) => grupo.setAttribute(name, value));
    grupo.classList.add('grupo-seletor');
    rotuloVisual.className = 'rotulo-seletor';
    rotuloVisual.textContent = rotulo;
    etiqueta.replaceWith(grupo);
    grupo.append(rotuloVisual, envoltorio);
    envoltorio.append(select, botao);
  } else {
    select.before(envoltorio);
    envoltorio.append(select, botao);
  }
  document.body.append(listaOpcoes);
  select.classList.add('seletor-nativo-personalizado');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.componentePersonalizado = { select, envoltorio, botao, texto, lista: listaOpcoes, rotulo };

  botao.addEventListener('click', () => abrirSeletorPersonalizado(select));
  botao.addEventListener('keydown', (evento) => {
    if (!['ArrowDown', 'ArrowUp'].includes(evento.key)) return;
    evento.preventDefault();
    abrirSeletorPersonalizado(select);
  });
  select.addEventListener('change', () => sincronizarSeletorPersonalizado(select));
  sincronizarSeletorPersonalizado(select);
}

function prepararSeletores(raiz) {
  fecharSeletorPersonalizado();
  document.querySelectorAll('.opcoes-seletor').forEach((listaOpcoes) => {
    if (!listaOpcoes.selectOriginal?.isConnected) listaOpcoes.remove();
  });
  raiz.querySelectorAll('select:not(.seletor-nativo-personalizado)').forEach(criarSeletorPersonalizado);
}

function notificar(mensagem) {
  const notificacao = document.querySelector('#notificacao');
  notificacao.textContent = mensagem;
  notificacao.classList.add('visivel');
  clearTimeout(notificar.temporizador);
  notificar.temporizador = setTimeout(() => notificacao.classList.remove('visivel'), 2400);
}

function vazio(titulo, texto) {
  return `<div class="estado-vazio-grande"><div><span class="icone-vazio"><svg><use href="#icone-mais" /></svg></span><h3>${titulo}</h3><p>${texto}</p></div></div>`;
}

function cabecalhoPagina(titulo, descricao, indicadores = '') {
  return `<header class="cabecalho-pagina"><div><h1>${titulo}</h1><p>${descricao}</p></div>${indicadores ? `<div class="resumo-pagina">${indicadores}</div>` : ''}</header>`;
}

function indicador(rotulo, valor, detalhe = '') {
  return `<article class="indicador-resumo"><span>${rotulo}</span><strong>${valor}</strong>${detalhe ? `<small>${detalhe}</small>` : ''}</article>`;
}

function estruturaCadastro(configuracao) {
  return `${cabecalhoPagina(configuracao.titulo, configuracao.descricao, configuracao.indicadores)}<div class="grade-cadastro"><aside class="painel-formulario"><div class="titulo-painel"><div><h2>${configuracao.tituloFormulario}</h2><p>${configuracao.descricaoFormulario}</p></div></div>${configuracao.formulario}</aside><section class="painel-listagem"><header class="cabecalho-listagem"><div><h2>${configuracao.tituloLista}</h2><p>${configuracao.descricaoLista}</p></div><span class="contador-registros">${configuracao.quantidade} ${configuracao.quantidade === 1 ? 'registro' : 'registros'}</span></header>${configuracao.lista}</section></div>`;
}

function botaoExcluir(colecao, id, rotulo) {
  return `<button class="botao-excluir" type="button" data-excluir="${id}" data-colecao="${colecao}" aria-label="Excluir ${escapar(rotulo)}" title="Excluir"><svg><use href="#icone-fechar" /></svg></button>`;
}

function faturaDoCartao(cartaoId, mes = obterMesAtual()) {
  const despesas = despesasDoMes(mes);
  const avulsas = [...despesas.fixas, ...despesas.variaveis].filter((item) => item.cartaoId === cartaoId && item.funcaoCartao === 'Crédito');
  const parcelas = despesas.parcelas.filter((item) => item.cartaoId === cartaoId);
  const assinaturas = despesas.assinaturas.filter((item) => item.cartaoId === cartaoId);
  return totalizar([...avulsas, ...parcelas, ...assinaturas]);
}

function criarCarrosselCartoes(escopo) {
  if (!dados.cartoes.length) return `<div class="carrossel-vazio"><div>Nenhum cartão cadastrado.<button type="button" data-navegar-cartoes>Cadastrar cartão</button></div></div>`;
  const permiteExcluir = escopo === 'cadastro';
  const cartoes = dados.cartoes.map((cartao, indice) => {
    const rotuloValor = escopo === 'dashboard' ? 'FATURA ATUAL' : 'LIMITE';
    const valor = escopo === 'dashboard' ? faturaDoCartao(cartao.id) : cartao.limite;
    return `<article class="cartao-carrossel" data-indice-cartao="${indice}" style="background:${escapar(cartao.cor)}" aria-label="${escapar(cartao.nome)}">
      <div class="topo-cartao-carrossel"><div><strong>${escapar(cartao.nome)}</strong><small>${escapar(cartao.instituicao)}</small></div>${permiteExcluir ? botaoExcluir('cartoes', cartao.id, cartao.nome) : ''}</div>
      <span class="numero-cartao-carrossel">•••• &nbsp;•••• &nbsp;•••• &nbsp;${escapar(cartao.final)}</span>
      <div class="base-cartao-carrossel"><div><small>${rotuloValor}</small><span class="saldo-sensivel">${moeda(valor)}</span></div><div><small>VENCIMENTO</small><span>Dia ${cartao.vencimento}</span></div><strong>${escapar(cartao.bandeira)}</strong></div>
    </article>`;
  }).join('');
  const indicadores = dados.cartoes.map((cartao, indice) => `<button type="button" data-indicador-cartao="${indice}" aria-label="Exibir ${escapar(cartao.nome)}"></button>`).join('');
  const iconeSeta = '<svg aria-hidden="true"><use href="#icone-seta" /></svg>';
  return `<section class="carrossel-cartoes" data-carrossel-cartoes="${escopo}" tabindex="0"><button class="controle-carrossel anterior" type="button" data-carrossel-anterior aria-label="Cartão anterior" ${dados.cartoes.length < 2 ? 'disabled' : ''}>${iconeSeta}</button><div class="palco-carrossel">${cartoes}</div><button class="controle-carrossel proximo" type="button" data-carrossel-proximo aria-label="Próximo cartão" ${dados.cartoes.length < 2 ? 'disabled' : ''}>${iconeSeta}</button><div class="indicadores-carrossel">${indicadores}</div></section>`;
}

function atualizarPosicaoCarrossel(escopo) {
  const raiz = document.querySelector(`[data-carrossel-cartoes="${escopo}"]`);
  if (!raiz) return;
  const cartoes = [...raiz.querySelectorAll('.cartao-carrossel')];
  const quantidade = cartoes.length;
  if (!quantidade) return;
  posicoesCarrosseis[escopo] = Math.min(posicoesCarrosseis[escopo], quantidade - 1);
  const atual = posicoesCarrosseis[escopo];
  cartoes.forEach((cartao, indice) => {
    let deslocamento = indice - atual;
    if (quantidade > 2 && deslocamento > quantidade / 2) deslocamento -= quantidade;
    if (quantidade > 2 && deslocamento < -quantidade / 2) deslocamento += quantidade;
    const distancia = Math.abs(deslocamento);
    const visivel = distancia <= 2;
    cartao.style.setProperty('--posicao-x', `${deslocamento * 112}px`);
    cartao.style.setProperty('--posicao-y', `${distancia === 0 ? 15 : -distancia * 15}px`);
    cartao.style.setProperty('--escala', String(1 - Math.min(distancia, 3) * .1));
    cartao.style.setProperty('--opacidade', visivel ? String(1 - distancia * .16) : '0');
    cartao.style.setProperty('--ordem', String(20 - distancia));
    cartao.style.setProperty('--interacao', visivel ? 'auto' : 'none');
    cartao.classList.toggle('ativo', indice === atual);
  });
  raiz.querySelectorAll('[data-indicador-cartao]').forEach((indicador, indice) => indicador.classList.toggle('ativo', indice === atual));
}

function moverCarrossel(escopo, direcao) {
  const quantidade = dados.cartoes.length;
  if (quantidade < 2) return;
  posicoesCarrosseis[escopo] = (posicoesCarrosseis[escopo] + direcao + quantidade) % quantidade;
  atualizarPosicaoCarrossel(escopo);
}

function renderizarCarrosselDashboard() {
  const destino = document.querySelector('#carrossel-cartoes-dashboard');
  if (!destino) return;
  destino.innerHTML = criarCarrosselCartoes('dashboard');
  atualizarPosicaoCarrossel('dashboard');
}

function renderizarDespesas() {
  const despesasMes = despesasDoMes(obterMesAtual());
  const total = totalizar([...despesasMes.fixas, ...despesasMes.variaveis]);
  const possuiCartao = dados.cartoes.length > 0;
  const registros = dados.despesas.length ? `<div class="lista-registros">${dados.despesas.map((item) => {
    const fixa = item.tipo === 'fixa';
    const pagamento = item.formaPagamento === 'cartao' ? `${nomeCartao(item.cartaoId)} · ${item.funcaoCartao}` : nomeFormaPagamento(item.formaPagamento);
    const periodo = fixa ? `Todo dia ${item.dia}` : formatarData(item.data);
    return `<article class="registro"><span class="icone-registro">${fixa ? 'DF' : 'DV'}</span><div class="registro-info"><strong>${escapar(item.descricao)}</strong><small>${escapar(item.categoria)} · ${escapar(pagamento)}</small></div><div class="registro-dado"><strong>${periodo}</strong><small>${fixa ? 'Despesa fixa mensal' : 'Despesa variável'}</small></div><div class="registro-valor"><strong>${moeda(item.valor)}</strong><small>${fixa ? 'por mês' : 'lançamento único'}</small></div>${botaoExcluir('despesas', item.id, item.descricao)}</article>`;
  }).join('')}</div>` : vazio('Nenhuma despesa cadastrada', 'Cadastre despesas fixas mensais ou gastos variáveis de um período específico.');
  paginaCadastro.innerHTML = estruturaCadastro({
    titulo: 'Despesas', descricao: 'Organize compromissos fixos e gastos variáveis pagos com Cartão, Pix ou Dinheiro.', indicadores: indicador('Despesas no mês', moeda(total), `${dados.despesas.length} cadastradas`),
    tituloFormulario: 'Nova despesa', descricaoFormulario: 'Defina o tipo, o período e a forma de pagamento.',
    formulario: `<form class="formulario-cadastro" data-formulario="despesa"><div class="campos-lado-a-lado"><label>Tipo de despesa<select name="tipo" id="tipo-despesa"><option value="fixa">Fixa mensal</option><option value="variavel">Variável</option></select></label><label>Categoria<select name="categoria" required><option>Moradia</option><option>Alimentação</option><option>Educação</option><option>Saúde</option><option>Lazer</option><option>Transporte</option><option>Impostos</option><option>Outros</option></select></label></div><label>Descrição<input name="descricao" required maxlength="50" placeholder="Ex.: Aluguel ou supermercado" /></label><div class="campos-lado-a-lado"><label>Valor<input class="entrada-monetaria" name="valor" required type="text" inputmode="numeric" data-minimo="0.01" placeholder="R$ 0,00" autocomplete="off" /></label><label id="campo-dia-despesa">Dia do vencimento<input name="dia" required type="number" min="1" max="31" value="10" /></label><label id="campo-data-despesa" hidden>Data da despesa<input class="entrada-data" name="data" disabled required type="text" inputmode="numeric" maxlength="10" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" placeholder="dd/MM/yyyy" value="${formatarData(obterDataAtual())}" autocomplete="off" /></label></div><label>Forma de pagamento<select name="formaPagamento" id="forma-pagamento-despesa"><option value="cartao">Cartão</option><option value="pix" selected>Pix</option><option value="dinheiro">Dinheiro</option></select></label><div class="campos-lado-a-lado campo-condicional" id="campos-cartao-despesa" hidden><label>Cartão<select name="cartaoId" disabled>${opcoesCartoes()}</select></label><label>Função<select name="funcaoCartao" disabled><option value="Crédito">Crédito</option><option value="Débito">Débito</option></select></label></div>${possuiCartao ? '' : '<div class="aviso-formulario">Para usar a opção Cartão, primeiro cadastre um. <button type="button" data-navegar="cartoes">Cadastrar cartão</button></div>'}<button class="botao-salvar" type="submit"><svg><use href="#icone-mais" /></svg> Cadastrar despesa</button></form>`,
    tituloLista: 'Despesas cadastradas', descricaoLista: 'Fixas são recorrentes; variáveis entram apenas no mês informado.', quantidade: dados.despesas.length, lista: registros
  });
}

function renderizarCartoes() {
  const limiteTotal = totalizar(dados.cartoes, 'limite');
  const registros = criarCarrosselCartoes('cadastro');
  paginaCadastro.innerHTML = estruturaCadastro({
    titulo: 'Seus cartões', descricao: 'Centralize os cartões usados nas compras e cobranças recorrentes.', indicadores: indicador('Limite cadastrado', moeda(limiteTotal), `${dados.cartoes.length} cartões`),
    tituloFormulario: 'Novo cartão', descricaoFormulario: 'Use apenas os quatro últimos números.',
    formulario: `<form class="formulario-cadastro" data-formulario="cartao"><label>Nome do cartão<input name="nome" required maxlength="30" placeholder="Ex.: Cartão principal" /></label><div class="campos-lado-a-lado"><label>Instituição<input name="instituicao" required maxlength="30" placeholder="Ex.: Nubank" /></label><label>Bandeira<select name="bandeira"><option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option><option>Outra</option></select></label></div><div class="campos-lado-a-lado"><label>Final do cartão<input name="final" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="0000" /></label><label>Limite<input name="limite" required type="number" min="0" step="0.01" placeholder="0,00" /></label></div><div class="campos-lado-a-lado"><label>Dia de fechamento<input name="fechamento" required type="number" min="1" max="31" value="10" /></label><label>Dia de vencimento<input name="vencimento" required type="number" min="1" max="31" value="17" /></label></div><label>Cor do cartão<input name="cor" type="color" value="#292b2e" /></label><button class="botao-salvar" type="submit"><svg><use href="#icone-mais" /></svg> Cadastrar cartão</button></form>`,
    tituloLista: 'Cartões cadastrados', descricaoLista: 'Navegue horizontalmente entre os cartões.', quantidade: dados.cartoes.length, lista: registros
  });
}

function renderizarComprasParceladas() {
  const valorMensal = totalizar(despesasDoMes(mesConsulta).parcelas);
  const possuiCartao = dados.cartoes.length > 0;
  const registros = dados.comprasParceladas.length ? `<div class="lista-registros">${dados.comprasParceladas.map((item) => { const origem = item.meio === 'cartao' ? nomeCartao(item.cartaoId) : `${nomeMeio(item.meio)} · ${item.local}`; return `<article class="registro"><span class="icone-registro">${item.parcelas}x</span><div class="registro-info"><strong>${escapar(item.descricao)}</strong><small>${escapar(origem)}</small></div><div class="registro-dado"><strong>${formatarDataArmazenada(item.inicio)}</strong><small>Primeira parcela</small></div><div class="registro-valor"><strong>${moeda(item.valorTotal / item.parcelas)}</strong><small>${moeda(item.valorTotal)} no total</small></div>${botaoExcluir('comprasParceladas', item.id, item.descricao)}</article>`; }).join('')}</div>` : vazio('Nenhuma compra parcelada', 'Registre compras feitas em dinheiro, cartão, financiamento, consórcio ou outro meio.');
  paginaCadastro.innerHTML = estruturaCadastro({
    titulo: 'Compras parceladas', descricao: 'Acompanhe cada parcela e identifique exatamente onde a compra foi dividida.', indicadores: indicador(`Parcelas em ${formatarInicioDoMes(mesConsulta)}`, moeda(valorMensal), 'calculado automaticamente'),
    tituloFormulario: 'Nova compra', descricaoFormulario: 'Informe o total e a forma de parcelamento.',
    formulario: `<form class="formulario-cadastro" data-formulario="compra-parcelada"><label>Descrição da compra<input name="descricao" required maxlength="50" placeholder="Ex.: Notebook" /></label><div class="campos-lado-a-lado"><label>Valor total<input name="valorTotal" required type="number" min="0.01" step="0.01" placeholder="0,00" /></label><label>Número de parcelas<input name="parcelas" required type="number" min="2" max="120" value="2" /></label></div><label>Primeira parcela<input class="entrada-data" name="inicio" required type="text" inputmode="numeric" maxlength="10" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" placeholder="dd/MM/yyyy" value="${formatarInicioDoMes(obterMesAtual())}" autocomplete="off" /></label><label>Forma do parcelamento<select name="meio" id="meio-parcelamento"><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="financiamento">Financiamento</option><option value="consorcio">Consórcio</option><option value="outro">Outro</option></select></label><label class="campo-condicional" id="campo-cartao-compra" hidden>Cartão<select name="cartaoId" disabled>${opcoesCartoes()}</select></label><label class="campo-condicional" id="campo-local-compra">Instituição ou local<input name="local" required maxlength="50" placeholder="Ex.: Loja Centro" /></label>${possuiCartao ? '' : '<div class="aviso-formulario">Para usar a opção cartão, primeiro cadastre um. <button type="button" data-navegar="cartoes">Cadastrar cartão</button></div>'}<button class="botao-salvar" type="submit"><svg><use href="#icone-mais" /></svg> Cadastrar compra</button></form>`,
    tituloLista: 'Compras cadastradas', descricaoLista: 'O valor mensal é calculado pelo número de parcelas.', quantidade: dados.comprasParceladas.length, lista: registros
  });
}

function renderizarAssinaturas() {
  const total = totalizar(dados.assinaturas.filter((item) => item.ativa));
  const possuiCartao = dados.cartoes.length > 0;
  const registros = dados.assinaturas.length ? `<div class="lista-registros">${dados.assinaturas.map((item) => `<article class="registro"><span class="icone-registro">AS</span><div class="registro-info"><strong>${escapar(item.servico)}</strong><small>${escapar(nomeCartao(item.cartaoId))}</small></div><div class="registro-dado"><strong>Todo dia ${item.dia}</strong><small>Cobrança mensal</small></div><div class="registro-valor"><strong>${moeda(item.valor)}</strong><small>por mês</small></div>${botaoExcluir('assinaturas', item.id, item.servico)}</article>`).join('')}</div>` : vazio('Nenhuma assinatura', 'Cadastre serviços digitais e outras cobranças recorrentes no cartão.');
  paginaCadastro.innerHTML = estruturaCadastro({
    titulo: 'Assinaturas', descricao: 'Veja quanto os serviços recorrentes comprometem mensalmente dos seus cartões.', indicadores: indicador('Custo mensal', moeda(total), `${dados.assinaturas.length} assinaturas`),
    tituloFormulario: 'Nova assinatura', descricaoFormulario: 'Toda assinatura precisa estar ligada a um cartão.',
    formulario: `<form class="formulario-cadastro" data-formulario="assinatura"><label>Serviço<input name="servico" required maxlength="50" placeholder="Ex.: Streaming" /></label><div class="campos-lado-a-lado"><label>Valor mensal<input name="valor" required type="number" min="0.01" step="0.01" placeholder="0,00" /></label><label>Dia da cobrança<input name="dia" required type="number" min="1" max="31" value="10" /></label></div><label>Cartão associado<select name="cartaoId" required ${possuiCartao ? '' : 'disabled'}>${opcoesCartoes()}</select></label>${possuiCartao ? '' : '<div class="aviso-formulario">Cadastre um cartão antes de adicionar uma assinatura. <button type="button" data-navegar="cartoes">Cadastrar cartão</button></div>'}<button class="botao-salvar" type="submit" ${possuiCartao ? '' : 'disabled'}><svg><use href="#icone-mais" /></svg> Cadastrar assinatura</button></form>`,
    tituloLista: 'Assinaturas cadastradas', descricaoLista: 'Todas aparecem nas despesas mensais.', quantidade: dados.assinaturas.length, lista: registros
  });
}

function renderizarReceitas() {
  const receitasMes = receitasDoMes(mesConsulta);
  const total = totalizar(receitasMes);
  const registros = dados.receitas.length ? `<div class="lista-registros">${dados.receitas.map((item) => `<article class="registro"><span class="icone-registro">R$</span><div class="registro-info"><strong>${escapar(item.descricao)}</strong><small>${escapar(item.fonte)}</small></div><div class="registro-dado"><strong>${formatarData(item.data)}</strong><small>${item.recorrente ? 'Receita recorrente' : 'Receita pontual'}</small></div><div class="registro-valor"><strong class="positivo">${moeda(item.valor)}</strong><small>entrada</small></div>${botaoExcluir('receitas', item.id, item.descricao)}</article>`).join('')}</div>` : vazio('Nenhuma receita', 'Cadastre salário, rendimentos e outras entradas financeiras.');
  paginaCadastro.innerHTML = estruturaCadastro({
    titulo: 'Receitas', descricao: 'Registre as entradas para acompanhar o saldo real de cada mês.', indicadores: indicador(`Receitas em ${formatarInicioDoMes(mesConsulta)}`, moeda(total), `${receitasMes.length} entradas`),
    tituloFormulario: 'Nova receita', descricaoFormulario: 'Informe a origem e a data do recebimento.',
    formulario: `<form class="formulario-cadastro" data-formulario="receita"><label>Descrição<input name="descricao" required maxlength="50" placeholder="Ex.: Salário" /></label><label>Fonte<select name="fonte"><option>Trabalho</option><option>Freelance</option><option>Investimentos</option><option>Benefícios</option><option>Venda</option><option>Outros</option></select></label><div class="campos-lado-a-lado"><label>Valor recebido<input name="valor" required type="number" min="0.01" step="0.01" placeholder="0,00" /></label><label>Data do recebimento<input class="entrada-data" name="data" required type="text" inputmode="numeric" maxlength="10" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" placeholder="dd/MM/yyyy" value="${formatarData(obterDataAtual())}" autocomplete="off" /></label></div><label class="linha-checkbox"><input name="recorrente" type="checkbox" /><span>Repetir esta receita nos próximos meses</span></label><button class="botao-salvar" type="submit"><svg><use href="#icone-mais" /></svg> Cadastrar receita</button></form>`,
    tituloLista: 'Receitas cadastradas', descricaoLista: 'Entradas pontuais e recorrentes.', quantidade: dados.receitas.length, lista: registros
  });
}

function linhaMensal(item) {
  const data = item.dia ? formatarDiaNoMes(mesConsulta, item.dia) : '—';
  return `<article class="linha-mensal"><span class="marcador-tipo">${item.tipo.slice(0, 2).toUpperCase()}</span><div><strong>${escapar(item.nome)}</strong><small>${escapar(item.detalhe)}</small></div><span>${data}</span><strong>${moeda(item.valor)}</strong></article>`;
}

function grupoMensal(titulo, itens) {
  const conteudo = itens.length ? itens.map(linhaMensal).join('') : '<div class="linha-mensal"><span></span><div><small>Nenhum lançamento nesta categoria.</small></div><span></span><strong>—</strong></div>';
  return `<section class="grupo-mensal"><div class="titulo-grupo-mensal"><h3>${titulo}</h3><span>${moeda(totalizar(itens))}</span></div>${conteudo}</section>`;
}

function renderizarDespesasMensais() {
  const despesas = despesasDoMes(mesConsulta);
  const receitas = receitasDoMes(mesConsulta);
  const totalDespesas = totalizar(despesas.todas);
  const totalReceitas = totalizar(receitas);
  const saldo = totalReceitas - totalDespesas;
  paginaCadastro.innerHTML = `${cabecalhoPagina('Despesas mensais', 'Resultado automático das despesas fixas, variáveis, compras parceladas e assinaturas cadastradas.')}<section class="painel-mensal"><header class="barra-mensal"><div><h2>${formatarInicioDoMes(mesConsulta)}</h2><p>${despesas.todas.length} compromissos financeiros no período</p></div><input class="seletor-mes entrada-data" id="mes-despesas" type="text" inputmode="numeric" maxlength="10" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" placeholder="dd/MM/yyyy" value="${formatarInicioDoMes(mesConsulta)}" autocomplete="off" aria-label="Data de referência das despesas" /></header><div class="resumo-mensal"><article><span>Receitas</span><strong class="saldo-positivo">${moeda(totalReceitas)}</strong></article><article><span>Despesas previstas</span><strong>${moeda(totalDespesas)}</strong></article><article><span>Saldo projetado</span><strong class="${saldo >= 0 ? 'saldo-positivo' : ''}">${moeda(saldo)}</strong></article></div><div class="grupos-mensais">${grupoMensal('Despesas fixas', despesas.fixas)}${grupoMensal('Despesas variáveis', despesas.variaveis)}${grupoMensal('Compras parceladas', despesas.parcelas)}${grupoMensal('Assinaturas', despesas.assinaturas)}</div></section>`;
}

function gerarProjecao(quantidadeMeses) {
  let saldoAcumulado = 0;
  return Array.from({ length: quantidadeMeses }, (_, indice) => {
    const mes = adicionarMeses(obterMesAtual(), indice);
    const despesas = despesasDoMes(mes);
    const receitas = receitasDoMes(mes);
    const totalDespesas = totalizar(despesas.todas);
    const totalReceitas = totalizar(receitas);
    const saldo = totalReceitas - totalDespesas;
    saldoAcumulado += saldo;
    return { mes, despesas, totalDespesas, totalReceitas, saldo, saldoAcumulado };
  });
}

function analisarSaudeFinanceira(projecao) {
  const receitas = projecao.reduce((total, mes) => total + mes.totalReceitas, 0);
  const despesas = projecao.reduce((total, mes) => total + mes.totalDespesas, 0);
  const fixas = projecao.reduce((total, mes) => total + totalizar(mes.despesas.fixas), 0);
  const comprometimento = receitas > 0 ? despesas / receitas * 100 : 100;
  const taxaEconomia = receitas > 0 ? (receitas - despesas) / receitas * 100 : 0;
  const pesoFixas = despesas > 0 ? fixas / despesas * 100 : 0;
  const mesesPositivos = projecao.filter((mes) => mes.saldo >= 0).length;
  const estabilidade = mesesPositivos / projecao.length * 100;
  const pontuacao = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, comprometimento - 65) * 1.3 - (100 - estabilidade) * .35)));
  const nivel = pontuacao >= 75 ? 'Saudável' : pontuacao >= 50 ? 'Atenção' : 'Crítica';
  const classe = pontuacao >= 75 ? 'saudavel' : pontuacao >= 50 ? 'atencao' : 'critica';
  return { receitas, despesas, comprometimento, taxaEconomia, pesoFixas, mesesPositivos, pontuacao, nivel, classe };
}

function renderizarProjecao() {
  const projecao = gerarProjecao(horizonteProjecao);
  const saude = analisarSaudeFinanceira(projecao);
  const maiorMovimento = Math.max(...projecao.flatMap((mes) => [mes.totalReceitas, mes.totalDespesas]), 1);
  const saldoFinal = projecao.at(-1)?.saldoAcumulado || 0;
  const linhas = projecao.map((mes) => `
    <article class="linha-projecao">
      <div class="mes-projecao"><strong>${formatarInicioDoMes(mes.mes)}</strong><small>${mes.saldo >= 0 ? 'Superávit previsto' : 'Déficit previsto'}</small></div>
      <div class="comparativo-projecao"><span class="barra-receita" style="width:${mes.totalReceitas / maiorMovimento * 100}%"></span><span class="barra-despesa" style="width:${mes.totalDespesas / maiorMovimento * 100}%"></span></div>
      <span>${moeda(mes.totalReceitas)}</span><span>${moeda(mes.totalDespesas)}</span>
      <strong class="${mes.saldo >= 0 ? 'valor-positivo' : 'valor-negativo'}">${moeda(mes.saldo)}</strong>
      <strong>${moeda(mes.saldoAcumulado)}</strong>
    </article>`).join('');

  paginaCadastro.innerHTML = `
    ${cabecalhoPagina('Projeção financeira', 'Antecipe receitas, despesas e saldo acumulado usando todos os compromissos já cadastrados.')}
    <section class="painel-projecao">
      <header class="barra-projecao"><div><h2>Próximos ${horizonteProjecao} meses</h2><p>A projeção começa no mês atual e considera recorrências e parcelas ativas.</p></div><div class="acoes-projecao"><button class="botao-simular" id="abrir-simulacao" type="button"><svg><use href="#icone-mais" /></svg> Simular compra</button><label>Horizonte<select id="horizonte-projecao"><option value="6" ${horizonteProjecao === 6 ? 'selected' : ''}>6 meses</option><option value="9" ${horizonteProjecao === 9 ? 'selected' : ''}>9 meses</option><option value="12" ${horizonteProjecao === 12 ? 'selected' : ''}>12 meses</option></select></label></div></header>
      <div class="grade-saude">
        <article class="cartao-saude destaque-saude ${saude.classe}"><span>Saúde financeira</span><strong>${saude.pontuacao}<small>/100</small></strong><em>${saude.nivel}</em></article>
        <article class="cartao-saude"><span>Comprometimento médio</span><strong>${saude.comprometimento.toFixed(1)}%</strong><small>da receita prevista</small></article>
        <article class="cartao-saude"><span>Taxa de economia</span><strong class="${saude.taxaEconomia >= 0 ? 'valor-positivo' : 'valor-negativo'}">${saude.taxaEconomia.toFixed(1)}%</strong><small>receita menos despesas</small></article>
        <article class="cartao-saude"><span>Meses positivos</span><strong>${saude.mesesPositivos}/${horizonteProjecao}</strong><small>com saldo no azul</small></article>
        <article class="cartao-saude"><span>Saldo acumulado</span><strong class="${saldoFinal >= 0 ? 'valor-positivo' : 'valor-negativo'}">${moeda(saldoFinal)}</strong><small>ao fim da projeção</small></article>
      </div>
      <div class="cabecalho-tabela-projecao"><span>Mês</span><span>Comparativo</span><span>Receitas</span><span>Despesas</span><span>Saldo</span><span>Acumulado</span></div>
      <div class="lista-projecao">${linhas}</div>
      <footer class="rodape-projecao"><span><i class="legenda-receita"></i>Receitas</span><span><i class="legenda-despesa"></i>Despesas</span><p>Despesas fixas representam <strong>${saude.pesoFixas.toFixed(1)}%</strong> dos compromissos projetados.</p></footer>
    </section>`;
}

function abrirSimulacao() {
  formularioSimulacao.reset();
  formularioSimulacao.elements.inicio.value = formatarInicioDoMes(obterMesAtual());
  resultadoSimulacao.innerHTML = '';
  modalSimulacao.showModal();
  setTimeout(() => formularioSimulacao.elements.descricao.focus(), 80);
}

function calcularSimulacao(formulario) {
  const campos = new FormData(formulario);
  const descricao = campos.get('descricao').trim();
  const valorTotal = converterMoedaParaNumero(campos.get('valorTotal'));
  const parcelas = Number(campos.get('parcelas'));
  const inicioData = converterDataParaIso(campos.get('inicio'));
  const inicio = inicioData.slice(0, 7);
  const diaParcela = Number(inicioData.slice(8, 10)) || 1;
  const valorParcela = valorTotal / parcelas;
  const projecao = gerarProjecao(horizonteProjecao);
  const mesesAfetados = projecao.flatMap((mes) => {
    const indiceParcela = diferencaEmMeses(inicio, mes.mes);
    if (indiceParcela < 0 || indiceParcela >= parcelas) return [];
    const saldoDepois = mes.saldo - valorParcela;
    const comprometimento = mes.totalReceitas > 0 ? (mes.totalDespesas + valorParcela) / mes.totalReceitas * 100 : 100;
    return [{ ...mes, indiceParcela, saldoDepois, comprometimento }];
  });

  if (!mesesAfetados.length) {
    resultadoSimulacao.innerHTML = '<div class="resultado-simulacao-vazio">Essa compra não possui parcelas dentro do horizonte selecionado.</div>';
    animarItens(resultadoSimulacao, '.resultado-simulacao-vazio');
    return;
  }

  const impactoHorizonte = valorParcela * mesesAfetados.length;
  const linhas = mesesAfetados.map((mes) => `
    <article class="linha-impacto">
      <div><strong>${formatarDiaNoMes(mes.mes, diaParcela)}</strong><small>Parcela ${mes.indiceParcela + 1}/${parcelas}</small></div>
      <span>${moeda(mes.saldo)}</span>
      <span>− ${moeda(valorParcela)}</span>
      <strong class="${mes.saldoDepois >= 0 ? 'valor-positivo' : 'valor-negativo'}">${moeda(mes.saldoDepois)}</strong>
      <span>${mes.comprometimento.toFixed(1)}%</span>
    </article>`).join('');

  resultadoSimulacao.innerHTML = `
    <div class="resumo-simulacao">
      <article><span>Valor da parcela</span><strong>${moeda(valorParcela)}</strong><small>${parcelas} parcelas no total</small></article>
      <article><span>Impacto no horizonte</span><strong>${moeda(impactoHorizonte)}</strong><small>${mesesAfetados.length} parcelas visíveis</small></article>
      <article><span>Compra simulada</span><strong>${escapar(descricao)}</strong><small>${formatarDiaNoMes(inicio, diaParcela)} até ${formatarDiaNoMes(adicionarMeses(inicio, parcelas - 1), diaParcela)}</small></article>
    </div>
    <div class="cabecalho-impacto"><span>Mês</span><span>Saldo atual</span><span>Parcela</span><span>Saldo após</span><span>Comprometimento</span></div>
    <div class="lista-impacto">${linhas}</div>
    <p class="nota-simulacao">A simulação não altera seus cadastros. O comprometimento compara todas as despesas previstas, incluindo a nova parcela, com as receitas de cada mês.</p>`;
  animarItens(resultadoSimulacao, '.resumo-simulacao article, .cabecalho-impacto, .linha-impacto, .nota-simulacao', 36);
}

function renderizarRota(rota) {
  const renderizadores = { despesas: renderizarDespesas, cartoes: renderizarCartoes, 'compras-parceladas': renderizarComprasParceladas, assinaturas: renderizarAssinaturas, 'despesas-mensais': renderizarDespesasMensais, receitas: renderizarReceitas, projecao: renderizarProjecao };
  renderizadores[rota]?.();
  prepararCamposMonetarios(paginaCadastro);
  prepararSeletores(paginaCadastro);
  if (rota === 'cartoes') atualizarPosicaoCarrossel('cadastro');
  animarEntradaPagina(paginaCadastro);
}

function abrirPagina(rota) {
  rotaAtual = rota;
  document.querySelectorAll('.pagina').forEach((pagina) => pagina.classList.remove('ativa'));
  document.querySelectorAll('.item-navegacao[data-rota]').forEach((botao) => botao.classList.toggle('ativo', botao.dataset.rota === rota));
  const visaoGeral = rota === 'visao-geral';
  const paginaAtiva = document.querySelector(`[data-rota-pagina="${visaoGeral ? 'visao-geral' : 'cadastro'}"]`);
  paginaAtiva.classList.add('ativa');
  campoBusca.disabled = !visaoGeral;
  campoBusca.placeholder = visaoGeral ? 'Buscar transação...' : 'Busca disponível na visão geral';
  if (!visaoGeral) renderizarRota(rota);
  else animarEntradaPagina(paginaAtiva);
}

function atualizarVisaoGeral() {
  const despesas = despesasDoMes(obterMesAtual());
  const receitas = receitasDoMes(obterMesAtual());
  const totalDespesas = totalizar(despesas.todas);
  const totalReceitas = totalizar(receitas);
  const saldo = totalReceitas - totalDespesas;
  const percentual = totalReceitas > 0 ? Math.round(totalDespesas / totalReceitas * 100) : 0;
  document.querySelector('#valor-saldo').textContent = moeda(saldo);
  document.querySelector('#valor-receitas').textContent = moeda(totalReceitas);
  document.querySelector('#valor-gastos').textContent = moeda(totalDespesas);
  document.querySelector('#percentual-gastos').textContent = `${percentual}% da receita`;
  renderizarCarrosselDashboard();
}

function cadastrar(tipo, formulario) {
  const campos = new FormData(formulario);
  const acoes = {
    despesa: () => dados.despesas.push({ id: gerarId('despesa'), descricao: campos.get('descricao').trim(), categoria: campos.get('categoria'), valor: converterMoedaParaNumero(campos.get('valor')), tipo: campos.get('tipo'), dia: campos.get('tipo') === 'fixa' ? Number(campos.get('dia')) : 0, data: campos.get('tipo') === 'variavel' ? converterDataParaIso(campos.get('data')) : '', formaPagamento: campos.get('formaPagamento'), cartaoId: campos.get('formaPagamento') === 'cartao' ? campos.get('cartaoId') : '', funcaoCartao: campos.get('formaPagamento') === 'cartao' ? campos.get('funcaoCartao') : '', ativa: true }),
    cartao: () => dados.cartoes.push({ id: gerarId('cartao'), nome: campos.get('nome').trim(), instituicao: campos.get('instituicao').trim(), bandeira: campos.get('bandeira'), final: campos.get('final'), limite: converterMoedaParaNumero(campos.get('limite')), fechamento: Number(campos.get('fechamento')), vencimento: Number(campos.get('vencimento')), cor: campos.get('cor') }),
    'compra-parcelada': () => dados.comprasParceladas.push({ id: gerarId('compra'), descricao: campos.get('descricao').trim(), valorTotal: converterMoedaParaNumero(campos.get('valorTotal')), parcelas: Number(campos.get('parcelas')), inicio: converterDataParaIso(campos.get('inicio')), meio: campos.get('meio'), cartaoId: campos.get('meio') === 'cartao' ? campos.get('cartaoId') : '', local: campos.get('meio') === 'cartao' ? '' : campos.get('local').trim() }),
    assinatura: () => dados.assinaturas.push({ id: gerarId('assinatura'), servico: campos.get('servico').trim(), valor: converterMoedaParaNumero(campos.get('valor')), dia: Number(campos.get('dia')), cartaoId: campos.get('cartaoId'), ativa: true }),
    receita: () => dados.receitas.push({ id: gerarId('receita'), descricao: campos.get('descricao').trim(), fonte: campos.get('fonte'), valor: converterMoedaParaNumero(campos.get('valor')), data: converterDataParaIso(campos.get('data')), recorrente: campos.get('recorrente') === 'on' })
  };
  acoes[tipo]?.();
  salvarDados();
  renderizarRota(rotaAtual);
  notificar('Cadastro salvo com sucesso.');
}

function excluirRegistro(colecao, id) {
  if (colecao === 'cartoes') {
    const cartaoEmUso = dados.despesas.some((item) => item.cartaoId === id) || dados.comprasParceladas.some((item) => item.cartaoId === id) || dados.assinaturas.some((item) => item.cartaoId === id);
    if (cartaoEmUso) { notificar('Este cartão está associado a uma compra ou assinatura.'); return; }
  }
  dados[colecao] = dados[colecao].filter((item) => item.id !== id);
  salvarDados();
  renderizarRota(rotaAtual);
  notificar('Registro removido.');
}

function excluirRegistroComMovimento(botao) {
  const colecao = botao.dataset.colecao;
  const id = botao.dataset.excluir;
  const cartaoEmUso = colecao === 'cartoes' && (dados.despesas.some((item) => item.cartaoId === id) || dados.comprasParceladas.some((item) => item.cartaoId === id) || dados.assinaturas.some((item) => item.cartaoId === id));
  const registro = botao.closest('.registro, .cartao-carrossel');
  if (movimentoReduzido.matches || !registro || cartaoEmUso) { excluirRegistro(colecao, id); return; }
  botao.disabled = true;
  registro.classList.add('saida-item');
  setTimeout(() => excluirRegistro(colecao, id), 180);
}

document.querySelectorAll('.item-navegacao[data-rota]').forEach((botao) => botao.addEventListener('click', () => abrirPagina(botao.dataset.rota)));
document.querySelectorAll('.filtro').forEach((botao) => botao.addEventListener('click', () => { document.querySelector('.filtro.ativo')?.classList.remove('ativo'); botao.classList.add('ativo'); filtroAtual = botao.dataset.filtro; renderizarTransacoes(); }));
document.querySelectorAll('.acao-rapida').forEach((botao) => botao.addEventListener('click', () => {
  const destinos = { pagar: 'despesas-mensais', moradia: 'despesas', transporte: 'despesas', mais: 'receitas' };
  if (botao.dataset.acao === 'transferir') { modalTransferencia.showModal(); setTimeout(() => formularioTransferencia.elements.destinatario.focus(), 80); return; }
  abrirPagina(destinos[botao.dataset.acao]);
}));

paginaCadastro.addEventListener('submit', (evento) => {
  const formulario = evento.target.closest('[data-formulario]');
  if (!formulario) return;
  evento.preventDefault();
  if (!validarDatasDoFormulario(formulario) || !validarMoedasDoFormulario(formulario) || !formulario.reportValidity()) return;
  cadastrar(formulario.dataset.formulario, formulario);
});

paginaCadastro.addEventListener('click', (evento) => {
  const excluir = evento.target.closest('[data-excluir]');
  const navegar = evento.target.closest('[data-navegar]');
  const simular = evento.target.closest('#abrir-simulacao');
  if (excluir) excluirRegistroComMovimento(excluir);
  if (navegar) abrirPagina(navegar.dataset.navegar);
  if (simular) abrirSimulacao();
});

document.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-navegar-cartoes]')) { abrirPagina('cartoes'); return; }
  if (evento.target.closest('[data-excluir]')) return;
  const carrossel = evento.target.closest('[data-carrossel-cartoes]');
  if (!carrossel) return;
  const escopo = carrossel.dataset.carrosselCartoes;
  if (evento.target.closest('[data-carrossel-anterior]')) moverCarrossel(escopo, -1);
  if (evento.target.closest('[data-carrossel-proximo]')) moverCarrossel(escopo, 1);
  const indicador = evento.target.closest('[data-indicador-cartao]');
  const cartao = evento.target.closest('[data-indice-cartao]');
  if (indicador) { posicoesCarrosseis[escopo] = Number(indicador.dataset.indicadorCartao); atualizarPosicaoCarrossel(escopo); }
  if (cartao && !cartao.classList.contains('ativo')) { posicoesCarrosseis[escopo] = Number(cartao.dataset.indiceCartao); atualizarPosicaoCarrossel(escopo); }
});

document.addEventListener('pointerdown', (evento) => {
  const botao = evento.target.closest('.acao-rapida, .botao-salvar, .botao-primario, .botao-calcular, .botao-simular');
  if (botao && !botao.disabled) adicionarOndaClique(botao, evento);
});

document.addEventListener('pointerdown', (evento) => {
  const carrossel = evento.target.closest('[data-carrossel-cartoes]');
  if (!carrossel || evento.target.closest('button')) return;
  arrastoCarrossel = { x: evento.clientX, escopo: carrossel.dataset.carrosselCartoes };
});

document.addEventListener('pointerup', (evento) => {
  if (!arrastoCarrossel) return;
  const deslocamento = evento.clientX - arrastoCarrossel.x;
  if (Math.abs(deslocamento) > 38) moverCarrossel(arrastoCarrossel.escopo, deslocamento < 0 ? 1 : -1);
  arrastoCarrossel = null;
});

document.addEventListener('keydown', (evento) => {
  const carrossel = evento.target.closest?.('[data-carrossel-cartoes]');
  if (!carrossel || !['ArrowLeft', 'ArrowRight'].includes(evento.key)) return;
  evento.preventDefault();
  moverCarrossel(carrossel.dataset.carrosselCartoes, evento.key === 'ArrowRight' ? 1 : -1);
});

paginaCadastro.addEventListener('change', (evento) => {
  if (evento.target.id === 'mes-despesas') {
    const dataIso = converterDataParaIso(evento.target.value);
    if (!dataIso) { validarCampoData(evento.target); return; }
    mesConsulta = dataIso.slice(0, 7);
    renderizarDespesasMensais();
  }
  if (evento.target.id === 'horizonte-projecao') { horizonteProjecao = Number(evento.target.value); renderizarProjecao(); }
  if (evento.target.id === 'tipo-despesa') {
    const fixa = evento.target.value === 'fixa';
    const campoDia = document.querySelector('#campo-dia-despesa');
    const campoData = document.querySelector('#campo-data-despesa');
    campoDia.hidden = !fixa;
    campoData.hidden = fixa;
    campoDia.querySelector('input').disabled = !fixa;
    campoDia.querySelector('input').required = fixa;
    campoData.querySelector('input').disabled = fixa;
    campoData.querySelector('input').required = !fixa;
  }
  if (evento.target.id === 'forma-pagamento-despesa') {
    const usaCartao = evento.target.value === 'cartao';
    const camposCartao = document.querySelector('#campos-cartao-despesa');
    camposCartao.hidden = !usaCartao;
    camposCartao.querySelectorAll('select').forEach((campo) => { campo.disabled = !usaCartao; campo.required = usaCartao; });
    evento.target.form.querySelector('.botao-salvar').disabled = usaCartao && dados.cartoes.length === 0;
  }
  if (evento.target.id === 'meio-parcelamento') {
    const usaCartao = evento.target.value === 'cartao';
    const campoCartao = document.querySelector('#campo-cartao-compra');
    const campoLocal = document.querySelector('#campo-local-compra');
    campoCartao.hidden = !usaCartao;
    campoLocal.hidden = usaCartao;
    campoCartao.querySelector('select').disabled = !usaCartao;
    campoCartao.querySelector('select').required = usaCartao;
    campoLocal.querySelector('input').disabled = usaCartao;
    campoLocal.querySelector('input').required = !usaCartao;
    evento.target.form.querySelector('.botao-salvar').disabled = usaCartao && dados.cartoes.length === 0;
  }
});

document.querySelector('#alternar-saldos').addEventListener('click', (evento) => { const ocultos = document.body.classList.toggle('valores-ocultos'); evento.currentTarget.lastChild.textContent = ocultos ? ' Mostrar valores' : ' Ocultar valores'; });
formularioTransferencia.addEventListener('submit', (evento) => { if (evento.submitter?.value !== 'confirmar') return; evento.preventDefault(); if (!validarMoedasDoFormulario(formularioTransferencia) || !formularioTransferencia.reportValidity()) return; modalTransferencia.close(); formularioTransferencia.reset(); notificar('Transferência preparada com sucesso.'); });
formularioSimulacao.addEventListener('submit', (evento) => { evento.preventDefault(); if (!validarDatasDoFormulario(formularioSimulacao) || !validarMoedasDoFormulario(formularioSimulacao) || !formularioSimulacao.reportValidity()) return; calcularSimulacao(formularioSimulacao); });
document.querySelectorAll('[data-fechar-simulacao]').forEach((botao) => botao.addEventListener('click', () => modalSimulacao.close()));
campoBusca.addEventListener('input', renderizarTransacoes);
document.addEventListener('input', (evento) => {
  if (!evento.target.classList.contains('entrada-data')) return;
  evento.target.value = aplicarMascaraData(evento.target.value);
  evento.target.setCustomValidity('');
  if (evento.target.value.length === 10) {
    validarCampoData(evento.target);
    const dataIso = converterDataParaIso(evento.target.value);
    if (dataIso && campoDataAtivo === evento.target) {
      const [ano, mes] = dataIso.split('-').map(Number);
      mesCalendario = new Date(ano, mes - 1, 1);
      renderizarCalendario();
    }
  }
});
document.addEventListener('input', (evento) => {
  if (!evento.target.classList.contains('entrada-monetaria')) return;
  evento.target.value = aplicarMascaraMonetaria(evento.target.value);
  evento.target.setCustomValidity('');
  evento.target.classList.remove('invalida');
});
document.addEventListener('keydown', (evento) => {
  const campo = evento.target;
  if (!campo.classList.contains('entrada-monetaria') || evento.key !== 'Backspace' || campo.selectionStart !== campo.value.length || campo.selectionEnd !== campo.value.length) return;
  evento.preventDefault();
  const centavos = Math.round(converterMoedaParaNumero(campo.value) * 100);
  const restantes = centavos > 0 ? String(centavos).slice(0, -1) : '';
  campo.value = aplicarMascaraMonetaria(restantes);
  campo.setCustomValidity('');
  campo.classList.remove('invalida');
});
document.addEventListener('blur', (evento) => {
  if (evento.target.classList.contains('entrada-data')) validarCampoData(evento.target);
  if (evento.target.classList.contains('entrada-monetaria')) validarCampoMonetario(evento.target);
}, true);
document.addEventListener('focusin', (evento) => {
  if (evento.target.classList.contains('entrada-data')) abrirCalendario(evento.target);
});
document.addEventListener('click', (evento) => {
  if (evento.target.classList.contains('entrada-data')) abrirCalendario(evento.target);
  if (seletorAberto && !evento.target.closest('.seletor-personalizado') && !evento.target.closest('.opcoes-seletor')) fecharSeletorPersonalizado();
});
document.addEventListener('pointerdown', (evento) => {
  if (!calendarioData.matches(':popover-open') || calendarioData.contains(evento.target) || evento.target.classList.contains('entrada-data')) return;
  fecharCalendario();
});
calendarioData.addEventListener('click', (evento) => {
  const dia = evento.target.closest('[data-data-calendario]');
  if (dia) selecionarDataNoCalendario(dia.dataset.dataCalendario);
  if (evento.target.closest('[data-mes-anterior]')) { mesCalendario.setMonth(mesCalendario.getMonth() - 1); renderizarCalendario(); }
  if (evento.target.closest('[data-proximo-mes]')) { mesCalendario.setMonth(mesCalendario.getMonth() + 1); renderizarCalendario(); }
  if (evento.target.closest('[data-selecionar-hoje]')) selecionarDataNoCalendario(obterDataAtual());
});
document.addEventListener('keydown', (evento) => { if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k' && rotaAtual === 'visao-geral') { evento.preventDefault(); campoBusca.focus(); } });
document.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Escape') return;
  if (calendarioData.matches(':popover-open')) fecharCalendario();
  if (seletorAberto) fecharSeletorPersonalizado(true);
});
window.addEventListener('resize', () => { fecharCalendario(); fecharSeletorPersonalizado(); });
window.addEventListener('scroll', fecharCalendario, true);
window.addEventListener('scroll', (evento) => { if (!evento.target.closest?.('.opcoes-seletor')) fecharSeletorPersonalizado(); }, true);
document.querySelector('#periodo').addEventListener('change', (evento) => notificar(`Resumo atualizado: ${evento.target.value}.`));
document.querySelector('#ver-todas').addEventListener('click', () => notificar('Você já está vendo todas as transações recentes.'));
document.querySelector('.botao-relatorio').addEventListener('click', () => abrirPagina('despesas-mensais'));
document.querySelector('.botao-conta').addEventListener('click', () => notificar('Configurações da conta em preparação.'));
document.querySelector('.sair').addEventListener('click', () => notificar('Sessão protegida. Nenhuma ação foi realizada.'));

renderizarTransacoes();
atualizarVisaoGeral();
prepararSeletores(document);
new MutationObserver((mudancas) => mudancas.forEach(({ target }) => {
  if (target.matches?.('select.seletor-nativo-personalizado')) sincronizarSeletorPersonalizado(target);
})).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['disabled'] });
animarEntradaPagina(document.querySelector('[data-rota-pagina="visao-geral"]'));
