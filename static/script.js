

// Equipamentos por produto
const EQUIPAMENTOS_MINERIO = ["VV1", "VV2", "VV3"];
const EQUIPAMENTOS_CARVAO = ["ECV"];
const RECUPERADORAS_CARVAO = ["R5", "R1A"];

// ConfiguraÃ§Ã£o de turnos
const TURNOS = {
    A: { inicio: 6, fim: 18, nome: "A", rendidoPor: "D" },
    B: { inicio: 6, fim: 18, nome: "B", rendidoPor: "C" },
    C: { inicio: 18, fim: 6, nome: "C", rende: "B" },
    D: { inicio: 18, fim: 6, nome: "D", rende: "A" }
};

// Chaves de armazenamento
const STORAGE_KEY = "registro_operacional_dados";
const STORAGE_KEY_TABELAS = "registro_operacional_tabelas_andamento";
const STORAGE_KEY_TURNO_DATA = "registro_operacional_turno_data";
const STORAGE_KEY_TIPO_OPERACAO = "registro_operacional_tipo_operacao";
const STORAGE_KEY_TURNO_ATUAL = "registro_operacional_turno_atual";

// Campos do formulÃ¡rio para persistÃªncia
const CAMPOS_FORMULARIO = [
    "produto", "equipamento", "maquinista", "loc1", "loc2", "horas_maquinista",
    "ponto_b", "sinal", "tabela_posicionada", "data", "turno", "operador", "matricula",
    "tipo_material", "destino", "patio_nome", "baliza", "maquina_patio", "passando_por", "passando_por_partida",
    "empilhando",
    "tipo_divisao", "primeiro_vagao",
    "vagoes_patio", "patio_partida", "baliza_partida", "maquina_patio1",
    "hora_inicio_patio", "hora_fim_patio", "vagoes_bordo", "hora_inicio_bordo",
    "hora_fim_bordo", "vagoes_patio2", "patio_partida2", "baliza_partida2",
    "maquina_patio2", "hora_inicio_patio2", "hora_fim_patio2",
    "prefixo", "oferta", "inicio", "termino", "peso",
    "houve_mudanca_fluxo", "houve_passagem", "vagoes_meu_turno", "turno_assumiu",
    "operador_assumiu", "matricula_assumiu", "hora_rendicao", "vagoes_proximo_turno", 
    "assumiu_em_falha", "descricao_falha_assumida", "hora_falha_passagem",
    "turno_passou_tabela", "operador_passou_tabela", "matricula_passou_tabela",
    "hora_assumiu_tabela", "vagoes_faltavam_assumir", "recebeu_em_falha",
    "falha_recebida_desc", "hora_inicio_falha_recebida", "tempo_parado_h", "tempo_parado_m",
    "acao_falha_recebida", "assumindo_tabela", "operador_assumiu", "matricula_assumiu",
    "turno_assumiu", "supervisor_assumiu",
    "falha_recebida_mecanica", "falha_recebida_eletrica", "falha_recebida_operacional", "falha_recebida_outro",
    "observacoes", "email"
];

// Cache de tabelas
let tabelasAndamentoCache = [];
let tabelasFinalizadasCache = [];
let atualizacaoAutomaticaInterval = null;
let tabelaCarregadaInfo = null;
let tabelaSalva = false; // Flag para controlar se tabela foi salva
let autoSaveTimeout = null;

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

function removerEmojis(texto) {
    if (typeof texto !== "string") {
        return texto;
    }

    return texto
        .replace(EMOJI_REGEX, "")
        .replace(/\uFE0F/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function sanitizarTextoUI() {
    const root = document.body;
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
        const limpo = limparTextoCorrompido(removerEmojis(current.nodeValue || ""));
        if (limpo !== current.nodeValue) {
            current.nodeValue = limpo;
        }
    }

    sanitizarAtributosUI(root);
}

function sanitizarAtributosUI(root) {
    root.querySelectorAll("[placeholder], [title], [aria-label]").forEach((el) => {
        ["placeholder", "title", "aria-label"].forEach((attr) => {
            const valor = el.getAttribute(attr);
            if (!valor) return;
            const limpo = limparTextoCorrompido(removerEmojis(valor));
            if (limpo !== valor) {
                el.setAttribute(attr, limpo);
            }
        });
    });
}

function instalarSanitizadorMensagens() {
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);

    window.alert = function(message) {
        nativeAlert(limparTextoCorrompido(removerEmojis(String(message ?? ""))));
    };

    window.confirm = function(message) {
        return nativeConfirm(limparTextoCorrompido(removerEmojis(String(message ?? ""))));
    };
}


function capitalizarFrases(texto) {
    if (!texto) return texto;
    return texto
        .toLowerCase()
    .replace(/(^|[.!?]\s*)([a-z\u00c0-\u00ff])/giu, (match, p1, p2) => p1 + p2.toUpperCase());
}

function aplicarCapitalizacaoImpacto(input) {
    input.addEventListener('blur', function() {
        this.value = capitalizarFrases(this.value);
    });
}

function toUpperSafe(valor) {
    return valor ? valor.toUpperCase() : valor;
}

function normalizarTexto(valor) {
    if (!valor) return "";
    return String(valor)
        .replace(/Ã£/g, "a")
        .replace(/Ã¡|Ã¢|Ã |Ã¤/g, "a")
        .replace(/Ã©|Ãª|Ã¨|Ã«/g, "e")
        .replace(/Ã­|Ã¯|Ã¬/g, "i")
        .replace(/Ã³|Ã´|Ã¶|Ã²/g, "o")
        .replace(/Ãº|Ã¼|Ã¹/g, "u")
        .replace(/Ã§/g, "c")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function isProdutoCarvao(produto) {
    return normalizarTexto(produto).includes("carvao");
}

function limparTextoCorrompido(texto) {
    if (typeof texto !== "string") return texto;
    return texto
        .replace(/Ã§/g, "ç")
        .replace(/Ã£/g, "ã")
        .replace(/Ã¡/g, "á")
        .replace(/Ã©/g, "é")
        .replace(/Ã­/g, "í")
        .replace(/Ã³/g, "ó")
        .replace(/Ãº/g, "ú")
        .replace(/Ãª/g, "ê")
        .replace(/Ã´/g, "ô")
        .replace(/Ã‰/g, "É")
        .replace(/Ã“/g, "Ó")
        .replace(/Ãš/g, "Ú")
        .replace(/Ã€/g, "À")
        .replace(/Ã‡/g, "Ç")
        .replace(/â†’/g, "→")
        .replace(/â€”/g, "—")
        .replace(/â€“/g, "–")
        .replace(/â€¢/g, "•")
        .replace(/Âº/g, "º")
        .replace(/Âª/g, "ª")
        .replace(/Â/g, "");
}

function formatarTempo(minutos) {
    if (minutos >= 60) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${minutos} min`;
}


function getHoraBrasilia() {
    const now = new Date();
    // Converter para horÃ¡rio de BrasÃ­lia usando toLocaleString
    const brasiliaDateString = now.toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo'
    });
    
    // Parse the formatted string back to Date object
    // Format: "DD/MM/YYYY, HH:MM:SS"
    const parts = brasiliaDateString.match(/(\d+)\/(\d+)\/(\d+)[,\s]+(\d+):(\d+):(\d+)/);
    if (parts) {
        const [, day, month, year, hour, minute, second] = parts;
        return new Date(year, month - 1, day, hour, minute, second);
    }
    
    // Fallback: use device local time if parsing fails
    console.warn('Falha ao converter para horÃ¡rio de BrasÃ­lia, usando horÃ¡rio local do dispositivo:', brasiliaDateString);
    return now;
}

function getTurnoAtual() {
    const hora = getHoraBrasilia().getHours();
    
    if (hora >= 6 && hora < 18) {
        // Turno diurno: A ou B (alternando por dia)
        const dia = getHoraBrasilia().getDate();
        return dia % 2 === 0 ? 'A' : 'B';
    } else {
        // Turno noturno: C ou D (alternando por dia)
        const dia = getHoraBrasilia().getDate();
        return dia % 2 === 0 ? 'C' : 'D';
    }
}

function isProximoFimTurno() {
    const agora = getHoraBrasilia();
    const hora = agora.getHours();
    const turno = getTurnoAtual();
    
    if (turno === 'A' || turno === 'B') {
        // Fim Ã s 18h, mostrar botÃ£o a partir das 17:30
        return hora === 17 && agora.getMinutes() >= 30;
    } else {
        // Fim Ã s 6h, mostrar botÃ£o a partir das 5:30
        return hora === 5 && agora.getMinutes() >= 30;
    }
}

function passouUmaHoraInicioTurno() {
    const agora = getHoraBrasilia();
    const hora = agora.getHours();
    const turno = getTurnoAtual();
    
    if (turno === 'A' || turno === 'B') {
        // InÃ­cio Ã s 6h, ocultar apÃ³s 7h
        return hora >= 7;
    } else {
        // InÃ­cio Ã s 18h, ocultar apÃ³s 19h
        return hora >= 19 || hora < 6;
    }
}

function atualizarRelogio() {
    const agora = getHoraBrasilia();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    
    const relogioEl = document.getElementById('relogio');
    if (relogioEl) {
        relogioEl.textContent = `${horas}:${minutos}:${segundos}`;
    }
}

function isProximoFimTurnoSelecionado(turno) {
    const agora = getHoraBrasilia();
    const hora = agora.getHours();
    const minutos = agora.getMinutes();
    
    if (turno === 'A' || turno === 'B') {
        // Fim Ã s 18h, mostrar botÃ£o a partir das 17:30
        return hora === 17 && minutos >= 30;
    } else {
        // Fim Ã s 6h, mostrar botÃ£o a partir das 5:30
        return hora === 5 && minutos >= 30;
    }
}

function passouUmaHoraInicioTurnoSelecionado(turno) {
    const agora = getHoraBrasilia();
    const hora = agora.getHours();
    
    if (turno === 'A' || turno === 'B') {
        // InÃ­cio Ã s 6h, ocultar apÃ³s 7h
        return hora >= 7;
    } else {
        // InÃ­cio Ã s 18h, ocultar apÃ³s 19h
        return hora >= 19 || hora < 6;
    }
}

function atualizarTurnoInfo() {
    const turnoSelecionado = carregarTurnoSalvo();
    const turnoEl = document.getElementById('turno-atual');
    
    if (turnoEl && turnoSelecionado) {
        turnoEl.textContent = `Turno ${turnoSelecionado}`;
    }
    
    // Mostrar/ocultar botÃ£o finalizar turno baseado no turno selecionado
    const btnFinalizar = document.getElementById('btnFinalizarTurnoHeader');
    if (btnFinalizar && turnoSelecionado) {
        const deveMostrar = isProximoFimTurnoSelecionado(turnoSelecionado);
        btnFinalizar.style.display = deveMostrar ? 'inline-block' : 'none';
    }
    
    // Ocultar assumiu tabela se passou 1 hora do turno selecionado
    const cardAssuncao = document.getElementById('cardAssuncao');
    if (cardAssuncao && turnoSelecionado && passouUmaHoraInicioTurnoSelecionado(turnoSelecionado)) {
        cardAssuncao.style.display = 'none';
    }
}

function carregarTurnoSalvo() {
    const turnoSalvo = localStorage.getItem(STORAGE_KEY_TURNO_ATUAL);
    return turnoSalvo || getTurnoAtual();
}

function preencherDataTurnoAutomatico() {
    const agora = getHoraBrasilia();
    const dataStr = agora.toISOString().split('T')[0]; // YYYY-MM-DD
    const turno = carregarTurnoSalvo();
    
    const dataField = document.getElementById('data');
    const turnoField = document.getElementById('turno');
    
    if (dataField && !dataField.value) {
        dataField.value = dataStr;
    }
    if (turnoField && !turnoField.value) {
        turnoField.value = turno;
    }
}


function verificarSelecaoTurno() {
    const turnoSalvo = localStorage.getItem(STORAGE_KEY_TURNO_ATUAL);
    const modal = document.getElementById('selecao-turno-inicial');
    
    if (!turnoSalvo) {
        // Primeiro acesso - mostrar seleÃ§Ã£o
        modal.style.display = 'flex';
        return false;
    } else {
        // Turno jÃ¡ selecionado - atualizar interface
        atualizarInterfaceTurno(turnoSalvo);
        return true;
    }
}

function selecionarTurno(turno) {
    // Salvar turno selecionado
    localStorage.setItem(STORAGE_KEY_TURNO_ATUAL, turno);
    
    // Esconder modal
    document.getElementById('selecao-turno-inicial').style.display = 'none';
    
    // Atualizar interface
    atualizarInterfaceTurno(turno);
    
    // Preencher campos automaticamente
    preencherDataTurnoAutomatico();
    
    // Iniciar sistema
    iniciarSistemaAposSelecaoTurno();
}

function mostrarSelecaoTurno() {
    const modal = document.getElementById('selecao-turno-inicial');
    modal.style.display = 'flex';
}

function atualizarInterfaceTurno(turno) {
    const tituloTurno = document.getElementById('titulo-turno');
    const turnoAtual = document.getElementById('turno-atual');
    
    if (tituloTurno) {
        tituloTurno.textContent = `Turno ${turno}`;
    }
    
    if (turnoAtual) {
        turnoAtual.textContent = `Turno ${turno}`;
    }
    
    // Atualizar tÃ­tulo da pÃ¡gina
    document.title = `Registro Operacional - Turno ${turno}`;
}

function iniciarSistemaAposSelecaoTurno() {
    // Iniciar relÃ³gio
    setInterval(atualizarRelogio, 1000);
    setInterval(atualizarTurnoInfo, 60000);
    
    // Carregar falha do turno anterior
    carregarFalhaTurnoAnterior();
    
    // Carregar dados salvos
    restaurarDadosFormulario();
    
    // Inicializar listas
    atualizarSeletorTabelas();
    atualizarListaFinalizadas();
    
    console.log("Sistema iniciado apÃ³s seleÃ§Ã£o de turno");
}

async function atualizarSeletorTabelasAssuncao() {
    const select = document.getElementById("seletorTabelasAssuncao");
    const tabelas = await obterTabelasAndamentoServidor();
    
    select.innerHTML = '<option value="">-- Selecione uma tabela --</option>';
    
    // Filtrar tabelas que podem ser assumidas (todas as em andamento)
    tabelas.forEach(tabela => {
        const option = document.createElement("option");
        option.value = tabela.id;
        
        let dataFormatada = "";
        if (tabela.data) {
            const [ano, mes, dia] = tabela.data.split("-");
            dataFormatada = `${dia}/${mes}`;
        }
        
        const produtoLabel = isProdutoCarvao(tabela.produto) ? "CARVAO" : "MINERIO";
        option.textContent = `${produtoLabel} | ${tabela.prefixo} | ${dataFormatada} | ${tabela.turno} | ${tabela.inicio} | ${tabela.operador || '-'}`;
        select.appendChild(option);
    });
}

function verificarMostrarTipoOperacao() {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const cardAssuncao = document.getElementById("cardAssuncao");
    
    // Verificar se jÃ¡ foi selecionado hoje
    const tipoOperacaoSalvo = localStorage.getItem(STORAGE_KEY_TIPO_OPERACAO);
    if (tipoOperacaoSalvo) {
        const dataSalva = JSON.parse(tipoOperacaoSalvo).data;
        const hoje = agora.toDateString();
        if (dataSalva === hoje) {
            // JÃ¡ foi selecionado hoje, ocultar o card
            cardAssuncao.style.display = "none";
            return;
        }
    }
    
    // Se nÃ£o foi selecionado hoje, mostrar sempre o select independente do horÃ¡rio
    // (para permitir que o usuÃ¡rio possa usar o sistema mesmo fora do horÃ¡rio "oficial")
    cardAssuncao.style.display = "block";
}

function salvarTipoOperacao(tipo) {
    const dados = {
        tipo: tipo,
        data: new Date().toDateString(),
        timestamp: new Date().getTime()
    };
    localStorage.setItem(STORAGE_KEY_TIPO_OPERACAO, JSON.stringify(dados));
}

function verificarTurnoDataSalvos() {
    const turnoDataSalvo = localStorage.getItem(STORAGE_KEY_TURNO_DATA);
    if (!turnoDataSalvo) return false;
    
    const dados = JSON.parse(turnoDataSalvo);
    const hoje = new Date().toDateString();
    
    // Verificar se Ã© o mesmo dia
    if (dados.data !== hoje) return false;
    
    // Verificar se ainda estÃ¡ no mesmo turno
    const agora = new Date();
    const horaAtual = agora.getHours();
    const turnoAtual = dados.turno;
    
    // LÃ³gica de turnos:
    // A: 6h-18h, B: 6h-18h (alternado)
    // C: 18h-6h, D: 18h-6h (alternado)
    
    if ((turnoAtual === 'TURNO A' || turnoAtual === 'TURNO B') && (horaAtual >= 6 && horaAtual < 18)) {
        return true; // Ainda no turno do dia
    }
    
    if ((turnoAtual === 'TURNO C' || turnoAtual === 'TURNO D') && (horaAtual >= 18 || horaAtual < 6)) {
        return true; // Ainda no turno da noite
    }
    
    return false; // Mudou de turno
}

function salvarTurnoData(turno, data) {
    const dados = {
        turno: turno,
        data: data,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(STORAGE_KEY_TURNO_DATA, JSON.stringify(dados));
    
    // Preencher automaticamente nos campos
    const campoTurno = document.getElementById("turno");
    const campoData = document.getElementById("data");
    
    if (campoTurno && turno) campoTurno.value = turno;
    if (campoData && data) campoData.value = data;
}

function carregarTurnoDataSalvos() {
    if (verificarTurnoDataSalvos()) {
        const dados = JSON.parse(localStorage.getItem(STORAGE_KEY_TURNO_DATA));
        salvarTurnoData(dados.turno, dados.data);
        
        // Ocultar campos de turno e data se jÃ¡ preenchidos
        const campoTurno = document.getElementById("turno");
        const campoData = document.getElementById("data");
        
        if (campoTurno) campoTurno.style.display = "none";
        if (campoData) campoData.style.display = "none";
        
        // Ocultar labels tambÃ©m
        const labels = document.querySelectorAll('label[for="turno"], label[for="data"]');
        labels.forEach(label => label.style.display = "none");
    }
}

function atualizarEquipamentos() {
    const produto = document.getElementById("produto").value;
    const selectEquip = document.getElementById("equipamento");
    const equipamentoAtual = selectEquip.value; // Preservar valor atual
    
    selectEquip.innerHTML = "";
    
    const equipamentos = isProdutoCarvao(produto) ? EQUIPAMENTOS_CARVAO : EQUIPAMENTOS_MINERIO;
    
    equipamentos.forEach(eq => {
        const opt = document.createElement("option");
        opt.value = eq;
        opt.textContent = eq;
        selectEquip.appendChild(opt);
    });
    
    // Restaurar valor selecionado se ainda for vÃ¡lido
    if (equipamentoAtual && equipamentos.includes(equipamentoAtual)) {
        selectEquip.value = equipamentoAtual;
    }
    
    controleEquipamento();
}

function controleEquipamento() {
    const equipamento = document.getElementById("equipamento").value;
    const sinalContainer = document.getElementById("sinalContainer");
    
    // ECV nÃ£o tem passagem pelo sinal
    sinalContainer.style.display = equipamento === "ECV" ? "none" : "block";
}

function atualizarTiposMaterial(selectCategoria) {
    const row = selectCategoria.closest('.material-carvao-row');
    const inputTipo = row.querySelector('.carvao-tipo-material');
    const categoria = selectCategoria.value;
    
    inputTipo.placeholder = categoria === "CARVAO"
        ? "Ex: MU, OG (carvão)"
        : "Ex: CCM, KL, KIN (coque)";
}

function atualizarRecuperadora(selectPatio) {
    const row = selectPatio.closest(".material-carvao-row");
    const recup = row?.querySelector(".carvao-recuperadora");
    if (!recup) return;

    const patio = normalizarTexto(selectPatio.value);
    if (patio.includes("patio 0")) {
        recup.value = "R5";
    } else if (patio.includes("patio 1") || patio.includes("patio 2")) {
        recup.value = "R1A";
    }
}


function controleDestino() {
    const destino = document.getElementById("destino").value;
    const empilhando = document.getElementById("empilhando")?.value || "NAO";
    
    document.getElementById("patioExtra").style.display = (destino === "PATIO" || empilhando === "SIM") ? "block" : "none";
    document.getElementById("bordoExtra").style.display = destino === "BORDO" ? "block" : "none";
    document.getElementById("tabelaPartidaExtra").style.display = destino === "PARTIDA" ? "block" : "none";
}

function controleProduto() {
    const produto = document.getElementById("produto").value;
    const isCarvao = isProdutoCarvao(produto);
    
    atualizarEquipamentos();
    
    document.getElementById("minerioExtra").style.display = isCarvao ? "none" : "block";
    document.getElementById("carvaoExtra").style.display = isCarvao ? "block" : "none";
    controleEmpilhamento();
}

function controleTipoDivisao() {
    const tipo = document.getElementById("tipo_divisao").value;
    const secaoPatio1 = document.getElementById("secaoPatio1");
    const secaoBordo = document.getElementById("secaoBordo");
    const secaoPatio2 = document.getElementById("secaoPatio2");
    const tituloPatio1 = document.getElementById("tituloPatio1");
    const tituloBordo = document.getElementById("tituloBordo");
    const tituloPatio2 = document.getElementById("tituloPatio2");

    if (tipo === "PATIO_PATIO") {
        if (secaoPatio1) secaoPatio1.style.display = "block";
        if (secaoBordo) secaoBordo.style.display = "none";
        if (secaoPatio2) secaoPatio2.style.display = "block";
        if (tituloPatio1) tituloPatio1.textContent = "1a Parte - Patio";
        if (tituloPatio2) tituloPatio2.textContent = "2a Parte - Patio";
    } else if (tipo === "BORDO_PATIO") {
        if (secaoPatio1) secaoPatio1.style.display = "none";
        if (secaoBordo) secaoBordo.style.display = "block";
        if (secaoPatio2) secaoPatio2.style.display = "block";
        if (tituloBordo) tituloBordo.textContent = "1a Parte - Bordo";
        if (tituloPatio2) tituloPatio2.textContent = "2a Parte - Patio";
    } else {
        if (secaoPatio1) secaoPatio1.style.display = "block";
        if (secaoBordo) secaoBordo.style.display = "block";
        if (secaoPatio2) secaoPatio2.style.display = "none";
        if (tituloPatio1) tituloPatio1.textContent = "1a Parte - Patio";
        if (tituloBordo) tituloBordo.textContent = "2a Parte - Bordo";
    }
}

function controleEmpilhamento() {
    controleDestino();
}

function controleMudancaFluxo() {
    const houve = document.getElementById("houve_mudanca_fluxo").value;
    const container = document.getElementById("mudancaFluxoContainer");
    const btn = document.getElementById("btnAdicionarFluxo");
    
    if (houve === "SIM") {
        container.style.display = "block";
        btn.style.display = "block";
        if (container.children.length === 0) {
            adicionarMudancaFluxo();
        }
    } else {
        container.style.display = "none";
        btn.style.display = "none";
    }
}

function controlePassagem() {
    const houve = document.getElementById("houve_passagem").value;
    const passagemExtra = document.getElementById("passagemExtra");
    passagemExtra.style.display = houve === "SIM" ? "block" : "none";
    
    // Campos obrigatÃ³rios quando houver passagem
    const camposPassagem = [
        "vagoes_meu_turno", "turno_assumiu", "operador_assumiu",
        "matricula_assumiu", "hora_rendicao", "vagoes_proximo_turno", "assumiu_em_falha"
    ];
    
    camposPassagem.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            if (houve === "SIM") {
                campo.setAttribute("required", "required");
            } else {
                campo.removeAttribute("required");
                campo.value = "";
            }
        }
    });
    
    // Limpar campos de falha se nÃ£o houve passagem
    if (houve !== "SIM") {
        document.getElementById("descricao_falha_assumida").value = "";
        document.getElementById("hora_falha_passagem").value = "";
        document.getElementById("falhaAssumidaExtra").style.display = "none";
    }
}

function controleFalhaAssumida() {
    const assumiu = document.getElementById("assumiu_em_falha").value;
    const falhaExtra = document.getElementById("falhaAssumidaExtra");
    falhaExtra.style.display = assumiu === "SIM" ? "block" : "none";
    
    const camposFalha = ["descricao_falha_assumida", "hora_falha_passagem"];
    
    camposFalha.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            if (assumiu === "SIM") {
                campo.setAttribute("required", "required");
            } else {
                campo.removeAttribute("required");
                campo.value = "";
            }
        }
    });
}


function verificarTabelaOutroTurno() {
    const secaoRecebeu = document.getElementById("secaoRecebeuTabela");
    if (!secaoRecebeu) return;
    
    const turnoAtual = document.getElementById("turno").value;
    const operadorAtual = document.getElementById("operador").value.toUpperCase().trim();
    
    // Se hÃ¡ tabela carregada do servidor
    if (tabelaCarregadaInfo) {
        const turnoOriginal = tabelaCarregadaInfo.turno;
        const operadorOriginal = (tabelaCarregadaInfo.operador || "").toUpperCase().trim();
        
        const turnosDiferentes = turnoOriginal && turnoAtual && turnoOriginal !== turnoAtual;
        const operadoresDiferentes = operadorOriginal && operadorAtual && operadorOriginal !== operadorAtual;
        
        // Verificar se houve passagem de turno
        const dados = tabelaCarregadaInfo.dados || {};
        const houvePassagem = dados.houve_passagem === "SIM";
        
        if (turnosDiferentes || operadoresDiferentes || houvePassagem) {
            secaoRecebeu.style.display = "block";
            tornarCamposRecebimentoObrigatorios(true);
            
            // Se houve passagem, preencher campos automaticamente
            if (houvePassagem) {
                document.getElementById("turno_passou_tabela").value = turnoOriginal;
                document.getElementById("operador_passou_tabela").value = operadorOriginal;
                document.getElementById("matricula_passou_tabela").value = dados.matricula_assumiu_passagem || "";
                document.getElementById("hora_assumiu_tabela").value = dados.hora_rendicao || "";
                document.getElementById("vagoes_faltavam_assumir").value = dados.vagoes_proximo_turno || "";
                document.getElementById("recebeu_em_falha").value = dados.assumiu_em_falha || "NAO";
                
                if (dados.assumiu_em_falha === "SIM") {
                    document.getElementById("falha_recebida_desc").value = dados.descricao_falha_assumida || "";
                    document.getElementById("hora_inicio_falha_recebida").value = dados.hora_falha_passagem || "";
                    // Preencher outros campos se necessÃ¡rio
                }
                
                controleRecebeuEmFalha();
            }
            
            return;
        }
    }
    
    // Se nÃ£o hÃ¡ diferenÃ§a, esconder seÃ§Ã£o
    secaoRecebeu.style.display = "none";
    tornarCamposRecebimentoObrigatorios(false);
}

function tornarCamposRecebimentoObrigatorios(obrigatorio) {
    const camposRecebimento = [
        "turno_passou_tabela", "operador_passou_tabela", "matricula_passou_tabela",
        "hora_assumiu_tabela", "vagoes_faltavam_assumir", "recebeu_em_falha"
    ];
    
    camposRecebimento.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            if (obrigatorio) {
                campo.setAttribute("required", "required");
            } else {
                campo.removeAttribute("required");
            }
        }
    });
}

function controleRecebeuEmFalha() {
    const recebeu = document.getElementById("recebeu_em_falha").value;
    const falhaExtra = document.getElementById("recebeuFalhaExtra");
    
    if (falhaExtra) {
        falhaExtra.style.display = recebeu === "SIM" ? "block" : "none";
    }
    
    const camposFalhaRecebida = [
        "falha_recebida_desc", "hora_inicio_falha_recebida", "tempo_parado_h", "tempo_parado_m"
    ];
    
    camposFalhaRecebida.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            if (recebeu === "SIM") {
                campo.setAttribute("required", "required");
            } else {
                campo.removeAttribute("required");
                campo.value = "";
            }
        }
    });
}


function finalizarTurno() {
    // Verificar se tabela foi salva
    if (!tabelaSalva) {
        alert("VocÃª deve salvar a tabela antes de finalizar o turno.\n\nClique em 'Salvar Tabela' primeiro.");
        return;
    }
    
    // Setar houve passagem como SIM
    document.getElementById("houve_passagem").value = "SIM";
    controlePassagem();
    
    // Scroll para a seÃ§Ã£o de passagem
    document.getElementById("passagemExtra").scrollIntoView({ behavior: 'smooth' });
    
    // Alterar o botÃ£o para confirmar passagem
    const btnFinalizarTurno = document.getElementById("btnFinalizarTurno");
    btnFinalizarTurno.textContent = "Confirmar Passagem de Turno";
    btnFinalizarTurno.onclick = confirmarPassagemTurno;
}

async function confirmarPassagemTurno() {
    // Validar campos obrigatÃ³rios de passagem
    const vagoesMeuTurno = document.getElementById("vagoes_meu_turno").value;
    const turnoAssumiu = document.getElementById("turno_assumiu").value;
    const operadorAssumiu = document.getElementById("operador_assumiu").value;
    const matriculaAssumiu = document.getElementById("matricula_assumiu").value;
    const horaRendicao = document.getElementById("hora_rendicao").value;
    const vagoesProximoTurno = document.getElementById("vagoes_proximo_turno").value;
    const assumiuEmFalha = document.getElementById("assumiu_em_falha").value;
    
    if (!vagoesMeuTurno || !turnoAssumiu || !operadorAssumiu || !matriculaAssumiu || !horaRendicao || !vagoesProximoTurno || !assumiuEmFalha) {
        alert("Preencha todos os campos obrigatÃ³rios da passagem de turno.");
        return;
    }
    
    if (assumiuEmFalha === "SIM") {
        const descricaoFalha = document.getElementById("descricao_falha_assumida").value;
        const horaFalha = document.getElementById("hora_falha_passagem").value;
        if (!descricaoFalha || !horaFalha) {
            alert("Preencha os detalhes da falha passada.");
            return;
        }
    }
    
    // Coletar dados
    const dadosFormulario = coletarDadosFormulario();
    
    // Adicionar dados de passagem
    dadosFormulario.houve_passagem = "SIM";
    dadosFormulario.vagoes_meu_turno = vagoesMeuTurno;
    dadosFormulario.turno_assumiu = turnoAssumiu;
    dadosFormulario.operador_assumiu_passagem = operadorAssumiu; // Renomear para evitar conflito
    dadosFormulario.matricula_assumiu_passagem = matriculaAssumiu;
    dadosFormulario.hora_rendicao = horaRendicao;
    dadosFormulario.vagoes_proximo_turno = vagoesProximoTurno;
    dadosFormulario.assumiu_em_falha = assumiuEmFalha;
    if (assumiuEmFalha === "SIM") {
        dadosFormulario.descricao_falha_assumida = document.getElementById("descricao_falha_assumida").value;
        dadosFormulario.hora_falha_passagem = document.getElementById("hora_falha_passagem").value;
    }
    
    const dadosTabela = {
        prefixo: document.getElementById("prefixo").value,
        data: document.getElementById("data").value,
        turno: document.getElementById("turno").value,
        produto: document.getElementById("produto").value,
        operador: document.getElementById("operador").value,
        inicio: document.getElementById("inicio").value,
        dados: dadosFormulario
    };
    
    // Mostrar indicador de salvamento
    const btnConfirmar = document.getElementById("btnFinalizarTurno");
    const textoOriginal = btnConfirmar.textContent;
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = 'Salvando Passagem...';
    
    try {
        const resultado = await salvarTabelaServidor(dadosTabela);
        
        if (resultado.success) {
            alert(`Passagem de turno registrada.\n\nA tabela "${dadosTabela.prefixo}" foi passada para o ${turnoAssumiu}.\n\nO prÃ³ximo turno poderÃ¡ assumir e finalizar esta tabela.`);
            
            // Resetar botÃ£o
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = textoOriginal;
            btnConfirmar.onclick = finalizarTurno;
            
            // Atualizar lista
            await atualizarSeletorTabelas();
        } else {
            alert(`Erro ao salvar passagem: ${resultado.error || 'Erro desconhecido'}`);
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = textoOriginal;
        }
    } catch (error) {
        alert(`Erro de conexÃ£o: ${error.message}\n\nVerifique sua internet.`);
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = textoOriginal;
    }
}

function controleAssuncao() {
    const assumindo = document.getElementById("assumindo_tabela").value;
    const assuncaoExtra = document.getElementById("assuncaoExtra");
    const cardTabelasAndamento = document.getElementById("cardTabelasAndamento");
    const cardsDados = document.querySelectorAll('.card:not(#cardAssuncao):not(#cardTabelasAndamento):not(#cardTabelasFinalizadas)');
    const divSalvar = document.getElementById("divSalvar");
    
    if (assumindo === "NAO" || !assumindo) {
        // Salvar seleÃ§Ã£o
        if (assumindo === "NAO") {
            salvarTipoOperacao("NAO");
        }
        
        // Iniciando nova tabela - mostrar fluxo normal mas sem botÃ£o salvar ainda
        assuncaoExtra.style.display = "none";
        cardTabelasAndamento.style.display = "block";
        // Mostrar todos os outros cards
        cardsDados.forEach(card => card.style.display = "block");
        // Esconder botÃ£o salvar atÃ© preencher dados
        divSalvar.style.display = "none";
        
        // Limpar dados de assunÃ§Ã£o
        document.getElementById("seletorTabelasAssuncao").value = "";
        document.getElementById("dadosAssuncao").style.display = "none";
        
        // Carregar turno e data salvos
        carregarTurnoDataSalvos();
        
        // Verificar se deve mostrar botÃ£o salvar
        verificarMostrarBotaoSalvar();
        
    } else if (assumindo === "SIM") {
        // Salvar seleÃ§Ã£o
        salvarTipoOperacao("SIM");
        
        // Assumindo tabela - mostrar seÃ§Ã£o de assunÃ§Ã£o
        assuncaoExtra.style.display = "block";
        cardTabelasAndamento.style.display = "none";
        // Manter cards de dados ocultos atÃ© selecionar tabela especÃ­fica
        cardsDados.forEach(card => card.style.display = "none");
        // Esconder botÃ£o salvar atÃ© selecionar tabela e preencher dados
        divSalvar.style.display = "none";
        
        // Carregar tabelas disponÃ­veis para assunÃ§Ã£o
        atualizarSeletorTabelasAssuncao();
    } else {
        // Nada selecionado - mostrar cards para que usuÃ¡rio veja o que precisa preencher
        assuncaoExtra.style.display = "none";
        cardTabelasAndamento.style.display = "block";
        // Mostrar todos os outros cards para visualizaÃ§Ã£o
        cardsDados.forEach(card => card.style.display = "block");
        // Esconder botÃ£o salvar atÃ© seleÃ§Ã£o ser feita
        divSalvar.style.display = "none";
    }
}

function controleFalhaRecebida() {
    const recebeu = document.getElementById("recebeu_em_falha_assuncao").value;
    const falhaExtra = document.getElementById("falhaRecebidaExtra");
    
    falhaExtra.style.display = recebeu === "SIM" ? "block" : "none";
    
    // Se recebeu em falha, automaticamente adicionar impacto/falha
    if (recebeu === "SIM") {
        // Verificar se jÃ¡ existe um impacto para "iniciou o turno com falha"
        const impactosExistentes = document.querySelectorAll(".impacto-row");
        let jaExiste = false;
        let impactoExistente = null;
        impactosExistentes.forEach(row => {
            const desc = row.querySelector(".impacto-desc")?.value || "";
            if (desc.toLowerCase().includes("iniciou o turno com falha")) {
                jaExiste = true;
                impactoExistente = row;
            }
        });
        
        if (!jaExiste) {
            // Adicionar impacto automaticamente
            adicionarImpacto();
            const novoImpacto = document.querySelector(".impacto-row:last-child");
            if (novoImpacto) {
                const descField = novoImpacto.querySelector(".impacto-desc");
                const falhaDesc = document.getElementById("falha_recebida_desc_assuncao").value;
                if (descField) {
                    descField.value = falhaDesc ? `Iniciou o turno com falha: ${falhaDesc}` : "Iniciou o turno com falha";
                }
            }
        } else if (impactoExistente) {
            // Atualizar descriÃ§Ã£o existente
            const descField = impactoExistente.querySelector(".impacto-desc");
            const falhaDesc = document.getElementById("falha_recebida_desc_assuncao").value;
            if (descField) {
                descField.value = falhaDesc ? `Iniciou o turno com falha: ${falhaDesc}` : "Iniciou o turno com falha";
            }
        }
    }
}

async function carregarTabelaAssuncao() {
    const select = document.getElementById("seletorTabelasAssuncao");
    const tabelaId = select.value;
    const dadosAssuncao = document.getElementById("dadosAssuncao");
    
    if (!tabelaId) {
        dadosAssuncao.style.display = "none";
        return;
    }
    
    const tabelas = await obterTabelasAndamentoServidor();
    const tabela = tabelas.find(t => t.id == tabelaId);
    
    if (!tabela) {
        alert("Tabela nÃ£o encontrada.");
        return;
    }
    
    // Mostrar dados da tabela selecionada
    const infoTabela = `
        <div class="info-tabela-assuncao">
            <h4>Tabela Selecionada: ${tabela.prefixo}</h4>
            <p><strong>Data:</strong> ${tabela.data}</p>
            <p><strong>Turno Anterior:</strong> ${tabela.turno}</p>
            <p><strong>Operador Anterior:</strong> ${tabela.operador}</p>
            <p><strong>Produto:</strong> ${tabela.produto}</p>
            <p><strong>Equipamento:</strong> ${tabela.dados.equipamento || 'NÃ£o informado'}</p>
            <p><strong>InÃ­cio:</strong> ${tabela.inicio}</p>
            <p><strong>Salvo em:</strong> ${tabela.salvoEm}</p>
        </div>
    `;
    
    dadosAssuncao.innerHTML = infoTabela + dadosAssuncao.innerHTML;
    dadosAssuncao.style.display = "block";
    
    // Preencher automaticamente dados do turno anterior
    document.getElementById("turno_passou_tabela").value = tabela.turno;
    document.getElementById("operador_passou_tabela").value = tabela.operador;
    // MatrÃ­cula do anterior pode nÃ£o estar disponÃ­vel, deixar em branco
    
    // Preencher dados gerais da tabela
    document.getElementById("produto").value = tabela.produto;
    atualizarEquipamentos();
    document.getElementById("equipamento").value = tabela.dados.equipamento || "";
    document.getElementById("prefixo").value = tabela.prefixo;
    document.getElementById("data").value = tabela.data;
    document.getElementById("inicio").value = tabela.inicio;
    
    // Restaurar outros dados da tabela
    const dados = tabela.dados;
    CAMPOS_FORMULARIO.forEach(id => {
        if (id !== "operador" && id !== "matricula" && id !== "turno" && 
            id !== "operador_assumiu" && id !== "matricula_assumiu" && id !== "turno_assumiu") {
            const elemento = document.getElementById(id);
            if (elemento && dados[id] !== undefined) {
                elemento.value = dados[id];
            }
        }
    });
    
    // Atualizar controles visuais
    controleProduto();
    controleDestino();
    controleTipoDivisao();
    controleMudancaFluxo();
    controlePassagem();
    controleFalhaAssumida();
    
    // Mostrar cards de dados apÃ³s carregar tabela
    const cardsDados = document.querySelectorAll('.card:not(#cardAssuncao):not(#cardTabelasAndamento):not(#cardTabelasFinalizadas)');
    cardsDados.forEach(card => card.style.display = "block");
    
    // Verificar se deve mostrar botÃ£o salvar
    verificarMostrarBotaoSalvar();
    
    alert(`Tabela "${tabela.prefixo}" carregada para assunÃ§Ã£o.\n\nAgora preencha seus dados pessoais obrigatÃ³rios e a situaÃ§Ã£o atual da tabela.`);
}

function verificarMostrarBotaoSalvar() {
    const assumindo = document.getElementById("assumindo_tabela").value;
    const divSalvar = document.getElementById("divSalvar");
    const btnFinalizarTurno = document.getElementById("btnFinalizarTurno");
    
    if (assumindo === "NAO" || !assumindo) {
        // Para nova tabela, exigir dados iniciais completos antes de salvar inÃ­cio.
        if (validarCamposIniciaisNovaTabela(false).valido) {
            divSalvar.style.display = "block";
            // Mostrar finalizar turno apenas se tabela jÃ¡ foi salva
            btnFinalizarTurno.style.display = tabelaSalva ? "inline-block" : "none";
        } else {
            divSalvar.style.display = "none";
            btnFinalizarTurno.style.display = "none";
        }
        
    } else if (assumindo === "SIM") {
        // Para assunÃ§Ã£o, verificar campos obrigatÃ³rios de assunÃ§Ã£o
        const operadorAssumiu = document.getElementById("operador_assumiu_assuncao").value;
        const matriculaAssumiu = document.getElementById("matricula_assumiu_assuncao").value;
        const turnoAssumiu = document.getElementById("turno_assumiu_assuncao").value;
        const vagoesFaltavam = document.getElementById("vagoes_faltavam_assumir_assuncao").value;
        
        if (operadorAssumiu && matriculaAssumiu && turnoAssumiu && vagoesFaltavam) {
            divSalvar.style.display = "block";
            // Mostrar finalizar turno apenas se tabela jÃ¡ foi salva
            btnFinalizarTurno.style.display = tabelaSalva ? "inline-block" : "none";
        } else {
            divSalvar.style.display = "none";
            btnFinalizarTurno.style.display = "none";
        }
    }
}

function estaElementoVisivel(el) {
    return !!(el && el.offsetParent !== null);
}

function valorCampo(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return (el.value || "").trim();
}

function validarCamposObrigatorios(campos, mostrarMensagem = true) {
    for (const campo of campos) {
        if (!valorCampo(campo.id)) {
            if (mostrarMensagem) {
                alert(`Preencha o campo obrigatório: ${campo.nome}.`);
                const el = document.getElementById(campo.id);
                if (el) el.focus();
            }
            return { valido: false, campo: campo.id };
        }
    }
    return { valido: true };
}

function validarDestinoBordo(mostrarMensagem = true) {
    const destino = valorCampo("destino");
    if (destino !== "BORDO") return { valido: true };

    const validacao = validarCamposObrigatorios([
        { id: "passando_por", nome: "TM de passagem (TM107/TM108)" }
    ], mostrarMensagem);
    return validacao;
}

function validarEmpilhamento(mostrarMensagem = true) {
    const empilhando = valorCampo("empilhando") || "NAO";
    if (empilhando !== "SIM") return { valido: true };

    return validarCamposObrigatorios([
        { id: "patio_nome", nome: "Pátio (origem/empilhamento)" },
        { id: "baliza", nome: "Baliza (origem/empilhamento)" },
        { id: "maquina_patio", nome: "Máquina (ER2, ER1A, E3 ou E4)" }
    ], mostrarMensagem);
}

function validarTabelaFracionada(mostrarMensagem = true) {
    const destino = valorCampo("destino");
    if (destino !== "PARTIDA") return { valido: true };

    const tipo = valorCampo("tipo_divisao") || "PATIO_BORDO";
    const comuns = [
        { id: "tipo_divisao", nome: "Tipo de divisão" }
    ];

    const vComuns = validarCamposObrigatorios(comuns, mostrarMensagem);
    if (!vComuns.valido) return vComuns;

    if (tipo === "PATIO_PATIO") {
        return validarCamposObrigatorios([
            { id: "vagoes_patio", nome: "Vagões da 1ª parte (pátio)" },
            { id: "patio_partida", nome: "Pátio da 1ª parte" },
            { id: "baliza_partida", nome: "Baliza da 1ª parte" },
            { id: "maquina_patio1", nome: "Máquina da 1ª parte" },
            { id: "hora_inicio_patio", nome: "Hora início da 1ª parte" },
            { id: "hora_fim_patio", nome: "Hora fim da 1ª parte" },
            { id: "vagoes_patio2", nome: "Vagões da 2ª parte (pátio)" },
            { id: "patio_partida2", nome: "Pátio da 2ª parte" },
            { id: "baliza_partida2", nome: "Baliza da 2ª parte" },
            { id: "maquina_patio2", nome: "Máquina da 2ª parte" },
            { id: "hora_inicio_patio2", nome: "Hora início da 2ª parte" },
            { id: "hora_fim_patio2", nome: "Hora fim da 2ª parte" }
        ], mostrarMensagem);
    }

    if (tipo === "BORDO_PATIO") {
        return validarCamposObrigatorios([
            { id: "passando_por_partida", nome: "TM da parte de bordo" },
            { id: "vagoes_bordo", nome: "Vagões da 1ª parte (bordo)" },
            { id: "hora_inicio_bordo", nome: "Hora início da parte bordo" },
            { id: "hora_fim_bordo", nome: "Hora fim da parte bordo" },
            { id: "vagoes_patio2", nome: "Vagões da 2ª parte (pátio)" },
            { id: "patio_partida2", nome: "Pátio da 2ª parte" },
            { id: "baliza_partida2", nome: "Baliza da 2ª parte" },
            { id: "maquina_patio2", nome: "Máquina da 2ª parte" },
            { id: "hora_inicio_patio2", nome: "Hora início da 2ª parte" },
            { id: "hora_fim_patio2", nome: "Hora fim da 2ª parte" }
        ], mostrarMensagem);
    }

    return validarCamposObrigatorios([
        { id: "vagoes_patio", nome: "Vagões da 1ª parte (pátio)" },
        { id: "patio_partida", nome: "Pátio da 1ª parte" },
        { id: "baliza_partida", nome: "Baliza da 1ª parte" },
        { id: "maquina_patio1", nome: "Máquina da 1ª parte" },
        { id: "hora_inicio_patio", nome: "Hora início da 1ª parte" },
        { id: "hora_fim_patio", nome: "Hora fim da 1ª parte" },
        { id: "passando_por_partida", nome: "TM da 2ª parte (bordo)" },
        { id: "vagoes_bordo", nome: "Vagões da 2ª parte (bordo)" },
        { id: "hora_inicio_bordo", nome: "Hora início da 2ª parte" },
        { id: "hora_fim_bordo", nome: "Hora fim da 2ª parte" }
    ], mostrarMensagem);
}

function validarMateriaisCarvao(mostrarMensagem = true) {
    const produto = document.getElementById("produto")?.value || "";
    if (!isProdutoCarvao(produto)) return { valido: true };

    const linhas = document.querySelectorAll(".material-carvao-row");
    if (linhas.length === 0) {
        if (mostrarMensagem) alert("Adicione ao menos um material na ECV (carvão/coque).");
        return { valido: false };
    }

    for (const row of linhas) {
        const checks = [
            [".carvao-categoria", "Categoria do material"],
            [".carvao-tipo-material", "Tipo de material"],
            [".carvao-patio", "Pátio de origem"],
            [".carvao-baliza", "Baliza de origem"],
            [".carvao-recuperadora", "Máquina de origem (R5/R1A)"]
        ];

        for (const [selector, nome] of checks) {
            const campo = row.querySelector(selector);
            if (!campo || !String(campo.value || "").trim()) {
                if (mostrarMensagem) {
                    alert(`Preencha ${nome} em todos os materiais da ECV.`);
                    campo?.focus();
                }
                return { valido: false };
            }
        }
    }

    return { valido: true };
}

function validarCamposIniciaisNovaTabela(mostrarMensagem = true) {
    const campos = [
        { id: "maquinista", nome: "Nome do Maquinista" },
        { id: "loc1", nome: "NumeraÃ§Ã£o da 1Âª Locomotiva" },
        { id: "horas_maquinista", nome: "Hora de contato com Maquinista" },
        { id: "ponto_b", nome: "Passagem pelo Ponto B" },
        { id: "tabela_posicionada", nome: "Tabela Posicionada" },
        { id: "data", nome: "Data" },
        { id: "turno", nome: "Turno" },
        { id: "operador", nome: "Nome do Operador" },
        { id: "matricula", nome: "MatrÃ­cula" },
        { id: "prefixo", nome: "Prefixo / Trem" },
        { id: "inicio", nome: "InÃ­cio" }
    ];

    for (const campo of campos) {
        if (!valorCampo(campo.id)) {
            if (mostrarMensagem) {
                alert(`Preencha o campo obrigatÃ³rio: ${campo.nome}.`);
                const el = document.getElementById(campo.id);
                if (el) el.focus();
            }
            return { valido: false, campo: campo.id };
        }
    }

    const sinalContainer = document.getElementById("sinalContainer");
    if (estaElementoVisivel(sinalContainer) && !valorCampo("sinal")) {
        if (mostrarMensagem) {
            alert("Preencha o campo obrigatÃ³rio: Passagem pelo Sinal.");
            const el = document.getElementById("sinal");
            if (el) el.focus();
        }
        return { valido: false, campo: "sinal" };
    }

    const vBordo = validarDestinoBordo(mostrarMensagem);
    if (!vBordo.valido) return vBordo;

    const vEmp = validarEmpilhamento(mostrarMensagem);
    if (!vEmp.valido) return vEmp;

    const vFracionada = validarTabelaFracionada(mostrarMensagem);
    if (!vFracionada.valido) return vFracionada;

    const vCarvao = validarMateriaisCarvao(mostrarMensagem);
    if (!vCarvao.valido) return vCarvao;

    return { valido: true };
}

function validarCamposRecebimento() {
    const secaoRecebeu = document.getElementById("secaoRecebeuTabela");
    if (!secaoRecebeu || secaoRecebeu.style.display === "none") {
        return { valido: true };
    }
    
    const camposObrigatorios = [
        { id: "turno_passou_tabela", nome: "Turno que passou a tabela" },
        { id: "operador_passou_tabela", nome: "Operador que passou a tabela" },
        { id: "matricula_passou_tabela", nome: "MatrÃ­cula do operador que passou" },
        { id: "hora_assumiu_tabela", nome: "Hora que assumiu a tabela" },
        { id: "vagoes_faltavam_assumir", nome: "VagÃµes que faltavam descarregar" },
        { id: "recebeu_em_falha", nome: "Se recebeu em falha" }
    ];
    
    for (const campo of camposObrigatorios) {
        const elemento = document.getElementById(campo.id);
        if (!elemento || !elemento.value) {
            return { 
                valido: false, 
                mensagem: `Campo obrigatÃ³rio: ${campo.nome}\n\nComo vocÃª estÃ¡ finalizando uma tabela de outro turno, Ã© necessÃ¡rio preencher todos os dados de como recebeu a tabela.`
            };
        }
    }
    
    // Se recebeu em falha, validar campos adicionais
    if (document.getElementById("recebeu_em_falha").value === "SIM") {
        const camposFalha = [
            { id: "falha_recebida_desc", nome: "DescriÃ§Ã£o da falha recebida" },
            { id: "hora_inicio_falha_recebida", nome: "Hora de inÃ­cio da falha" }
        ];
        
        for (const campo of camposFalha) {
            const elemento = document.getElementById(campo.id);
            if (!elemento || !elemento.value) {
                return { 
                    valido: false, 
                    mensagem: `Campo obrigatÃ³rio: ${campo.nome}\n\nComo vocÃª recebeu a tabela em falha, Ã© necessÃ¡rio informar os detalhes.`
                };
            }
        }
    }
    
    return { valido: true };
}


async function obterTabelasAndamentoServidor() {
    try {
        const response = await fetch('/api/tabelas/andamento');
        const data = await response.json();
        tabelasAndamentoCache = data.tabelas || [];
        return tabelasAndamentoCache;
    } catch (error) {
        console.error('Erro ao obter tabelas:', error);
        return [];
    }
}

async function obterTabelasFinalizadasServidor() {
    try {
        const response = await fetch('/api/tabelas/finalizadas');
        const data = await response.json();
        tabelasFinalizadasCache = data.tabelas || [];
        return tabelasFinalizadasCache;
    } catch (error) {
        console.error('Erro ao obter tabelas finalizadas:', error);
        return [];
    }
}

async function salvarTabelaServidor(dadosTabela) {
    try {
        const response = await fetch('/api/tabelas/andamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosTabela)
        });
        return await response.json();
    } catch (error) {
        console.error('Erro ao salvar tabela:', error);
        return { success: false, error: error.message };
    }
}

async function excluirTabelaServidor(tabelaId) {
    try {
        const response = await fetch(`/api/tabelas/andamento/${tabelaId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Erro ao excluir tabela:', error);
        return { success: false, error: error.message };
    }
}

async function finalizarTabelaServidor(tabelaId, dadosFinalizacao) {
    try {
        const response = await fetch(`/api/tabelas/finalizar/${tabelaId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosFinalizacao)
        });
        return await response.json();
    } catch (error) {
        console.error('Erro ao finalizar tabela:', error);
        return { success: false, error: error.message };
    }
}

async function excluirTabelaFinalizadaServidor(tabelaId) {
    try {
        const response = await fetch(`/api/tabelas/finalizadas/${tabelaId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Erro ao excluir tabela finalizada:', error);
        return { success: false, error: error.message };
    }
}


async function atualizarListaTabelas() {
    const btnAtualizar = document.getElementById("btnAtualizarTabelas");
    if (btnAtualizar) {
        btnAtualizar.disabled = true;
        btnAtualizar.textContent = "Atualizando...";
    }
    
    try {
        await Promise.all([
            atualizarSeletorTabelas(),
            atualizarListaFinalizadas()
        ]);
    } finally {
        if (btnAtualizar) {
            btnAtualizar.disabled = false;
            btnAtualizar.textContent = "Atualizar Lista";
        }
    }
}

function iniciarAtualizacaoAutomatica(intervaloSegundos = 30) {
    pararAtualizacaoAutomatica();
    atualizacaoAutomaticaInterval = setInterval(async () => {
        await atualizarListaTabelas();
        atualizarIndicadorSincronizacao();
    }, intervaloSegundos * 1000);
    console.log(`AtualizaÃ§Ã£o automÃ¡tica iniciada (a cada ${intervaloSegundos}s)`);
}

function pararAtualizacaoAutomatica() {
    if (atualizacaoAutomaticaInterval) {
        clearInterval(atualizacaoAutomaticaInterval);
        atualizacaoAutomaticaInterval = null;
    }
}

function atualizarIndicadorSincronizacao() {
    const indicador = document.getElementById("indicadorSincronizacao");
    if (indicador) {
        const agora = new Date().toLocaleTimeString('pt-BR');
        indicador.textContent = `Ãšltima sincronizaÃ§Ã£o: ${agora}`;
        indicador.textContent = limparTextoCorrompido(indicador.textContent);
    }
}

function obterTabelasAndamento() {
    return tabelasAndamentoCache;
}

function coletarDadosFormulario() {
    const dados = {};
    
    // Salvar campos simples
    CAMPOS_FORMULARIO.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            dados[id] = elemento.value;
        }
    });
    
    // Salvar impactos
    dados.impactos = [];
    document.querySelectorAll(".impacto-row").forEach(row => {
        const h = parseInt(row.querySelector(".impacto-h")?.value || 0);
        const m = parseInt(row.querySelector(".impacto-m")?.value || 0);
        dados.impactos.push({
            desc: row.querySelector(".impacto-desc")?.value || "",
            h: h,
            m: m,
            hora_inicio: row.querySelector(".impacto-hora-inicio")?.value || "",
            hora_fim: row.querySelector(".impacto-hora-fim")?.value || "",
            atend_mecanica_prev: row.querySelector(".impacto-atend-mecanica-prev")?.checked || false,
            atend_mecanica_corr: row.querySelector(".impacto-atend-mecanica-corr")?.checked || false,
            atend_eletrica_prev: row.querySelector(".impacto-atend-eletrica-prev")?.checked || false,
            atend_eletrica_corr: row.querySelector(".impacto-atend-eletrica-corr")?.checked || false,
            atend_operacional: row.querySelector(".impacto-atend-operacional")?.checked || false,
            acao: row.querySelector(".impacto-acao")?.value || ""
        });
    });
    
    // Salvar materiais carvÃ£o
    dados.materiais_carvao = [];
    document.querySelectorAll(".material-carvao-row").forEach(row => {
        dados.materiais_carvao.push({
            categoria: row.querySelector(".carvao-categoria")?.value || "",
            tipo_material: row.querySelector(".carvao-tipo-material")?.value || "",
            patio: row.querySelector(".carvao-patio")?.value || "",
            baliza: row.querySelector(".carvao-baliza")?.value || "",
            recuperadora: row.querySelector(".carvao-recuperadora")?.value || "",
            acao: row.querySelector(".carvao-acao")?.value || "",
            hora_inicio: row.querySelector(".carvao-hora-inicio")?.value || "",
            hora_fim: row.querySelector(".carvao-hora-fim")?.value || "",
            peso_ecv: row.querySelector(".carvao-peso-ecv")?.value || "",
            peso_recup: row.querySelector(".carvao-peso-recup")?.value || "",
            vagoes: row.querySelector(".carvao-vagoes")?.value || ""
        });
    });
    
    // Salvar mudanÃ§as de fluxo
    dados.mudancas_fluxo = [];
    document.querySelectorAll(".fluxo-row").forEach(row => {
        dados.mudancas_fluxo.push({
            hora: row.querySelector(".fluxo-hora")?.value || "",
            anterior: row.querySelector(".fluxo-anterior")?.value || "",
            novo: row.querySelector(".fluxo-novo")?.value || "",
            cco: row.querySelector(".fluxo-cco")?.checked || false,
            mecanica_corretiva: row.querySelector(".fluxo-mecanica-corretiva")?.checked || false,
            mecanica_preventiva: row.querySelector(".fluxo-mecanica-preventiva")?.checked || false,
            eletrica_corretiva: row.querySelector(".fluxo-eletrica-corretiva")?.checked || false,
            eletrica_preventiva: row.querySelector(".fluxo-eletrica-preventiva")?.checked || false,
            operacao: row.querySelector(".fluxo-operacao")?.checked || false,
            motivo: row.querySelector(".fluxo-motivo")?.value || ""
        });
    });
    
    return dados;
}

async function salvarTabelaInicio() {
    let assumindo = document.getElementById("assumindo_tabela").value;
    
    // Se nÃ£o selecionou, assumir como nova tabela
    if (!assumindo) {
        assumindo = "NAO";
    }
    
    const prefixo = document.getElementById("prefixo").value;
    const inicio = document.getElementById("inicio").value;
    const data = document.getElementById("data").value;
    const turno = document.getElementById("turno").value;
    const produto = document.getElementById("produto").value;
    const operador = document.getElementById("operador").value;

    if (assumindo === "NAO") {
        const validacaoInicial = validarCamposIniciaisNovaTabela(true);
        if (!validacaoInicial.valido) {
            return;
        }
    }
    
    // Se estÃ¡ assumindo tabela, validar campos obrigatÃ³rios
    if (assumindo === "SIM") {
        const operadorAssumiu = document.getElementById("operador_assumiu_assuncao").value;
        const matriculaAssumiu = document.getElementById("matricula_assumiu_assuncao").value;
        const turnoAssumiu = document.getElementById("turno_assumiu_assuncao").value;
        const vagoesFaltavam = document.getElementById("vagoes_faltavam_assumir_assuncao").value;
        
        if (!operadorAssumiu || !matriculaAssumiu || !turnoAssumiu || !vagoesFaltavam) {
            alert("Preencha todos os dados obrigatÃ³rios da assunÃ§Ã£o.");
            return;
        }
        
        // Preencher referÃªncia de recebimento automaticamente
        document.getElementById("hora_assumiu_tabela").value = new Date().toTimeString().slice(0, 5);
    }
    
    const dadosFormulario = coletarDadosFormulario();
    
    const dadosTabela = {
        prefixo: prefixo,
        data: data,
        turno: turno,
        produto: produto,
        operador: operador,
        inicio: inicio,
        dados: dadosFormulario
    };
    
    // Mostrar indicador de salvamento
    const btnSalvar = document.getElementById("btnSalvarGlobal");
    const textoOriginal = btnSalvar ? btnSalvar.textContent : '';
    if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';
    }
    
    try {
        const resultado = await salvarTabelaServidor(dadosTabela);
        
        if (resultado.success) {
            tabelaSalva = true; // Marcar que tabela foi salva
            
            if (resultado.atualizado) {
                alert(`InÃ­cio da tabela "${prefixo}" atualizado no servidor.\n\nOutros usuÃ¡rios podem ver esta tabela.\n\nOs dados preenchidos continuam salvos localmente mesmo que vocÃª recarregue a pÃ¡gina.`);
            } else {
                alert(`InÃ­cio da tabela "${prefixo}" salvo no servidor.\n\nOutros usuÃ¡rios podem ver e finalizar esta tabela.\n\nQuando quiser finalizar, selecione-a na lista "Tabelas em Andamento".\n\nSeus dados ficam salvos localmente e persistem apÃ³s recarregar a pÃ¡gina.`);
            }
            
            await atualizarSeletorTabelas();
            
            document.getElementById("seletorTabelasAndamento").value = resultado.id;
            const tabela = tabelasAndamentoCache.find(t => t.id === resultado.id);
            if (tabela) {
                mostrarInfoTabelaSelecionada(tabela);
            }
        } else {
            alert(`Erro ao salvar tabela: ${resultado.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        alert(`Erro de conexÃ£o: ${error.message}\n\nVerifique sua internet.`);
    } finally {
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.textContent = textoOriginal;
        }
    }
}

async function atualizarSeletorTabelas() {
    const select = document.getElementById("seletorTabelasAndamento");
    const tabelas = await obterTabelasAndamentoServidor();
    
    select.innerHTML = '<option value="">-- Nova Tabela --</option>';
    
    tabelas.forEach(tabela => {
        const option = document.createElement("option");
        option.value = tabela.id;
        
        let dataFormatada = "";
        if (tabela.data) {
            const [ano, mes, dia] = tabela.data.split("-");
            dataFormatada = `${dia}/${mes}`;
        }
        
        const produtoLabel = isProdutoCarvao(tabela.produto) ? "CARVAO" : "MINERIO";
        option.textContent = `${produtoLabel} | ${tabela.prefixo} | ${dataFormatada} | ${tabela.turno} | ${tabela.inicio} | ${tabela.operador || '-'}`;
        select.appendChild(option);
    });
    
    const contador = document.getElementById("contadorTabelas");
    if (contador) {
        contador.textContent = `(${tabelas.length} tabela${tabelas.length !== 1 ? 's' : ''})`;
    }
}

function mostrarInfoTabelaSelecionada(tabela) {
    const info = document.getElementById("infoTabelaSelecionada");
    
    if (!tabela) {
        info.style.display = "none";
        return;
    }
    
    let dataFormatada = "";
    if (tabela.data) {
        const [ano, mes, dia] = tabela.data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }
    
    info.innerHTML = `
        <strong>Tabela Carregada:</strong><br>
        Prefixo: ${tabela.prefixo}<br>
        Data: ${dataFormatada}<br>
        Turno: ${tabela.turno}<br>
        InÃ­cio: ${tabela.inicio}<br>
        Operador: ${tabela.operador || '-'}<br>
        <small>Salvo em: ${tabela.salvoEm}</small>
    `;
    info.style.display = "block";
}

function carregarTabelaAndamento() {
    const select = document.getElementById("seletorTabelasAndamento");
    const tabelaId = select.value;
    
    if (!tabelaId) {
        document.getElementById("infoTabelaSelecionada").style.display = "none";
        return;
    }
    
    const tabelas = obterTabelasAndamento();
    const tabela = tabelas.find(t => t.id == tabelaId);
    
    if (!tabela) {
        alert("Tabela nÃ£o encontrada.");
        return;
    }
    
    if (!confirm(`Carregar a tabela "${tabela.prefixo}"?\n\nOs dados atuais do formulÃ¡rio serÃ£o substituÃ­dos.`)) {
        select.value = "";
        return;
    }
    
    // Limpar containers dinÃ¢micos
    document.getElementById("impactosContainer").innerHTML = "";
    document.getElementById("materiaisCarvaoContainer").innerHTML = "";
    document.getElementById("mudancaFluxoContainer").innerHTML = "";
    
    const dados = tabela.dados;
    
    // Restaurar campos simples
    CAMPOS_FORMULARIO.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento && dados[id] !== undefined) {
            elemento.value = dados[id];
        }
    });
    
    // Quando carrega uma tabela existente para finalizar, nÃ£o estÃ¡ assumindo
    document.getElementById("assumindo_tabela").value = "NAO";
    controleAssuncao();
    
    tabelaSalva = false; // Resetar flag pois tabela foi carregada mas nÃ£o salva ainda
    
    // Atualizar controles visuais
    atualizarEquipamentos();
    controleProduto();
    controleDestino();
    controleTipoDivisao();
    controleMudancaFluxo();
    controlePassagem();
    controleFalhaAssumida();
    
    // Restaurar impactos
    if (dados.impactos && dados.impactos.length > 0) {
        dados.impactos.forEach(imp => {
            adicionarImpacto();
            const rows = document.querySelectorAll(".impacto-row");
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                if (lastRow.querySelector(".impacto-desc")) lastRow.querySelector(".impacto-desc").value = imp.desc;
                if (lastRow.querySelector(".impacto-h")) lastRow.querySelector(".impacto-h").value = imp.h || "";
                if (lastRow.querySelector(".impacto-m")) lastRow.querySelector(".impacto-m").value = imp.m || "";
                if (lastRow.querySelector(".impacto-hora-inicio")) lastRow.querySelector(".impacto-hora-inicio").value = imp.hora_inicio;
                if (lastRow.querySelector(".impacto-hora-fim")) lastRow.querySelector(".impacto-hora-fim").value = imp.hora_fim;
                if (lastRow.querySelector(".impacto-atend-mecanica-prev")) lastRow.querySelector(".impacto-atend-mecanica-prev").checked = imp.atend_mecanica_prev;
                if (lastRow.querySelector(".impacto-atend-mecanica-corr")) lastRow.querySelector(".impacto-atend-mecanica-corr").checked = imp.atend_mecanica_corr;
                if (lastRow.querySelector(".impacto-atend-eletrica-prev")) lastRow.querySelector(".impacto-atend-eletrica-prev").checked = imp.atend_eletrica_prev;
                if (lastRow.querySelector(".impacto-atend-eletrica-corr")) lastRow.querySelector(".impacto-atend-eletrica-corr").checked = imp.atend_eletrica_corr;
                if (lastRow.querySelector(".impacto-atend-operacional")) lastRow.querySelector(".impacto-atend-operacional").checked = imp.atend_operacional;
                if (lastRow.querySelector(".impacto-acao")) lastRow.querySelector(".impacto-acao").value = imp.acao;
            }
        });
    }
    
    // Restaurar materiais carvÃ£o
    if (dados.materiais_carvao && dados.materiais_carvao.length > 0) {
        dados.materiais_carvao.forEach(mat => {
            adicionarMaterialCarvao();
            const rows = document.querySelectorAll(".material-carvao-row");
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                if (lastRow.querySelector(".carvao-categoria")) lastRow.querySelector(".carvao-categoria").value = mat.categoria;
                if (lastRow.querySelector(".carvao-tipo-material")) lastRow.querySelector(".carvao-tipo-material").value = mat.tipo_material;
                if (lastRow.querySelector(".carvao-patio")) lastRow.querySelector(".carvao-patio").value = mat.patio;
                if (lastRow.querySelector(".carvao-baliza")) lastRow.querySelector(".carvao-baliza").value = mat.baliza;
                if (lastRow.querySelector(".carvao-recuperadora")) lastRow.querySelector(".carvao-recuperadora").value = mat.recuperadora;
                if (lastRow.querySelector(".carvao-acao")) lastRow.querySelector(".carvao-acao").value = mat.acao;
                if (lastRow.querySelector(".carvao-hora-inicio")) lastRow.querySelector(".carvao-hora-inicio").value = mat.hora_inicio;
                if (lastRow.querySelector(".carvao-hora-fim")) lastRow.querySelector(".carvao-hora-fim").value = mat.hora_fim;
                if (lastRow.querySelector(".carvao-peso-ecv")) lastRow.querySelector(".carvao-peso-ecv").value = mat.peso_ecv;
                if (lastRow.querySelector(".carvao-peso-recup")) lastRow.querySelector(".carvao-peso-recup").value = mat.peso_recup;
                if (lastRow.querySelector(".carvao-vagoes")) lastRow.querySelector(".carvao-vagoes").value = mat.vagoes;
            }
        });
    }
    
    // Restaurar mudanças de fluxo
    if (dados.mudancas_fluxo && dados.mudancas_fluxo.length > 0) {
        dados.mudancas_fluxo.forEach(fluxo => {
            adicionarMudancaFluxo();
            const rows = document.querySelectorAll(".fluxo-row");
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                if (lastRow.querySelector(".fluxo-hora")) lastRow.querySelector(".fluxo-hora").value = fluxo.hora;
                if (lastRow.querySelector(".fluxo-anterior")) lastRow.querySelector(".fluxo-anterior").value = fluxo.anterior;
                if (lastRow.querySelector(".fluxo-novo")) lastRow.querySelector(".fluxo-novo").value = fluxo.novo;
                if (lastRow.querySelector(".fluxo-cco")) lastRow.querySelector(".fluxo-cco").checked = fluxo.cco;
                if (lastRow.querySelector(".fluxo-mecanica-corretiva")) lastRow.querySelector(".fluxo-mecanica-corretiva").checked = fluxo.mecanica_corretiva;
                if (lastRow.querySelector(".fluxo-mecanica-preventiva")) lastRow.querySelector(".fluxo-mecanica-preventiva").checked = fluxo.mecanica_preventiva;
                if (lastRow.querySelector(".fluxo-eletrica-corretiva")) lastRow.querySelector(".fluxo-eletrica-corretiva").checked = fluxo.eletrica_corretiva;
                if (lastRow.querySelector(".fluxo-eletrica-preventiva")) lastRow.querySelector(".fluxo-eletrica-preventiva").checked = fluxo.eletrica_preventiva;
                if (lastRow.querySelector(".fluxo-operacao")) lastRow.querySelector(".fluxo-operacao").checked = fluxo.operacao;
                if (lastRow.querySelector(".fluxo-motivo")) lastRow.querySelector(".fluxo-motivo").value = fluxo.motivo;
            }
        });
    }
    
    mostrarInfoTabelaSelecionada(tabela);
    
    // Guardar informações da tabela carregada
    tabelaCarregadaInfo = {
        turno: tabela.turno,
        operador: tabela.operador,
        prefixo: tabela.prefixo,
        dados: dados
    };
    
    // Verificar se está finalizando tabela de outro turno
    setTimeout(() => {
        verificarTabelaOutroTurno();
    }, 500);
    
    // Rolar para o campo de término
    document.getElementById("termino").scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById("termino").focus();
    
    alert(`Tabela "${tabela.prefixo}" carregada.\n\nAgora preencha o Término e gere o resultado.\n\nSe você é de outro turno/operador, preencha os dados de como recebeu a tabela.`);
}

async function excluirTabelaAndamento() {
    const select = document.getElementById("seletorTabelasAndamento");
    const tabelaId = select.value;
    
    if (!tabelaId) {
        alert("Selecione uma tabela para excluir.");
        return;
    }
    
    const tabelas = obterTabelasAndamento();
    const tabela = tabelas.find(t => t.id == tabelaId);
    
    if (!tabela) {
        alert("Tabela não encontrada.");
        return;
    }
    
    if (!confirm(`Excluir a tabela "${tabela.prefixo}" do servidor?\n\nEsta ação não pode ser desfeita e afetará todos os usuários.`)) {
        return;
    }
    
    try {
        const resultado = await excluirTabelaServidor(tabelaId);
        
        if (resultado.success) {
            await atualizarSeletorTabelas();
            document.getElementById("infoTabelaSelecionada").style.display = "none";
            alert(`Tabela "${tabela.prefixo}" excluída do servidor.`);
        } else {
            alert(`Erro ao excluir: ${resultado.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        alert(`Erro de conexão: ${error.message}`);
    }
}

async function atualizarListaFinalizadas() {
    const container = document.getElementById("listaFinalizadas");
    if (!container) return;
    
    const tabelas = await obterTabelasFinalizadasServidor();
    
    if (tabelas.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">Nenhuma tabela finalizada ainda.</p>';
        return;
    }
    
    let html = '<div class="tabelas-finalizadas-lista">';
    
    tabelas.forEach(tabela => {
        let dataFormatada = "";
        if (tabela.data) {
            const [ano, mes, dia] = tabela.data.split("-");
            dataFormatada = `${dia}/${mes}/${ano}`;
        }
        
        const produtoLabel = isProdutoCarvao(tabela.produto) ? "CARVAO" : "MINERIO";
        
        html += `
            <div class="tabela-finalizada-item" data-id="${tabela.id}">
                <div class="tabela-finalizada-info">
                    <strong>${produtoLabel} | ${tabela.prefixo}</strong>
                    <span>${dataFormatada} | ${tabela.turno}</span>
                    <span>Início: ${tabela.inicio} → Término: ${tabela.termino || '-'}</span>
                    <span>Operador: ${tabela.operador || '-'}</span>
                    <span>Taxa: ${tabela.taxaEfetiva ? tabela.taxaEfetiva + ' t/h' : '-'}</span>
                </div>
                <div class="tabela-finalizada-acoes">
                    <button onclick="verRelatorioFinalizado(${tabela.id})" title="Ver relatório">Ver</button>
                    <button onclick="excluirTabelaFinalizada(${tabela.id})" title="Excluir" class="btn-limpar">Excluir</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = limparTextoCorrompido(html);
    
    const contador = document.getElementById("contadorFinalizadas");
    if (contador) {
        contador.textContent = `(${tabelas.length} tabela${tabelas.length !== 1 ? 's' : ''})`;
    }
}

function verRelatorioFinalizado(tabelaId) {
    const tabela = tabelasFinalizadasCache.find(t => t.id === tabelaId);
    if (!tabela || !tabela.relatorio) {
        alert("Relatório não disponível.");
        return;
    }
    
    const resultadoDiv = document.getElementById("resultado");
    if (resultadoDiv) {
        resultadoDiv.innerHTML = limparTextoCorrompido(`
            <h3>Relatório - ${tabela.prefixo}</h3>
            <pre class="relatorio-pre">${tabela.relatorio}</pre>
        `);
        resultadoDiv.style.display = "block";
        resultadoDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

async function excluirTabelaFinalizada(tabelaId) {
    const tabela = tabelasFinalizadasCache.find(t => t.id === tabelaId);
    if (!tabela) {
        alert("Tabela nÃ£o encontrada!");
        return;
    }
    
    if (!confirm(`Excluir a tabela finalizada "${tabela.prefixo}"?\n\nEsta aÃ§Ã£o nÃ£o pode ser desfeita.`)) {
        return;
    }
    
    try {
        const resultado = await excluirTabelaFinalizadaServidor(tabelaId);
        if (resultado.success) {
            await atualizarListaFinalizadas();
            alert(`Tabela "${tabela.prefixo}" excluÃ­da.`);
        } else {
            alert(`Erro ao excluir: ${resultado.error}`);
        }
    } catch (error) {
        alert(`Erro de conexÃ£o: ${error.message}`);
    }
}


function salvarDadosFormulario() {
    const dados = coletarDadosFormulario();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    agendarAutoSaveServidor();
}

function agendarAutoSaveServidor() {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    autoSaveTimeout = setTimeout(async () => {
        const prefixo = document.getElementById("prefixo")?.value?.trim();
        const data = document.getElementById("data")?.value;
        const turno = document.getElementById("turno")?.value;
        const inicio = document.getElementById("inicio")?.value;

        // Auto-salva assim que houver identificacao minima para compartilhar em tempo real.
        if (!prefixo || !data || !turno) {
            return;
        }

        const dadosTabela = {
            prefixo: prefixo,
            data: data,
            turno: turno,
            produto: document.getElementById("produto")?.value || "",
            operador: document.getElementById("operador")?.value || "",
            inicio: inicio || "",
            dados: coletarDadosFormulario()
        };

        const resultado = await salvarTabelaServidor(dadosTabela);
        if (resultado && resultado.success) {
            tabelaSalva = true;
            atualizarIndicadorSincronizacao();
        }
    }, 1200);
}

function restaurarDadosFormulario() {
    const dadosSalvos = localStorage.getItem(STORAGE_KEY);
    if (!dadosSalvos) return;
    
    const dados = JSON.parse(dadosSalvos);
    
    // Restaurar campos simples
    CAMPOS_FORMULARIO.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento && dados[id] !== undefined) {
            elemento.value = dados[id];
        }
    });
    
    // Atualizar controles visuais
    atualizarEquipamentos();
    controleProduto();
    controleDestino();
    controleTipoDivisao();
    controleMudancaFluxo();
    controlePassagem();
    controleFalhaAssumida();
    
    // Restaurar impactos
    if (dados.impactos && dados.impactos.length > 0) {
        dados.impactos.forEach(imp => {
            adicionarImpacto();
            const rows = document.querySelectorAll(".impacto-row");
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                if (lastRow.querySelector(".impacto-desc")) lastRow.querySelector(".impacto-desc").value = imp.desc;
                if (lastRow.querySelector(".impacto-h")) lastRow.querySelector(".impacto-h").value = imp.h || "";
                if (lastRow.querySelector(".impacto-m")) lastRow.querySelector(".impacto-m").value = imp.m || "";
                if (lastRow.querySelector(".impacto-hora-inicio")) lastRow.querySelector(".impacto-hora-inicio").value = imp.hora_inicio;
                if (lastRow.querySelector(".impacto-hora-fim")) lastRow.querySelector(".impacto-hora-fim").value = imp.hora_fim;
                if (lastRow.querySelector(".impacto-atend-mecanica-prev")) lastRow.querySelector(".impacto-atend-mecanica-prev").checked = imp.atend_mecanica_prev;
                if (lastRow.querySelector(".impacto-atend-mecanica-corr")) lastRow.querySelector(".impacto-atend-mecanica-corr").checked = imp.atend_mecanica_corr;
                if (lastRow.querySelector(".impacto-atend-eletrica-prev")) lastRow.querySelector(".impacto-atend-eletrica-prev").checked = imp.atend_eletrica_prev;
                if (lastRow.querySelector(".impacto-atend-eletrica-corr")) lastRow.querySelector(".impacto-atend-eletrica-corr").checked = imp.atend_eletrica_corr;
                if (lastRow.querySelector(".impacto-atend-operacional")) lastRow.querySelector(".impacto-atend-operacional").checked = imp.atend_operacional;
                if (lastRow.querySelector(".impacto-acao")) lastRow.querySelector(".impacto-acao").value = imp.acao;
            }
        });
    }
    
    // Restaurar materiais carvÃ£o
    if (dados.materiais_carvao && dados.materiais_carvao.length > 0) {
        dados.materiais_carvao.forEach(mat => {
            adicionarMaterialCarvao();
            const rows = document.querySelectorAll(".material-carvao-row");
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                if (lastRow.querySelector(".carvao-categoria")) lastRow.querySelector(".carvao-categoria").value = mat.categoria;
                if (lastRow.querySelector(".carvao-tipo-material")) lastRow.querySelector(".carvao-tipo-material").value = mat.tipo_material;
                if (lastRow.querySelector(".carvao-patio")) lastRow.querySelector(".carvao-patio").value = mat.patio;
                if (lastRow.querySelector(".carvao-baliza")) lastRow.querySelector(".carvao-baliza").value = mat.baliza;
                if (lastRow.querySelector(".carvao-recuperadora")) lastRow.querySelector(".carvao-recuperadora").value = mat.recuperadora;
                if (lastRow.querySelector(".carvao-acao")) lastRow.querySelector(".carvao-acao").value = mat.acao;
                if (lastRow.querySelector(".carvao-hora-inicio")) lastRow.querySelector(".carvao-hora-inicio").value = mat.hora_inicio;
                if (lastRow.querySelector(".carvao-hora-fim")) lastRow.querySelector(".carvao-hora-fim").value = mat.hora_fim;
                if (lastRow.querySelector(".carvao-peso-ecv")) lastRow.querySelector(".carvao-peso-ecv").value = mat.peso_ecv;
                if (lastRow.querySelector(".carvao-peso-recup")) lastRow.querySelector(".carvao-peso-recup").value = mat.peso_recup;
                if (lastRow.querySelector(".carvao-vagoes")) lastRow.querySelector(".carvao-vagoes").value = mat.vagoes;
            }
        });
    }
    
    // Restaurar mudanÃ§as de fluxo
    if (dados.mudancas_fluxo && dados.mudancas_fluxo.length > 0) {
        dados.mudancas_fluxo.forEach(fluxo => {
            adicionarMudancaFluxo();
            const rows = document.querySelectorAll(".fluxo-row");
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                if (lastRow.querySelector(".fluxo-hora")) lastRow.querySelector(".fluxo-hora").value = fluxo.hora;
                if (lastRow.querySelector(".fluxo-anterior")) lastRow.querySelector(".fluxo-anterior").value = fluxo.anterior;
                if (lastRow.querySelector(".fluxo-novo")) lastRow.querySelector(".fluxo-novo").value = fluxo.novo;
                if (lastRow.querySelector(".fluxo-cco")) lastRow.querySelector(".fluxo-cco").checked = fluxo.cco;
                if (lastRow.querySelector(".fluxo-mecanica-corretiva")) lastRow.querySelector(".fluxo-mecanica-corretiva").checked = fluxo.mecanica_corretiva;
                if (lastRow.querySelector(".fluxo-mecanica-preventiva")) lastRow.querySelector(".fluxo-mecanica-preventiva").checked = fluxo.mecanica_preventiva;
                if (lastRow.querySelector(".fluxo-eletrica-corretiva")) lastRow.querySelector(".fluxo-eletrica-corretiva").checked = fluxo.eletrica_corretiva;
                if (lastRow.querySelector(".fluxo-eletrica-preventiva")) lastRow.querySelector(".fluxo-eletrica-preventiva").checked = fluxo.eletrica_preventiva;
                if (lastRow.querySelector(".fluxo-operacao")) lastRow.querySelector(".fluxo-operacao").checked = fluxo.operacao;
                if (lastRow.querySelector(".fluxo-motivo")) lastRow.querySelector(".fluxo-motivo").value = fluxo.motivo;
            }
        });
    }
}

function limparDadosSalvos() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_TURNO_DATA);
    localStorage.removeItem(STORAGE_KEY_TIPO_OPERACAO);
}


function adicionarMudancaFluxo() {
    const container = document.getElementById("mudancaFluxoContainer");
    const index = container.children.length + 1;
    
    const row = document.createElement("div");
    row.className = "fluxo-row";
    
    row.innerHTML = `
        <div class="fluxo-header">
            <strong>Mudança #${index}</strong>
            <button type="button" class="btn-remover" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        
        <div class="fluxo-campos">
            <input type="time" class="fluxo-hora" title="Horário da mudança">
            <input type="text" class="fluxo-anterior" placeholder="Fluxo anterior (Ex: 8000 t/h)">
            <input type="text" class="fluxo-novo" placeholder="Novo fluxo (Ex: 6000 t/h)">
        </div>
        
        <div class="fluxo-solicitante-grupo">
            <label class="solicitante-label">Quem solicitou?</label>
            <div class="solicitante-checkboxes">
                <label><input type="checkbox" class="fluxo-cco" value="CCO"> CCO</label>
                <label><input type="checkbox" class="fluxo-mecanica-corretiva" value="MECANICA_CORRETIVA"> Mecânica Corretiva</label>
                <label><input type="checkbox" class="fluxo-mecanica-preventiva" value="MECANICA_PREVENTIVA"> Mecânica Preventiva</label>
                <label><input type="checkbox" class="fluxo-eletrica-corretiva" value="ELETRICA_CORRETIVA"> Elétrica Corretiva</label>
                <label><input type="checkbox" class="fluxo-eletrica-preventiva" value="ELETRICA_PREVENTIVA"> Elétrica Preventiva</label>
                <label><input type="checkbox" class="fluxo-operacao" value="OPERACAO"> Operação</label>
            </div>
        </div>
        
        <input type="text" class="fluxo-motivo" placeholder="Motivo da mudanÃ§a">
    `;
    
    container.appendChild(row);
}

function adicionarMaterialCarvao() {
    const container = document.getElementById("materiaisCarvaoContainer");
    const index = container.children.length + 1;
    
    const row = document.createElement("div");
    row.className = "material-carvao-row";
    
    row.innerHTML = `
        <div class="material-header">
            <strong>Material #${index}</strong>
            <button type="button" class="btn-remover" onclick="this.parentElement.parentElement.remove()">âœ•</button>
        </div>
        
        <label>Categoria do Material</label>
        <select class="carvao-categoria" onchange="atualizarTiposMaterial(this)">
            <option value="CARVAO">Carvão</option>
            <option value="COQUE">Coque</option>
        </select>
        
        <label>Tipo de Material (sigla)</label>
        <input type="text" class="carvao-tipo-material" placeholder="Ex: MU, OG (carvão) ou CCM, KL (coque)">
        
        <label>Pátio de origem</label>
        <select class="carvao-patio" onchange="atualizarRecuperadora(this)">
            <option value="">Selecione</option>
            <option value="PATIO 0">Pátio 0</option>
            <option value="PATIO 1">Pátio 1</option>
            <option value="PATIO 2">Pátio 2</option>
        </select>
        
        <label>Baliza</label>
        <input type="text" class="carvao-baliza" placeholder="Ex: 57 a 60">
        
        <label>Recuperadora utilizada</label>
        <select class="carvao-recuperadora">
            <option value="R5">R5</option>
            <option value="R1A">R1A</option>
        </select>
        
        <label>Ação (zerar/completar)</label>
        <select class="carvao-acao">
            <option value="zerar">Zerar</option>
            <option value="completar">Completar</option>
        </select>
        
        <label>Horário início deste material</label>
        <input type="time" class="carvao-hora-inicio">
        
        <label>Horário fim deste material</label>
        <input type="time" class="carvao-hora-fim">
        
        <div class="carvao-pesos">
            <div>
                <label>Peso ECV (t)</label>
                <input type="number" class="carvao-peso-ecv" placeholder="Peso na ECV" step="0.01">
            </div>
            <div>
                <label>Peso Recuperadora (t)</label>
                <input type="number" class="carvao-peso-recup" placeholder="Peso na Recup." step="0.01">
            </div>
        </div>
        
        <label>Vagões carregados</label>
        <input type="number" class="carvao-vagoes" placeholder="Qtd vagões" min="0">
    `;
    
    container.appendChild(row);
}

function adicionarImpacto() {
    const container = document.getElementById("impactosContainer");

    const row = document.createElement("div");
    row.className = "impacto-row";

    row.innerHTML = `
        <input type="text" class="impacto-desc" placeholder="Descrição do impacto/falha">
        
        <div class="impacto-atendimento-grupo">
            <label class="atendimento-label">Quem atendeu a falha?</label>
            <div class="atendimento-checkboxes">
                <label><input type="checkbox" class="impacto-atend-mecanica-prev" value="MECANICA_PREVENTIVA"> Mecânica Preventiva</label>
                <label><input type="checkbox" class="impacto-atend-mecanica-corr" value="MECANICA_CORRETIVA"> Mecânica Corretiva</label>
                <label><input type="checkbox" class="impacto-atend-eletrica-prev" value="ELETRICA_PREVENTIVA"> Elétrica Preventiva</label>
                <label><input type="checkbox" class="impacto-atend-eletrica-corr" value="ELETRICA_CORRETIVA"> Elétrica Corretiva</label>
                <label><input type="checkbox" class="impacto-atend-operacional" value="OPERACIONAL"> Operacional</label>
            </div>
        </div>
        
        <input type="text" class="impacto-acao" placeholder="O que foi feito para resolver?">
        
        <div class="impacto-tempo-grupo">
            <input type="time" class="impacto-hora-inicio" title="Hora que iniciou o impacto">
            <input type="number" class="impacto-h" placeholder="Horas" min="0" title="Horas parado">
            <input type="number" class="impacto-m" placeholder="Min" min="0" title="Minutos parado">
            <input type="time" class="impacto-hora-fim" title="Hora liberado" readonly>
        </div>
    `;

    // Calcular hora de liberação automaticamente
    const horaInicio = row.querySelector(".impacto-hora-inicio");
    const horasParado = row.querySelector(".impacto-h");
    const minutosParado = row.querySelector(".impacto-m");
    const horaFim = row.querySelector(".impacto-hora-fim");

    function calcularHoraFim() {
        const inicio = horaInicio.value;
        const h = parseInt(horasParado.value || 0);
        const m = parseInt(minutosParado.value || 0);

        if (inicio && (h > 0 || m > 0)) {
            const [hInicio, mInicio] = inicio.split(":").map(Number);
            let totalMin = hInicio * 60 + mInicio + h * 60 + m;
            const hFim = Math.floor(totalMin / 60) % 24;
            const mFim = totalMin % 60;
            horaFim.value = `${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}`;
        } else {
            horaFim.value = "";
        }
    }

    horaInicio.addEventListener("change", calcularHoraFim);
    horasParado.addEventListener("input", calcularHoraFim);
    minutosParado.addEventListener("input", calcularHoraFim);

    // Aplicar capitalização inteligente
    aplicarCapitalizacaoImpacto(row.querySelector(".impacto-desc"));
    aplicarCapitalizacaoImpacto(row.querySelector(".impacto-acao"));

    container.appendChild(row);
}


function calcular() {
    // Verificar se tabela foi salva
    if (!tabelaSalva) {
        alert("VocÃª deve salvar a tabela antes de gerar o resultado.\n\nClique em 'Salvar InÃ­cio' primeiro.");
        return;
    }
    
    // Validar campos de recebimento
    const validacaoRecebimento = validarCamposRecebimento();
    if (!validacaoRecebimento.valido) {
        alert(validacaoRecebimento.mensagem);
        return;
    }

    const validacaoInicial = validarCamposIniciaisNovaTabela(true);
    if (!validacaoInicial.valido) {
        return;
    }

    const impactos = [];
    const impactosDesc = [];
    const impactosHoraInicio = [];
    const impactosHoraFim = [];
    const impactosTipoAtendimento = [];
    const impactosAcao = [];

    document.querySelectorAll(".impacto-row").forEach(row => {
        const h = parseInt(row.querySelector(".impacto-h")?.value || 0);
        const m = parseInt(row.querySelector(".impacto-m")?.value || 0);
        impactos.push((h * 60) + m);
        impactosDesc.push(capitalizarFrases(row.querySelector(".impacto-desc")?.value || ""));
        impactosHoraInicio.push(row.querySelector(".impacto-hora-inicio")?.value || "");
        impactosHoraFim.push(row.querySelector(".impacto-hora-fim")?.value || "");
        
        const atendimentos = [];
        if (row.querySelector(".impacto-atend-mecanica-prev")?.checked) atendimentos.push("MECANICA_PREVENTIVA");
        if (row.querySelector(".impacto-atend-mecanica-corr")?.checked) atendimentos.push("MECANICA_CORRETIVA");
        if (row.querySelector(".impacto-atend-eletrica-prev")?.checked) atendimentos.push("ELETRICA_PREVENTIVA");
        if (row.querySelector(".impacto-atend-eletrica-corr")?.checked) atendimentos.push("ELETRICA_CORRETIVA");
        if (row.querySelector(".impacto-atend-operacional")?.checked) atendimentos.push("OPERACIONAL");
        impactosTipoAtendimento.push(atendimentos.join(" / "));
        
        impactosAcao.push(capitalizarFrases(row.querySelector(".impacto-acao")?.value || ""));
    });

    // Coletar mudanÃ§as de fluxo
    const mudancasFluxo = [];
    document.querySelectorAll(".fluxo-row").forEach(row => {
        const solicitantes = [];
        if (row.querySelector(".fluxo-cco")?.checked) solicitantes.push("CCO");
        if (row.querySelector(".fluxo-mecanica-corretiva")?.checked) solicitantes.push("MECANICA_CORRETIVA");
        if (row.querySelector(".fluxo-mecanica-preventiva")?.checked) solicitantes.push("MECANICA_PREVENTIVA");
        if (row.querySelector(".fluxo-eletrica-corretiva")?.checked) solicitantes.push("ELETRICA_CORRETIVA");
        if (row.querySelector(".fluxo-eletrica-preventiva")?.checked) solicitantes.push("ELETRICA_PREVENTIVA");
        if (row.querySelector(".fluxo-operacao")?.checked) solicitantes.push("OPERACAO");
        
        mudancasFluxo.push({
            hora: row.querySelector(".fluxo-hora")?.value || "",
            fluxo_anterior: toUpperSafe(row.querySelector(".fluxo-anterior")?.value) || "",
            fluxo_novo: toUpperSafe(row.querySelector(".fluxo-novo")?.value) || "",
            solicitante: solicitantes.join(" / "),
            motivo: toUpperSafe(row.querySelector(".fluxo-motivo")?.value) || ""
        });
    });

    // Coletar materiais de carvÃ£o
    const materiaisCarvao = [];
    document.querySelectorAll(".material-carvao-row").forEach(row => {
        materiaisCarvao.push({
            categoria: row.querySelector(".carvao-categoria")?.value || "CARVAO",
            patio: toUpperSafe(row.querySelector(".carvao-patio")?.value) || "",
            baliza: toUpperSafe(row.querySelector(".carvao-baliza")?.value) || "",
            recuperadora: row.querySelector(".carvao-recuperadora")?.value || "",
            tipo_material: toUpperSafe(row.querySelector(".carvao-tipo-material")?.value) || "",
            acao: row.querySelector(".carvao-acao")?.value || "",
            hora_inicio: row.querySelector(".carvao-hora-inicio")?.value || "",
            hora_fim: row.querySelector(".carvao-hora-fim")?.value || "",
            peso_ecv: row.querySelector(".carvao-peso-ecv")?.value || "",
            peso_recup: row.querySelector(".carvao-peso-recup")?.value || "",
            vagoes: row.querySelector(".carvao-vagoes")?.value || ""
        });
    });

    const produto = document.getElementById("produto").value;

    const dados = {
        data: document.getElementById("data").value,
        turno: document.getElementById("turno").value,
        operador: toUpperSafe(document.getElementById("operador").value),
        matricula: toUpperSafe(document.getElementById("matricula").value),
        produto: produto,
        prefixo: toUpperSafe(document.getElementById("prefixo").value),
        oferta: toUpperSafe(document.getElementById("oferta").value),
        inicio: document.getElementById("inicio").value,
        termino: document.getElementById("termino").value,
        peso: parseFloat(document.getElementById("peso").value || 0),
        impactos: impactos,
        impactos_desc: impactosDesc,
        impactos_hora_inicio: impactosHoraInicio,
        impactos_hora_fim: impactosHoraFim,
        impactos_tipo_atendimento: impactosTipoAtendimento,
        impactos_acao: impactosAcao,
        observacoes: toUpperSafe(document.getElementById("observacoes").value),
        email: document.getElementById("email").value,

        // Maquinista
        maquinista: toUpperSafe(document.getElementById("maquinista")?.value) || "",
        loc1: toUpperSafe(document.getElementById("loc1")?.value) || "",
        loc2: toUpperSafe(document.getElementById("loc2")?.value) || "",
        horas_maquinista: document.getElementById("horas_maquinista")?.value || "",
        ponto_b: document.getElementById("ponto_b")?.value || "",
        sinal: document.getElementById("sinal")?.value || "",
        tabela_posicionada: document.getElementById("tabela_posicionada")?.value || "",

        // Passagem de turno (passando)
        houve_passagem: document.getElementById("houve_passagem")?.value || "NAO",
        vagoes_meu_turno: document.getElementById("vagoes_meu_turno")?.value || "",
        turno_assumiu: document.getElementById("turno_assumiu")?.value || "",
        operador_assumiu: toUpperSafe(document.getElementById("operador_assumiu")?.value) || "",
        matricula_assumiu: toUpperSafe(document.getElementById("matricula_assumiu")?.value) || "",
        hora_rendicao: document.getElementById("hora_rendicao")?.value || "",
        vagoes_proximo_turno: document.getElementById("vagoes_proximo_turno")?.value || "",
        assumiu_em_falha: document.getElementById("assumiu_em_falha")?.value || "NAO",
        descricao_falha_assumida: toUpperSafe(document.getElementById("descricao_falha_assumida")?.value) || "",
        hora_falha_passagem: document.getElementById("hora_falha_passagem")?.value || "",

        // Recebimento de outro turno
        recebeu_de_outro_turno: document.getElementById("secaoRecebeuTabela")?.style.display !== "none",
        turno_passou_tabela: document.getElementById("turno_passou_tabela")?.value || "",
        operador_passou_tabela: toUpperSafe(document.getElementById("operador_passou_tabela")?.value) || "",
        matricula_passou_tabela: toUpperSafe(document.getElementById("matricula_passou_tabela")?.value) || "",
        hora_assumiu_tabela: document.getElementById("hora_assumiu_tabela")?.value || "",
        vagoes_faltavam_assumir: document.getElementById("vagoes_faltavam_assumir")?.value || "",
        recebeu_em_falha: document.getElementById("recebeu_em_falha")?.value || "NAO",
        falha_recebida_desc: toUpperSafe(document.getElementById("falha_recebida_desc")?.value) || "",
        hora_inicio_falha_recebida: document.getElementById("hora_inicio_falha_recebida")?.value || "",
        tempo_parado_h: document.getElementById("tempo_parado_h")?.value || "",
        tempo_parado_m: document.getElementById("tempo_parado_m")?.value || "",
        acao_falha_recebida: toUpperSafe(document.getElementById("acao_falha_recebida")?.value) || "",
        falha_recebida_mecanica: document.getElementById("falha_recebida_mecanica")?.checked || false,
        falha_recebida_eletrica: document.getElementById("falha_recebida_eletrica")?.checked || false,
        falha_recebida_operacional: document.getElementById("falha_recebida_operacional")?.checked || false,
        falha_recebida_outro: document.getElementById("falha_recebida_outro")?.checked || false,

        // MudanÃ§a de fluxo
        houve_mudanca_fluxo: document.getElementById("houve_mudanca_fluxo")?.value || "NAO",
        mudancas_fluxo: mudancasFluxo,

        // MinÃ©rio
        equipamento: document.getElementById("equipamento")?.value || "",
        tipo_material: toUpperSafe(document.getElementById("tipo_material")?.value) || "",
        destino: document.getElementById("destino")?.value || "",
        empilhando: document.getElementById("empilhando")?.value || "NAO",
        patio: toUpperSafe(document.getElementById("patio_nome")?.value) || "",
        baliza: toUpperSafe(document.getElementById("baliza")?.value) || "",
        maquina_patio: document.getElementById("maquina_patio")?.value || "",
        passando_por: toUpperSafe(document.getElementById("passando_por")?.value) || "",
        passando_por_partida: toUpperSafe(document.getElementById("passando_por_partida")?.value) || "",

        // Tabela partida
        tipo_divisao: document.getElementById("tipo_divisao")?.value || "PATIO_BORDO",
        vagoes_patio: document.getElementById("vagoes_patio")?.value || "",
        patio_partida: toUpperSafe(document.getElementById("patio_partida")?.value) || "",
        baliza_partida: toUpperSafe(document.getElementById("baliza_partida")?.value) || "",
        maquina_patio1: document.getElementById("maquina_patio1")?.value || "",
        hora_inicio_patio: document.getElementById("hora_inicio_patio")?.value || "",
        hora_fim_patio: document.getElementById("hora_fim_patio")?.value || "",
        vagoes_bordo: document.getElementById("vagoes_bordo")?.value || "",
        hora_inicio_bordo: document.getElementById("hora_inicio_bordo")?.value || "",
        hora_fim_bordo: document.getElementById("hora_fim_bordo")?.value || "",
        vagoes_patio2: document.getElementById("vagoes_patio2")?.value || "",
        patio_partida2: toUpperSafe(document.getElementById("patio_partida2")?.value) || "",
        baliza_partida2: toUpperSafe(document.getElementById("baliza_partida2")?.value) || "",
        maquina_patio2: document.getElementById("maquina_patio2")?.value || "",
        hora_inicio_patio2: document.getElementById("hora_inicio_patio2")?.value || "",
        hora_fim_patio2: document.getElementById("hora_fim_patio2")?.value || "",

        // CarvÃ£o
        primeiro_vagao: toUpperSafe(document.getElementById("primeiro_vagao")?.value) || "",
        materiais_carvao: materiaisCarvao
    };

    fetch("/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(async data => {
        const resultado = document.getElementById("resultado");
        resultado.style.display = "block";
        
        if (isProdutoCarvao(dados.produto)) {
            resultado.innerHTML = limparTextoCorrompido(gerarResultadoCarvao(dados, data));
        } else {
            resultado.innerHTML = limparTextoCorrompido(gerarResultadoMinerio(dados, data));
        }
        
        // Se tem tÃ©rmino, finalizar a tabela
        if (dados.termino) {
            let tabelaSelecionadaId = document.getElementById("seletorTabelasAndamento").value;

            try {
                // Caso nenhuma tabela esteja selecionada, salvar automaticamente uma em andamento
                if (!tabelaSelecionadaId) {
                    const dadosTabela = {
                        prefixo: dados.prefixo,
                        data: dados.data,
                        turno: dados.turno,
                        produto: dados.produto,
                        operador: dados.operador,
                        inicio: dados.inicio,
                        dados: coletarDadosFormulario()
                    };

                    const resultadoSalvar = await salvarTabelaServidor(dadosTabela);
                    if (resultadoSalvar && resultadoSalvar.success) {
                        tabelaSelecionadaId = resultadoSalvar.id;
                        // Atualiza seletor e info para refletir a tabela criada
                        await atualizarSeletorTabelas();
                        document.getElementById("seletorTabelasAndamento").value = tabelaSelecionadaId;
                        const tabela = tabelasAndamentoCache.find(t => t.id === tabelaSelecionadaId);
                        if (tabela) {
                            mostrarInfoTabelaSelecionada(tabela);
                        }
                    } else {
                        console.warn("NÃ£o foi possÃ­vel salvar tabela automaticamente antes da finalizaÃ§Ã£o.");
                    }
                }

                // Se conseguimos um ID (selecionado ou recÃ©m-criado), finalizar no servidor
                if (tabelaSelecionadaId) {
                    const dadosFinalizacao = {
                        termino: dados.termino,
                        peso: dados.peso,
                        taxa_efetiva: data.taxa_efetiva,
                        relatorio: data.relatorio,
                        pdf_path: data.pdf,
                        dados: coletarDadosFormulario()
                    };

                    const resultadoFinalizar = await finalizarTabelaServidor(tabelaSelecionadaId, dadosFinalizacao);

                    if (resultadoFinalizar.success) {
                        // Limpa seleÃ§Ã£o e atualiza listas para exibir em "Finalizadas" imediatamente
                        document.getElementById("seletorTabelasAndamento").value = "";
                        document.getElementById("infoTabelaSelecionada").style.display = "none";
                        await atualizarListaTabelas();
                        console.log("Tabela movida para finalizadas.");
                    }
                }
            } catch (error) {
                console.error("Erro ao finalizar tabela:", error);
            }
        }
    });
}


function gerarResultadoMinerio(dados, data) {
    let destinoTexto = "";
    if (dados.destino === "PATIO") {
        destinoTexto = `Patio ${dados.patio} | Baliza ${dados.baliza} | ${dados.maquina_patio || "-"}`;
    }
    if (dados.destino === "BORDO") {
        destinoTexto = dados.passando_por ? `Trem de Bordo (TM ${dados.passando_por.replace("TM", "")})` : "Trem de Bordo";
    }
    if (dados.destino === "PARTIDA") destinoTexto = "Tabela dividida/fracionada";

    const impactosHTML = gerarImpactosHTML(dados);
    const passagemHTML = gerarPassagemHTML(dados);
    const mudancaFluxoHTML = gerarMudancaFluxoHTML(dados);

    let dataFormatada = "-";
    if (dados.data) {
        const [ano, mes, dia] = dados.data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }

    let tabelaPartidaHTML = "";
    if (dados.destino === "PARTIDA") {
        if (dados.tipo_divisao === "PATIO_PATIO") {
            tabelaPartidaHTML = `
<strong>TABELA DIVIDIDA (PATIO + PATIO):</strong><br>
<strong>1o Patio:</strong> ${dados.patio_partida} | Baliza: ${dados.baliza_partida} | ${dados.maquina_patio1 || "-"}<br>
Vagoes: ${dados.vagoes_patio || "-"} (${dados.hora_inicio_patio || "-"} -> ${dados.hora_fim_patio || "-"})<br><br>
<strong>2o Patio:</strong> ${dados.patio_partida2} | Baliza: ${dados.baliza_partida2} | ${dados.maquina_patio2 || "-"}<br>
Vagoes: ${dados.vagoes_patio2 || "-"} (${dados.hora_inicio_patio2 || "-"} -> ${dados.hora_fim_patio2 || "-"})<br><br>`;
        } else if (dados.tipo_divisao === "BORDO_PATIO") {
            tabelaPartidaHTML = `
<strong>TABELA DIVIDIDA (BORDO + PATIO):</strong><br>
<strong>1a Parte Bordo:</strong> ${dados.passando_por_partida || "-"}<br>
Vagoes: ${dados.vagoes_bordo || "-"} (${dados.hora_inicio_bordo || "-"} -> ${dados.hora_fim_bordo || "-"})<br><br>
<strong>2a Parte Patio:</strong> ${dados.patio_partida2} | Baliza: ${dados.baliza_partida2} | ${dados.maquina_patio2 || "-"}<br>
Vagoes: ${dados.vagoes_patio2 || "-"} (${dados.hora_inicio_patio2 || "-"} -> ${dados.hora_fim_patio2 || "-"})<br><br>`;
        } else {
            tabelaPartidaHTML = `
<strong>TABELA DIVIDIDA (PATIO + BORDO):</strong><br>
<strong>1a Parte Patio:</strong> ${dados.patio_partida} | Baliza: ${dados.baliza_partida} | ${dados.maquina_patio1 || "-"}<br>
Vagoes: ${dados.vagoes_patio || "-"} (${dados.hora_inicio_patio || "-"} -> ${dados.hora_fim_patio || "-"})<br><br>
<strong>2a Parte Bordo:</strong> ${dados.passando_por_partida || "-"}<br>
Vagoes: ${dados.vagoes_bordo || "-"} (${dados.hora_inicio_bordo || "-"} -> ${dados.hora_fim_bordo || "-"})<br><br>`;
        }
    }

    const empilhamentoTexto = dados.empilhando === "SIM"
        ? `Sim - Origem: ${dados.maquina_patio || "-"} | ${dados.patio || "-"} | Baliza ${dados.baliza || "-"}`
        : "Nao";

    return `
<strong>Data da Operacao:</strong> ${dataFormatada}<br>
<strong>Turno:</strong> ${dados.turno || "-"}<br>
<hr>

<strong>${dados.prefixo}</strong><br>
${dados.oferta}<br><br>

Operador: ${dados.operador} | Mat: ${dados.matricula}<br>
Maquinista: ${dados.maquinista}<br>
Locomotivas: ${dados.loc1} / ${dados.loc2}<br>
Contato com Maquinista: ${dados.horas_maquinista}<br>
Passagem Ponto B: ${dados.ponto_b}<br>
Passagem pelo Sinal: ${dados.sinal}<br>
Tabela Posicionada: ${dados.tabela_posicionada}<br><br>

Equipamento: ${dados.equipamento}<br>
Produto: ${dados.produto} (${dados.tipo_material})<br>
Destino: ${destinoTexto}<br>
Empilhando: ${empilhamentoTexto}<br><br>

${tabelaPartidaHTML}
<strong>INICIO:</strong> ${dados.inicio || "-"}h<br>
<strong>TERMINO:</strong> ${dados.termino || "-"}h<br>
<strong>${dados.equipamento.startsWith("VV") ? "TMD" : "TMC"}:</strong> ${dados.termino ? formatarTempo(data.tmd) : "-"}<br>
Tempo Total Parado: ${formatarTempo(data.impactos_total)}<br>
Hora Efetiva: ${dados.termino ? formatarTempo(data.hora_efetiva) : "-"}<br><br>

Peso Total: ${dados.peso} t<br>
<strong>Taxa Efetiva:</strong> ${dados.termino && data.taxa_efetiva > 0 ? data.taxa_efetiva + " t/h" : "-"}<br><br>

${mudancaFluxoHTML}
${passagemHTML}
<strong>Impactos/Falhas:</strong><br>${impactosHTML}<br>
<strong>Observacoes:</strong><br>${dados.observacoes}
    `;
}

function gerarResultadoCarvao(dados, data) {
    let impactosHTML = gerarImpactosHTML(dados);
    let passagemHTML = gerarPassagemHTML(dados);
    let mudancaFluxoHTML = gerarMudancaFluxoHTML(dados);

    let dataFormatada = "-";
    if (dados.data) {
        const [ano, mes, dia] = dados.data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }

    let materiaisHTML = "";
    if (dados.materiais_carvao && dados.materiais_carvao.length > 0) {
        dados.materiais_carvao.forEach((mat, i) => {
            if (mat.tipo_material) {
                const categoriaNome = mat.categoria === "COQUE" ? "Coque" : "Carvão";
                materiaisHTML += `
<div style="border-left: 3px solid #ffa500; padding-left: 10px; margin: 15px 0;">
${mat.patio} - ${mat.baliza}<br>
${mat.recuperadora}<br><br>

${categoriaNome}: ${mat.tipo_material} (${mat.acao})<br><br>

<strong>Peso ECV:</strong> ${mat.peso_ecv || "-"} t<br>
<strong>Peso ${mat.recuperadora}:</strong> ${mat.peso_recup || "-"} t<br>
Vagões: ${mat.vagoes || "-"}<br>
${mat.hora_inicio ? `${mat.hora_inicio} -> ${mat.hora_fim || "-"}<br><br>` : ""}
</div>`;
            }
        });
    }

    return `
<strong>Data da Operacao:</strong> ${dataFormatada}<br>
<strong>Turno:</strong> ${dados.turno || "-"}<br>
<hr>

<strong>ECV</strong><br><br>

<strong>${dados.oferta}</strong><br><br>

<strong>${dados.prefixo}</strong><br><br>

Operador: ${dados.operador} | Mat: ${dados.matricula}<br>
Maquinista: ${dados.maquinista}<br>
Locomotivas: ${dados.loc1} / ${dados.loc2}<br>
Contato com Maquinista: ${dados.horas_maquinista}<br>
Passagem Ponto B: ${dados.ponto_b}<br>
Tabela Posicionada: ${dados.tabela_posicionada}<br>
1o Vagao: ${dados.primeiro_vagao || "-"}<br><br>

${materiaisHTML}
<br>
<strong>INICIO:</strong> ${dados.inicio || "-"}h<br>
<strong>TERMINO:</strong> ${dados.termino || "-"}h<br>
<strong>TMC:</strong> ${dados.termino ? formatarTempo(data.tmd) : "-"}<br>
Tempo Total Parado: ${formatarTempo(data.impactos_total)}<br>
Hora Efetiva: ${dados.termino ? formatarTempo(data.hora_efetiva) : "-"}<br><br>

Peso Total: ${dados.peso} t<br>
<strong>Taxa Efetiva:</strong> ${dados.termino && data.taxa_efetiva > 0 ? data.taxa_efetiva + " t/h" : "-"}<br><br>

${mudancaFluxoHTML}
${passagemHTML}
<strong>Impactos/Falhas:</strong><br>${impactosHTML}<br>
<strong>Observacoes:</strong><br>${dados.observacoes}
    `;
}

function gerarImpactosHTML(dados) {
    let html = "";
    dados.impactos.forEach((min, i) => {
        if (min > 0) {
            const horaInicio = dados.impactos_hora_inicio[i] || "";
            const horaFim = dados.impactos_hora_fim[i] || "";
            const tipoAtend = dados.impactos_tipo_atendimento[i] || "";
            const acao = dados.impactos_acao[i] || "";
            const horarios = horaInicio ? ` (${horaInicio} -> ${horaFim})` : "";
            const tipoTexto = tipoAtend ? ` [${tipoAtend}]` : "";
            const acaoTexto = acao ? ` - Acao: ${acao}` : "";
            html += `- ${dados.impactos_desc[i]}${tipoTexto} - ${formatarTempo(min)}${horarios}${acaoTexto}<br>`;
        }
    });
    return html || "Nenhum impacto registrado<br>";
}

function gerarPassagemHTML(dados) {
    if (dados.houve_passagem === "SIM") {
        let falhaTexto = "";
        if (dados.assumiu_em_falha === "SIM") {
            falhaTexto = `Passou em FALHA: ${dados.descricao_falha_assumida} (as ${dados.hora_falha_passagem || "-"})<br>`;
        }
        
        return `
<strong>PASSAGEM DE TURNO:</strong><br>
Hora da rendicao: ${dados.hora_rendicao || "-"}<br>
Vagoes descarregados no meu turno: ${dados.vagoes_meu_turno || "-"}<br>
Vagoes restantes p/ proximo turno: ${dados.vagoes_proximo_turno || "-"}<br>
Turno que assumiu: ${dados.turno_assumiu || "-"}<br>
Operador que assumiu: ${dados.operador_assumiu || "-"} | Mat: ${dados.matricula_assumiu || "-"}<br>
${falhaTexto}
<br>`;
    }
    return "";
}

function gerarMudancaFluxoHTML(dados) {
    if (dados.houve_mudanca_fluxo === "SIM" && dados.mudancas_fluxo && dados.mudancas_fluxo.length > 0) {
        let html = "<strong>MUDANCAS DE FLUXO:</strong><br>";
        dados.mudancas_fluxo.forEach((fluxo, i) => {
            if (fluxo.hora || fluxo.fluxo_anterior || fluxo.fluxo_novo) {
            html += `- ${fluxo.hora || "-"}: ${fluxo.fluxo_anterior} -> ${fluxo.fluxo_novo}`;
                if (fluxo.solicitante) html += ` [${fluxo.solicitante}]`;
                if (fluxo.motivo) html += ` - ${fluxo.motivo}`;
                html += "<br>";
            }
        });
        return html + "<br>";
    }
    return "";
}


function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let texto = document.getElementById("resultado").innerText;
    
    // Remover emojis e caracteres especiais
    texto = texto
        .replace(/\[DATA\]\s*/g, "")
        .replace(/\[TURNO\]\s*/g, "")
        .replace(/\[TREM\]\s*/g, "")
        .replace(/\p{Extended_Pictographic}/gu, "")
        .replace(/â€¢/g, "-")
        .replace(/â†’/g, "->")
        .replace(/â€”/g, "-")
        .replace(/[^\x00-\x7F\u00C0-\u00FF\n]/g, "");

    const linhas = texto.split("\n");
    
    let y = 20;
    const margemEsquerda = 15;
    const larguraPagina = 180;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATORIO OPERACIONAL", doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
    y += 12;

    doc.setLineWidth(0.5);
    doc.line(margemEsquerda, y, margemEsquerda + larguraPagina, y);
    y += 8;

    doc.setFontSize(10);

    linhas.forEach(linha => {
        if (linha.trim() === "") {
            y += 4;
            return;
        }

        if (y > 280) {
            doc.addPage();
            y = 20;
        }

        if (linha.trim().startsWith("-") && linha.includes("Acao:")) {
            const partes = linha.split("- Acao:");
            const impactoParte = partes[0].trim();
            const acaoParte = partes[1] ? partes[1].trim() : "";
            
            doc.setFont("helvetica", "normal");
            const linhasImpacto = doc.splitTextToSize(impactoParte, larguraPagina);
            linhasImpacto.forEach(li => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(li, margemEsquerda, y);
                y += 5;
            });
            
            if (acaoParte) {
                doc.setFont("helvetica", "bold");
                doc.text("Acao:", margemEsquerda + 10, y);
                doc.setFont("helvetica", "normal");
                const acaoWidth = doc.getTextWidth("Acao: ");
                const linhasAcao = doc.splitTextToSize(acaoParte, larguraPagina - 20);
                linhasAcao.forEach((la, idx) => {
                    if (y > 280) { doc.addPage(); y = 20; }
                    if (idx === 0) {
                        doc.text(la, margemEsquerda + 10 + acaoWidth, y);
                    } else {
                        y += 5;
                        doc.text(la, margemEsquerda + 10 + acaoWidth, y);
                    }
                });
                y += 6;
            }
            return;
        }

        const match = linha.match(/^([^:]+):(.*)/);
        if (match) {
            const subtitulo = match[1].trim();
            const valor = match[2].trim();
            
            doc.setFont("helvetica", "bold");
            const subtituloText = subtitulo + ": ";
            const subtituloWidth = doc.getTextWidth(subtituloText);
            
            const valorWidth = doc.getTextWidth(valor);
            const espacoDisponivel = larguraPagina - subtituloWidth;
            
            if (valorWidth > espacoDisponivel) {
                doc.text(subtituloText, margemEsquerda, y);
                doc.setFont("helvetica", "normal");
                const linhasValor = doc.splitTextToSize(valor, espacoDisponivel);
                linhasValor.forEach((linhaValor, idx) => {
                    if (y > 280) {
                        doc.addPage();
                        y = 20;
                    }
                    if (idx === 0) {
                        doc.text(linhaValor, margemEsquerda + subtituloWidth, y);
                    } else {
                        y += 5;
                        doc.text(linhaValor, margemEsquerda + subtituloWidth, y);
                    }
                });
            } else {
                doc.text(subtituloText, margemEsquerda, y);
                doc.setFont("helvetica", "normal");
                doc.text(valor, margemEsquerda + subtituloWidth, y);
            }
        } else {
            doc.setFont("helvetica", "normal");
            const linhasTexto = doc.splitTextToSize(linha, larguraPagina);
            linhasTexto.forEach((linhaTexto, idx) => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(linhaTexto, margemEsquerda, y);
                if (idx < linhasTexto.length - 1) y += 5;
            });
        }
        
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        y += 6;
    });

    doc.save("relatorio_operacional.pdf");
}

function copiarWhatsApp() {
    const texto = document.getElementById("resultado").innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto)
            .then(() => alert("Texto copiado."));
    } else {
        const textarea = document.createElement("textarea");
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("Texto copiado.");
    }
}

function enviarEmail() {
    const resultado = document.getElementById("resultado");
    
    if (resultado.style.display === "none" || !resultado.innerText.trim()) {
        alert("Gere o resultado primeiro.");
        return;
    }
    
    const emailDestino = document.getElementById("email").value;
    if (!emailDestino) {
        alert("Preencha o email de destino.");
        document.getElementById("email").focus();
        return;
    }
    
    const data = document.getElementById("data").value || "";
    const turno = document.getElementById("turno").value || "";
    const prefixo = document.getElementById("prefixo").value || "";
    const produto = document.getElementById("produto").value || "";
    
    let dataFormatada = "";
    if (data) {
        const [ano, mes, dia] = data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }
    
    const assunto = `RelatÃ³rio Operacional - ${prefixo} - ${produto} - ${turno} - ${dataFormatada}`;
    let corpo = resultado.innerText;
    
    const mailtoLink = `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = mailtoLink;
}


function iniciarFinalizacaoTurno() {
    // Primeiro validar se passagem de turno foi preenchida
    if (!validarPassagemTurno()) {
        return;
    }
    
    const resposta = confirm("VocÃª estÃ¡ finalizando o turno?\n\nSelecione OK para continuar ou Cancelar para voltar.");
    
    if (!resposta) return;
    
    const emFalha = confirm("EstÃ¡ finalizando em falha?\n\nSelecione OK se SIM (serÃ¡ obrigatÃ³rio preencher os dados da falha) ou Cancelar se NÃƒO.");
    
    if (emFalha) {
        // Mostrar modal ou campos para preencher falha
        mostrarCamposFalhaFinalizacao();
    } else {
        // Finalizar turno normalmente
        finalizarTurnoNormal();
    }
}

function mostrarCamposFalhaFinalizacao() {
    // Criar modal ou usar campos existentes
    const modal = document.createElement('div');
    modal.id = 'modalFalhaFinalizacao';
    modal.innerHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: white; color: black; padding: 20px; border-radius: 10px; max-width: 400px; width: 90%;">
                <h3>Preencher Dados da Falha</h3>
                <p><strong>ObrigatÃ³rio preencher para finalizar o turno:</strong></p>
                
                <label>HorÃ¡rio da Falha:</label>
                <input type="time" id="horarioFalhaFinalizacao" required>
                
                <label>Tipo de Falha:</label>
                <select id="tipoFalhaFinalizacao" required>
                    <option value="">-- Selecione --</option>
                    <option value="MECANICA_CORRETIVA">MecÃ¢nica Corretiva</option>
                    <option value="MECANICA_PREVENTIVA">MecÃ¢nica Preventiva</option>
                    <option value="ELETRICA_CORRETIVA">ElÃ©trica Corretiva</option>
                    <option value="ELETRICA_PREVENTIVA">ElÃ©trica Preventiva</option>
                    <option value="OPERACAO">OperaÃ§Ã£o</option>
                    <option value="CCO">CCO</option>
                    <option value="OUTROS">Outros</option>
                </select>
                
                <label>DescriÃ§Ã£o da Falha:</label>
                <textarea id="descricaoFalhaFinalizacao" placeholder="Descreva a falha..." required></textarea>
                
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="cancelarFalhaFinalizacao()" style="margin-right: 10px;">Cancelar</button>
                    <button onclick="confirmarFalhaFinalizacao()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px;">Confirmar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function cancelarFalhaFinalizacao() {
    const modal = document.getElementById('modalFalhaFinalizacao');
    if (modal) modal.remove();
}

function confirmarFalhaFinalizacao() {
    const horario = document.getElementById('horarioFalhaFinalizacao').value;
    const tipo = document.getElementById('tipoFalhaFinalizacao').value;
    const descricao = document.getElementById('descricaoFalhaFinalizacao').value;
    
    if (!horario || !tipo || !descricao.trim()) {
        alert('Todos os campos sÃ£o obrigatÃ³rios.');
        return;
    }
    
    // Salvar dados da falha para o prÃ³ximo turno
    const dadosFalha = {
        horario: horario,
        tipo: tipo,
        descricao: descricao,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('falha_turno_anterior', JSON.stringify(dadosFalha));
    
    // Remover modal
    cancelarFalhaFinalizacao();
    
    // Finalizar turno
    finalizarTurnoComFalha(dadosFalha);
}

function validarPassagemTurno() {
    const turnoPassou = document.getElementById('turno_passou_tabela').value;
    const operadorPassou = document.getElementById('operador_passou_tabela').value;
    const matriculaPassou = document.getElementById('matricula_passou_tabela').value;
    const horaAssumiu = document.getElementById('hora_assumiu_tabela').value;
    
    if (!turnoPassou || !operadorPassou || !matriculaPassou || !horaAssumiu) {
        alert('Para finalizar o turno, Ã© obrigatÃ³rio preencher a passagem de turno.\n\nPreencha: Turno que passou, Operador, MatrÃ­cula e Hora de assunÃ§Ã£o.');
        return false;
    }
    
    return true;
}

async function salvarTabelaFinalizada() {
    try {
        const tabelaId = document.getElementById("seletorTabelasAndamento")?.value;
        const dadosFormulario = coletarDadosFormulario();
        const dadosTabela = {
            prefixo: document.getElementById("prefixo")?.value || "",
            data: document.getElementById("data")?.value || "",
            turno: document.getElementById("turno")?.value || "",
            produto: document.getElementById("produto")?.value || "",
            operador: document.getElementById("operador")?.value || "",
            inicio: document.getElementById("inicio")?.value || "",
            dados: dadosFormulario
        };

        // Sem tÃ©rmino, apenas manter em andamento para compartilhar com outros usuÃ¡rios.
        const termino = document.getElementById("termino")?.value || "";
        if (!termino) {
            const resultadoAndamento = await salvarTabelaServidor(dadosTabela);
            return !!resultadoAndamento.success;
        }

        // Com tÃ©rmino, finalizar no banco de dados.
        if (!tabelaId) {
            const resultadoAndamento = await salvarTabelaServidor(dadosTabela);
            if (!resultadoAndamento.success) {
                return false;
            }
            document.getElementById("seletorTabelasAndamento").value = resultadoAndamento.id;
        }

        const responseCalculo = await fetch("/calcular", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...dadosTabela,
                termino: termino,
                peso: parseFloat(document.getElementById("peso")?.value || 0),
                impactos: (dadosFormulario.impactos || []).map(imp => ((parseInt(imp.h || 0) * 60) + parseInt(imp.m || 0)))
            })
        });

        if (!responseCalculo.ok) {
            return false;
        }

        const calculo = await responseCalculo.json();
        const resultadoFinalizar = await finalizarTabelaServidor(
            document.getElementById("seletorTabelasAndamento").value,
            {
                termino: termino,
                peso: parseFloat(document.getElementById("peso")?.value || 0),
                taxa_efetiva: calculo.taxa_efetiva,
                relatorio: calculo.relatorio,
                pdf_path: calculo.pdf,
                dados: dadosFormulario
            }
        );

        if (resultadoFinalizar.success) {
            await atualizarListaTabelas();
            return true;
        }

        return false;
    } catch (error) {
        console.error('Erro ao salvar tabela:', error);
        return false;
    }
}

async function finalizarTurnoNormal() {
    // Validar passagem de turno
    if (!validarPassagemTurno()) {
        return;
    }
    
    // Salvar tabela no banco
    const salvo = await salvarTabelaFinalizada();
    
    if (salvo) {
        alert('Turno finalizado com sucesso.\n\nTabela salva no banco de dados.');
    } else {
        alert('Turno finalizado, mas houve problema ao salvar no banco.\n\nDados mantidos localmente.');
    }
    
    limparFormulario();
}

async function finalizarTurnoComFalha(dadosFalha) {
    // Validar passagem de turno
    if (!validarPassagemTurno()) {
        return;
    }
    
    // Salvar tabela no banco
    const salvo = await salvarTabelaFinalizada();
    
    if (salvo) {
        alert('Turno finalizado com falha registrada.\n\nPrÃ³ximo turno poderÃ¡ assumir com os dados preenchidos.\n\nTabela salva no banco de dados.');
    } else {
        alert('Turno finalizado com falha, mas houve problema ao salvar no banco.\n\nDados mantidos localmente.');
    }
    
    limparFormulario();
}

function carregarFalhaTurnoAnterior() {
    const dadosFalha = localStorage.getItem('falha_turno_anterior');
    if (dadosFalha) {
        const falha = JSON.parse(dadosFalha);
        
        // Preencher campos de impacto automaticamente
        // Isso seria feito quando carregar uma tabela ou iniciar nova
        
        // Mostrar notificaÃ§Ã£o
        console.log('Falha do turno anterior carregada:', falha);
        
        // Remover apÃ³s carregar (ou manter para histÃ³rico)
        // localStorage.removeItem('falha_turno_anterior');
    }
}

function limparFormulario() {
    if (!confirm("Tem certeza que deseja limpar todos os dados?")) {
        return;
    }
    
    limparDadosSalvos();
    tabelaSalva = false; // Resetar flag de salvamento
    window.location.reload();
}


document.addEventListener("DOMContentLoaded", async function() {
    document.documentElement.classList.add("dark-mode");

    // Verificar se turno jÃ¡ foi selecionado
    const turnoSelecionado = verificarSelecaoTurno();
    
    if (turnoSelecionado) {
        // Turno jÃ¡ selecionado - iniciar sistema normalmente
        iniciarSistemaAposSelecaoTurno();
    }
    // Se turno nÃ£o foi selecionado, o modal ficarÃ¡ visÃ­vel atÃ© seleÃ§Ã£o
    
    // Listeners para controles de falha
    
    // Listeners para controles de falha
    const assumiuFalha = document.getElementById("assumiu_em_falha");
    if (assumiuFalha) {
        assumiuFalha.addEventListener("change", controleFalhaAssumida);
    }
    
    const recebeuEmFalha = document.getElementById("recebeu_em_falha");
    if (recebeuEmFalha) {
        recebeuEmFalha.addEventListener("change", controleRecebeuEmFalha);
    }
    
    // Listener para assunÃ§Ã£o de tabela
    const assumindoTabela = document.getElementById("assumindo_tabela");
    if (assumindoTabela) {
        assumindoTabela.addEventListener("change", controleAssuncao);
    }
    
    const recebeuEmFalhaAssuncao = document.getElementById("recebeu_em_falha_assuncao");
    if (recebeuEmFalhaAssuncao) {
        recebeuEmFalhaAssuncao.addEventListener("change", controleFalhaRecebida);
    }
    
    // Listener para produto
    const produtoField = document.getElementById("produto");
    if (produtoField) {
        produtoField.addEventListener("change", controleProduto);
    }
    
    // Listener para destino
    const destinoField = document.getElementById("destino");
    if (destinoField) {
        destinoField.addEventListener("change", controleDestino);
    }
    
    // Listener para mudanÃ§a de fluxo
    const mudancaFluxoField = document.getElementById("houve_mudanca_fluxo");
    if (mudancaFluxoField) {
        mudancaFluxoField.addEventListener("change", controleMudancaFluxo);
    }
    
    // Listeners para mostrar/esconder botÃ£o salvar
    const camposSalvar = [
        "maquinista",
        "loc1",
        "horas_maquinista",
        "ponto_b",
        "sinal",
        "tabela_posicionada",
        "data",
        "turno",
        "operador",
        "matricula",
        "prefixo",
        "inicio",
        "produto",
        "equipamento",
        "operador_assumiu_assuncao",
        "matricula_assumiu_assuncao",
        "turno_assumiu_assuncao",
        "vagoes_faltavam_assumir_assuncao"
    ];
    camposSalvar.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener("input", verificarMostrarBotaoSalvar);
            campo.addEventListener("change", verificarMostrarBotaoSalvar);
        }
    });
    
    // Listeners para verificar outro turno
    const turnoField = document.getElementById("turno");
    const operadorField = document.getElementById("operador");
    
    if (turnoField) {
        turnoField.addEventListener("change", verificarTabelaOutroTurno);
        turnoField.addEventListener("change", function() {
            const dataField = document.getElementById("data");
            const data = dataField ? dataField.value : new Date().toISOString().split('T')[0];
            salvarTurnoData(this.value, data);
        });
    }
    if (operadorField) {
        operadorField.addEventListener("input", verificarTabelaOutroTurno);
        operadorField.addEventListener("blur", verificarTabelaOutroTurno);
    }
    
    // Listener para campo de data
    const dataField = document.getElementById("data");
    if (dataField) {
        dataField.addEventListener("change", function() {
            const turnoField = document.getElementById("turno");
            const turno = turnoField ? turnoField.value : "";
            salvarTurnoData(turno, this.value);
        });
    }
    
    // Inicializar equipamentos e controles
    atualizarEquipamentos();
    controleProduto();
    controleDestino();
    controleTipoDivisao();
    controleEmpilhamento();
    
    // Verificar se deve mostrar select de tipo de operaÃ§Ã£o
    verificarMostrarTipoOperacao();
    
    // Carregar turno e data salvos
    carregarTurnoDataSalvos();
    
    // Carregar tabelas do servidor
    await atualizarSeletorTabelas();
    await atualizarListaFinalizadas();
    
    // Atualizar indicador de sincronizaÃ§Ã£o
    atualizarIndicadorSincronizacao();
    
    // Iniciar atualizacao automatica (10 segundos) para maior tempo real
    iniciarAtualizacaoAutomatica(10);
    
    // Restaurar dados salvos localmente
    restaurarDadosFormulario();
    
    // Salvar dados automaticamente
    document.addEventListener("input", salvarDadosFormulario);
    document.addEventListener("change", salvarDadosFormulario);
    
    instalarSanitizadorMensagens();
    sanitizarTextoUI();

    const observer = new MutationObserver(() => sanitizarTextoUI());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    console.log("Sistema de tabelas compartilhadas inicializado.");
});

