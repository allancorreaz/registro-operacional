/**
 * ======================================
 * REGISTRO OPERACIONAL - JAVASCRIPT
 * Organizado por Allan De Melo Correa
 * ======================================
 */

/* ======================================
   CONFIGURAÇÕES E CONSTANTES
====================================== */

// Equipamentos por produto
const EQUIPAMENTOS_MINERIO = ["VV1", "VV2", "VV3"];
const EQUIPAMENTOS_CARVAO = ["ECV"];
const RECUPERADORAS_CARVAO = ["R5", "R1A"];

// Chaves de armazenamento
const STORAGE_KEY = "registro_operacional_dados";
const STORAGE_KEY_TABELAS = "registro_operacional_tabelas_andamento";

// Campos do formulário para persistência
const CAMPOS_FORMULARIO = [
    "produto", "equipamento", "maquinista", "loc1", "loc2", "horas_maquinista",
    "ponto_b", "sinal", "tabela_posicionada", "data", "turno", "operador", "matricula",
    "tipo_material", "destino", "patio_nome", "baliza", "maquina_patio", "passando_por",
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

/* ======================================
   FUNÇÕES DE FORMATAÇÃO
====================================== */

/**
 * Capitaliza primeira letra e após pontos
 */
function capitalizarFrases(texto) {
    if (!texto) return texto;
    return texto
        .toLowerCase()
        .replace(/(^|[.!?]\s*)([a-záàâãéèêíïóôõöúçñ])/gi, (match, p1, p2) => p1 + p2.toUpperCase());
}

/**
 * Aplica capitalização em tempo real nos campos de impacto
 */
function aplicarCapitalizacaoImpacto(input) {
    input.addEventListener('blur', function() {
        this.value = capitalizarFrases(this.value);
    });
}

/**
 * Converte para maiúsculas (para envio ao servidor)
 */
function toUpperSafe(valor) {
    return valor ? valor.toUpperCase() : valor;
}

/**
 * Formata tempo em horas e minutos
 */
function formatarTempo(minutos) {
    if (minutos >= 60) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${minutos} min`;
}

/* ======================================
   CONTROLES DE EQUIPAMENTO/PRODUTO
====================================== */

/**
 * Atualiza lista de equipamentos baseado no produto
 */
function atualizarEquipamentos() {
    const produto = document.getElementById("produto").value;
    const selectEquip = document.getElementById("equipamento");
    const equipamentoAtual = selectEquip.value; // Preservar valor atual
    
    selectEquip.innerHTML = "";
    
    const equipamentos = produto === "Carvão" ? EQUIPAMENTOS_CARVAO : EQUIPAMENTOS_MINERIO;
    
    equipamentos.forEach(eq => {
        const opt = document.createElement("option");
        opt.value = eq;
        opt.textContent = eq;
        selectEquip.appendChild(opt);
    });
    
    // Restaurar valor selecionado se ainda for válido
    if (equipamentoAtual && equipamentos.includes(equipamentoAtual)) {
        selectEquip.value = equipamentoAtual;
    }
    
    controleEquipamento();
}

/**
 * Controla visibilidade do campo de sinal
 */
function controleEquipamento() {
    const equipamento = document.getElementById("equipamento").value;
    const sinalContainer = document.getElementById("sinalContainer");
    
    // ECV não tem passagem pelo sinal
    sinalContainer.style.display = equipamento === "ECV" ? "none" : "block";
}

/**
 * Atualiza placeholder do tipo de material com base na categoria
 */
function atualizarTiposMaterial(selectCategoria) {
    const row = selectCategoria.closest('.material-carvao-row');
    const inputTipo = row.querySelector('.carvao-tipo-material');
    const categoria = selectCategoria.value;
    
    inputTipo.placeholder = categoria === "CARVAO" 
        ? "Ex: MU, OG (carvão)"
        : "Ex: CCM, KL, KIN (coque)";
}

/* ======================================
   CONTROLES DE VISIBILIDADE
====================================== */

/**
 * Controla visibilidade baseado no destino selecionado
 */
function controleDestino() {
    const destino = document.getElementById("destino").value;
    
    document.getElementById("patioExtra").style.display = destino === "PATIO" ? "block" : "none";
    document.getElementById("bordoExtra").style.display = destino === "BORDO" ? "block" : "none";
    document.getElementById("tabelaPartidaExtra").style.display = destino === "PARTIDA" ? "block" : "none";
}

/**
 * Controla visibilidade baseado no produto selecionado
 */
function controleProduto() {
    const produto = document.getElementById("produto").value;
    
    atualizarEquipamentos();
    
    document.getElementById("minerioExtra").style.display = produto === "Carvão" ? "none" : "block";
    document.getElementById("carvaoExtra").style.display = produto === "Carvão" ? "block" : "none";
}

/**
 * Controla visibilidade do tipo de divisão
 */
function controleTipoDivisao() {
    const tipo = document.getElementById("tipo_divisao").value;
    
    document.getElementById("secaoBordo").style.display = tipo === "PATIO_PATIO" ? "none" : "block";
    document.getElementById("secaoPatio2").style.display = tipo === "PATIO_PATIO" ? "block" : "none";
}

/**
 * Controla visibilidade da mudança de fluxo
 */
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

/**
 * Controla visibilidade da passagem de turno
 */
function controlePassagem() {
    const houve = document.getElementById("houve_passagem").value;
    const passagemExtra = document.getElementById("passagemExtra");
    passagemExtra.style.display = houve === "SIM" ? "block" : "none";
    
    // Campos obrigatórios quando houver passagem
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
    
    // Limpar campos de falha se não houve passagem
    if (houve !== "SIM") {
        document.getElementById("descricao_falha_assumida").value = "";
        document.getElementById("hora_falha_passagem").value = "";
        document.getElementById("falhaAssumidaExtra").style.display = "none";
    }
}

/**
 * Controla visibilidade da falha assumida
 */
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

/* ======================================
   CONTROLE DE RECEBIMENTO DE TABELA
====================================== */

/**
 * Verifica se está finalizando tabela de outro turno
 */
function verificarTabelaOutroTurno() {
    const secaoRecebeu = document.getElementById("secaoRecebeuTabela");
    if (!secaoRecebeu) return;
    
    const turnoAtual = document.getElementById("turno").value;
    const operadorAtual = document.getElementById("operador").value.toUpperCase().trim();
    
    // Se há tabela carregada do servidor
    if (tabelaCarregadaInfo) {
        const turnoOriginal = tabelaCarregadaInfo.turno;
        const operadorOriginal = (tabelaCarregadaInfo.operador || "").toUpperCase().trim();
        
        const turnosDiferentes = turnoOriginal && turnoAtual && turnoOriginal !== turnoAtual;
        const operadoresDiferentes = operadorOriginal && operadorAtual && operadorOriginal !== operadorAtual;
        
        if (turnosDiferentes || operadoresDiferentes) {
            secaoRecebeu.style.display = "block";
            tornarCamposRecebimentoObrigatorios(true);
            return;
        }
    }
    
    // Se não há diferença, esconder seção
    secaoRecebeu.style.display = "none";
    tornarCamposRecebimentoObrigatorios(false);
}

/**
 * Torna campos de recebimento obrigatórios ou não
 */
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

/**
 * Controla visibilidade de falha recebida
 */
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

/* ======================================
   CONTROLE DE ASSUNÇÃO DE TABELA
====================================== */

/**
 * Controla visibilidade da seção de assunção
 */
function controleAssuncao() {
    const assumindo = document.getElementById("assumindo_tabela").value;
    const assuncaoExtra = document.getElementById("assuncaoExtra");
    const cardTabelasAndamento = document.getElementById("cardTabelasAndamento");
    const cardsDados = document.querySelectorAll('.card:not(#cardAssuncao):not(#cardTabelasAndamento):not(#cardTabelasFinalizadas)');
    const divSalvar = document.getElementById("divSalvar");
    
    if (assumindo === "NAO") {
        // Iniciando nova tabela - mostrar fluxo normal mas sem botão salvar ainda
        assuncaoExtra.style.display = "none";
        cardTabelasAndamento.style.display = "block";
        // Mostrar todos os outros cards
        cardsDados.forEach(card => card.style.display = "block");
        // Esconder botão salvar até preencher dados
        divSalvar.style.display = "none";
        
        // Limpar dados de assunção
        document.getElementById("seletorTabelasAssuncao").value = "";
        document.getElementById("dadosAssuncao").style.display = "none";
        
        // Verificar se deve mostrar botão salvar
        verificarMostrarBotaoSalvar();
        
    } else if (assumindo === "SIM") {
        // Assumindo tabela - mostrar seção de assunção
        assuncaoExtra.style.display = "block";
        cardTabelasAndamento.style.display = "none";
        // Ocultar outros cards até selecionar tabela
        cardsDados.forEach(card => card.style.display = "none");
        // Esconder botão salvar até selecionar tabela e preencher dados
        divSalvar.style.display = "none";
        
        // Carregar tabelas disponíveis para assunção
        atualizarSeletorTabelasAssuncao();
    } else {
        // Nada selecionado - ocultar tudo exceto assunção
        assuncaoExtra.style.display = "none";
        cardTabelasAndamento.style.display = "none";
        cardsDados.forEach(card => card.style.display = "none");
        divSalvar.style.display = "none";
    }
}

/**
 * Controla visibilidade de falha recebida na assunção
 */
function controleFalhaRecebida() {
    const recebeu = document.getElementById("recebeu_em_falha_assuncao").value;
    const falhaExtra = document.getElementById("falhaRecebidaExtra");
    
    falhaExtra.style.display = recebeu === "SIM" ? "block" : "none";
}

/**
 * Carrega tabela selecionada para assunção
 */
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
        alert("⚠️ Tabela não encontrada!");
        return;
    }
    
    // Mostrar dados da tabela selecionada
    const infoTabela = `
        <div class="info-tabela-assuncao">
            <h4>📋 Tabela Selecionada: ${tabela.prefixo}</h4>
            <p><strong>Data:</strong> ${tabela.data}</p>
            <p><strong>Turno Anterior:</strong> ${tabela.turno}</p>
            <p><strong>Operador Anterior:</strong> ${tabela.operador}</p>
            <p><strong>Produto:</strong> ${tabela.produto}</p>
            <p><strong>Equipamento:</strong> ${tabela.dados.equipamento || 'Não informado'}</p>
            <p><strong>Início:</strong> ${tabela.inicio}</p>
            <p><strong>Salvo em:</strong> ${tabela.salvoEm}</p>
        </div>
    `;
    
    dadosAssuncao.innerHTML = infoTabela + dadosAssuncao.innerHTML;
    dadosAssuncao.style.display = "block";
    
    // Preencher automaticamente dados do turno anterior
    document.getElementById("turno_passou_tabela").value = tabela.turno;
    document.getElementById("operador_passou_tabela").value = tabela.operador;
    // Matrícula do anterior pode não estar disponível, deixar em branco
    
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
    
    // Mostrar cards de dados após carregar tabela
    const cardsDados = document.querySelectorAll('.card:not(#cardAssuncao):not(#cardTabelasAndamento):not(#cardTabelasFinalizadas)');
    cardsDados.forEach(card => card.style.display = "block");
    
    // Verificar se deve mostrar botão salvar
    verificarMostrarBotaoSalvar();
    
    alert(`✅ Tabela "${tabela.prefixo}" carregada para assunção!\n\nAgora preencha seus dados pessoais obrigatórios e a situação atual da tabela.`);
}
}

/**
 * Verifica se deve mostrar o botão de salvar baseado nos dados preenchidos
 */
function verificarMostrarBotaoSalvar() {
    const assumindo = document.getElementById("assumindo_tabela").value;
    const divSalvar = document.getElementById("divSalvar");
    
    if (assumindo === "NAO") {
        // Para nova tabela, verificar campos básicos
        const prefixo = document.getElementById("prefixo").value;
        const inicio = document.getElementById("inicio").value;
        const produto = document.getElementById("produto").value;
        const equipamento = document.getElementById("equipamento").value;
        
        if (prefixo && inicio && produto && equipamento) {
            divSalvar.style.display = "block";
        } else {
            divSalvar.style.display = "none";
        }
        
    } else if (assumindo === "SIM") {
        // Para assunção, verificar campos obrigatórios de assunção
        const operadorAssumiu = document.getElementById("operador_assumiu").value;
        const matriculaAssumiu = document.getElementById("matricula_assumiu").value;
        const turnoAssumiu = document.getElementById("turno_assumiu").value;
        const vagoesFaltavam = document.getElementById("vagoes_faltavam_assumir").value;
        
        if (operadorAssumiu && matriculaAssumiu && turnoAssumiu && vagoesFaltavam) {
            divSalvar.style.display = "block";
        } else {
            divSalvar.style.display = "none";
        }
    }
}

/**
 * Valida campos de recebimento antes de gerar resultado
 */
function validarCamposRecebimento() {
    const secaoRecebeu = document.getElementById("secaoRecebeuTabela");
    if (!secaoRecebeu || secaoRecebeu.style.display === "none") {
        return { valido: true };
    }
    
    const camposObrigatorios = [
        { id: "turno_passou_tabela", nome: "Turno que passou a tabela" },
        { id: "operador_passou_tabela", nome: "Operador que passou a tabela" },
        { id: "matricula_passou_tabela", nome: "Matrícula do operador que passou" },
        { id: "hora_assumiu_tabela", nome: "Hora que assumiu a tabela" },
        { id: "vagoes_faltavam_assumir", nome: "Vagões que faltavam descarregar" },
        { id: "recebeu_em_falha", nome: "Se recebeu em falha" }
    ];
    
    for (const campo of camposObrigatorios) {
        const elemento = document.getElementById(campo.id);
        if (!elemento || !elemento.value) {
            return { 
                valido: false, 
                mensagem: `⚠️ Campo obrigatório: ${campo.nome}\n\nComo você está finalizando uma tabela de outro turno, é necessário preencher todos os dados de como recebeu a tabela.`
            };
        }
    }
    
    // Se recebeu em falha, validar campos adicionais
    if (document.getElementById("recebeu_em_falha").value === "SIM") {
        const camposFalha = [
            { id: "falha_recebida_desc", nome: "Descrição da falha recebida" },
            { id: "hora_inicio_falha_recebida", nome: "Hora de início da falha" }
        ];
        
        for (const campo of camposFalha) {
            const elemento = document.getElementById(campo.id);
            if (!elemento || !elemento.value) {
                return { 
                    valido: false, 
                    mensagem: `⚠️ Campo obrigatório: ${campo.nome}\n\nComo você recebeu a tabela em falha, é necessário informar os detalhes.`
                };
            }
        }
    }
    
    return { valido: true };
}

/* ======================================
   API DO SERVIDOR
====================================== */

/**
 * Obter tabelas em andamento do servidor
 */
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

/**
 * Obter tabelas finalizadas do servidor
 */
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

/**
 * Salvar tabela no servidor
 */
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

/**
 * Excluir tabela do servidor
 */
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

/**
 * Finalizar tabela no servidor
 */
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

/**
 * Excluir tabela finalizada do servidor
 */
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

/* ======================================
   GERENCIAMENTO DE TABELAS
====================================== */

/**
 * Atualiza lista de tabelas (UI)
 */
async function atualizarListaTabelas() {
    const btnAtualizar = document.getElementById("btnAtualizarTabelas");
    if (btnAtualizar) {
        btnAtualizar.disabled = true;
        btnAtualizar.textContent = "🔄 Atualizando...";
    }
    
    try {
        await Promise.all([
            atualizarSeletorTabelas(),
            atualizarListaFinalizadas()
        ]);
    } finally {
        if (btnAtualizar) {
            btnAtualizar.disabled = false;
            btnAtualizar.textContent = "🔄 Atualizar Lista";
        }
    }
}

/**
 * Inicia atualização automática
 */
function iniciarAtualizacaoAutomatica(intervaloSegundos = 30) {
    pararAtualizacaoAutomatica();
    atualizacaoAutomaticaInterval = setInterval(async () => {
        await atualizarListaTabelas();
        atualizarIndicadorSincronizacao();
    }, intervaloSegundos * 1000);
    console.log(`Atualização automática iniciada (a cada ${intervaloSegundos}s)`);
}

/**
 * Para atualização automática
 */
function pararAtualizacaoAutomatica() {
    if (atualizacaoAutomaticaInterval) {
        clearInterval(atualizacaoAutomaticaInterval);
        atualizacaoAutomaticaInterval = null;
    }
}

/**
 * Atualiza indicador de sincronização
 */
function atualizarIndicadorSincronizacao() {
    const indicador = document.getElementById("indicadorSincronizacao");
    if (indicador) {
        const agora = new Date().toLocaleTimeString('pt-BR');
        indicador.textContent = `Última sincronização: ${agora}`;
    }
}

/**
 * Retorna tabelas em andamento do cache
 */
function obterTabelasAndamento() {
    return tabelasAndamentoCache;
}

/**
 * Coleta dados atuais do formulário
 */
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
            atend_mecanica: row.querySelector(".impacto-atend-mecanica")?.checked || false,
            atend_eletrica: row.querySelector(".impacto-atend-eletrica")?.checked || false,
            atend_operacional: row.querySelector(".impacto-atend-operacional")?.checked || false,
            atend_outro: row.querySelector(".impacto-atend-outro")?.checked || false,
            acao: row.querySelector(".impacto-acao")?.value || ""
        });
    });
    
    // Salvar materiais carvão
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
    
    // Salvar mudanças de fluxo
    dados.mudancas_fluxo = [];
    document.querySelectorAll(".fluxo-row").forEach(row => {
        dados.mudancas_fluxo.push({
            hora: row.querySelector(".fluxo-hora")?.value || "",
            anterior: row.querySelector(".fluxo-anterior")?.value || "",
            novo: row.querySelector(".fluxo-novo")?.value || "",
            cco: row.querySelector(".fluxo-cco")?.checked || false,
            mecanica: row.querySelector(".fluxo-mecanica")?.checked || false,
            eletrica: row.querySelector(".fluxo-eletrica")?.checked || false,
            operacao: row.querySelector(".fluxo-operacao")?.checked || false,
            motivo: row.querySelector(".fluxo-motivo")?.value || ""
        });
    });
    
    return dados;
}

/**
 * Salvar tabela como início (em andamento)
 */
async function salvarTabelaInicio() {
    const assumindo = document.getElementById("assumindo_tabela").value;
    
    if (!assumindo) {
        alert("⚠️ Selecione o tipo de operação primeiro!");
        document.getElementById("assumindo_tabela").focus();
        return;
    }
    
    const prefixo = document.getElementById("prefixo").value;
    const inicio = document.getElementById("inicio").value;
    const data = document.getElementById("data").value;
    const turno = document.getElementById("turno").value;
    const produto = document.getElementById("produto").value;
    const operador = document.getElementById("operador").value;
    
    if (!prefixo) {
        alert("⚠️ Preencha o Prefixo/Trem para salvar a tabela!");
        document.getElementById("prefixo").focus();
        return;
    }
    
    if (!inicio) {
        alert("⚠️ Preencha o horário de Início para salvar a tabela!");
        document.getElementById("inicio").focus();
        return;
    }
    
    // Se está assumindo tabela, validar campos obrigatórios
    if (assumindo === "SIM") {
        const operadorAssumiu = document.getElementById("operador_assumiu").value;
        const matriculaAssumiu = document.getElementById("matricula_assumiu").value;
        const turnoAssumiu = document.getElementById("turno_assumiu").value;
        const vagoesFaltavam = document.getElementById("vagoes_faltavam_assumir").value;
        
        if (!operadorAssumiu || !matriculaAssumiu || !turnoAssumiu || !vagoesFaltavam) {
            alert("⚠️ Preencha todos os dados obrigatórios da assunção!");
            return;
        }
        
        // Preencher campos de recebimento automaticamente
        document.getElementById("recebeu_de_outro_turno").value = "true";
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
        btnSalvar.textContent = '⏳ Salvando...';
    }
    
    try {
        const resultado = await salvarTabelaServidor(dadosTabela);
        
        if (resultado.success) {
            tabelaSalva = true; // Marcar que tabela foi salva
            
            if (resultado.atualizado) {
                alert(`✅ Tabela "${prefixo}" atualizada no servidor!\n\n👥 Outros usuários podem ver esta tabela.`);
            } else {
                alert(`✅ Tabela "${prefixo}" salva no servidor!\n\n👥 Outros usuários podem ver e finalizar esta tabela.\n\nQuando quiser finalizar, selecione-a na lista "Tabelas em Andamento".`);
            }
            
            await atualizarSeletorTabelas();
            
            document.getElementById("seletorTabelasAndamento").value = resultado.id;
            const tabela = tabelasAndamentoCache.find(t => t.id === resultado.id);
            if (tabela) {
                mostrarInfoTabelaSelecionada(tabela);
            }
        } else {
            alert(`❌ Erro ao salvar tabela: ${resultado.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        alert(`❌ Erro de conexão: ${error.message}\n\nVerifique sua internet.`);
    } finally {
        if (btnSalvar) {
            btnSalvar.disabled = false;
            btnSalvar.textContent = textoOriginal;
        }
    }
}

/**
 * Atualiza o seletor de tabelas em andamento
 */
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
        
        const icone = tabela.produto === "Carvão" ? "⚫" : "🔶";
        option.textContent = `${icone} ${tabela.prefixo} | ${dataFormatada} | ${tabela.turno} | ${tabela.inicio} | ${tabela.operador || '-'}`;
        select.appendChild(option);
    });
    
    const contador = document.getElementById("contadorTabelas");
    if (contador) {
        contador.textContent = `(${tabelas.length} tabela${tabelas.length !== 1 ? 's' : ''})`;
    }
}

/**
 * Mostra informações da tabela selecionada
 */
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
        <strong>📋 Tabela Carregada:</strong><br>
        🚆 Prefixo: ${tabela.prefixo}<br>
        📅 Data: ${dataFormatada}<br>
        🕒 Turno: ${tabela.turno}<br>
        ⏳ Início: ${tabela.inicio}<br>
        👷 Operador: ${tabela.operador || '-'}<br>
        <small>💾 Salvo em: ${tabela.salvoEm}</small>
    `;
    info.style.display = "block";
}

/**
 * Carrega tabela selecionada do histórico
 */
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
        alert("⚠️ Tabela não encontrada!");
        return;
    }
    
    if (!confirm(`Carregar a tabela "${tabela.prefixo}"?\n\nOs dados atuais do formulário serão substituídos.`)) {
        select.value = "";
        return;
    }
    
    // Limpar containers dinâmicos
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
    
    // Quando carrega uma tabela existente para finalizar, não está assumindo
    document.getElementById("assumindo_tabela").value = "NAO";
    controleAssuncao();
    
    tabelaSalva = false; // Resetar flag pois tabela foi carregada mas não salva ainda
    
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
                if (lastRow.querySelector(".impacto-atend-mecanica")) lastRow.querySelector(".impacto-atend-mecanica").checked = imp.atend_mecanica;
                if (lastRow.querySelector(".impacto-atend-eletrica")) lastRow.querySelector(".impacto-atend-eletrica").checked = imp.atend_eletrica;
                if (lastRow.querySelector(".impacto-atend-operacional")) lastRow.querySelector(".impacto-atend-operacional").checked = imp.atend_operacional;
                if (lastRow.querySelector(".impacto-atend-outro")) lastRow.querySelector(".impacto-atend-outro").checked = imp.atend_outro;
                if (lastRow.querySelector(".impacto-acao")) lastRow.querySelector(".impacto-acao").value = imp.acao;
            }
        });
    }
    
    // Restaurar materiais carvão
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
                if (lastRow.querySelector(".fluxo-mecanica")) lastRow.querySelector(".fluxo-mecanica").checked = fluxo.mecanica;
                if (lastRow.querySelector(".fluxo-eletrica")) lastRow.querySelector(".fluxo-eletrica").checked = fluxo.eletrica;
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
        prefixo: tabela.prefixo
    };
    
    // Verificar se está finalizando tabela de outro turno
    setTimeout(() => {
        verificarTabelaOutroTurno();
    }, 500);
    
    // Rolar para o campo de término
    document.getElementById("termino").scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById("termino").focus();
    
    alert(`✅ Tabela "${tabela.prefixo}" carregada!\n\nAgora preencha o Término e gere o resultado.\n\n⚠️ Se você é de outro turno/operador, preencha os dados de como recebeu a tabela.`);
}

/**
 * Exclui tabela selecionada
 */
async function excluirTabelaAndamento() {
    const select = document.getElementById("seletorTabelasAndamento");
    const tabelaId = select.value;
    
    if (!tabelaId) {
        alert("⚠️ Selecione uma tabela para excluir!");
        return;
    }
    
    const tabelas = obterTabelasAndamento();
    const tabela = tabelas.find(t => t.id == tabelaId);
    
    if (!tabela) {
        alert("⚠️ Tabela não encontrada!");
        return;
    }
    
    if (!confirm(`Excluir a tabela "${tabela.prefixo}" do servidor?\n\n⚠️ Esta ação não pode ser desfeita e afetará todos os usuários.`)) {
        return;
    }
    
    try {
        const resultado = await excluirTabelaServidor(tabelaId);
        
        if (resultado.success) {
            await atualizarSeletorTabelas();
            document.getElementById("infoTabelaSelecionada").style.display = "none";
            alert(`✅ Tabela "${tabela.prefixo}" excluída do servidor!`);
        } else {
            alert(`❌ Erro ao excluir: ${resultado.error || 'Erro desconhecido'}`);
        }
    } catch (error) {
        alert(`❌ Erro de conexão: ${error.message}`);
    }
}

/**
 * Atualiza lista de tabelas finalizadas na UI
 */
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
        
        const icone = tabela.produto === "Carvão" ? "⚫" : "🔶";
        
        html += `
            <div class="tabela-finalizada-item" data-id="${tabela.id}">
                <div class="tabela-finalizada-info">
                    <strong>${icone} ${tabela.prefixo}</strong>
                    <span>${dataFormatada} | ${tabela.turno}</span>
                    <span>Início: ${tabela.inicio} → Término: ${tabela.termino || '-'}</span>
                    <span>Operador: ${tabela.operador || '-'}</span>
                    <span>Taxa: ${tabela.taxaEfetiva ? tabela.taxaEfetiva + ' t/h' : '-'}</span>
                </div>
                <div class="tabela-finalizada-acoes">
                    <button onclick="verRelatorioFinalizado(${tabela.id})" title="Ver relatório">📄</button>
                    <button onclick="excluirTabelaFinalizada(${tabela.id})" title="Excluir" class="btn-limpar">🗑️</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    const contador = document.getElementById("contadorFinalizadas");
    if (contador) {
        contador.textContent = `(${tabelas.length} tabela${tabelas.length !== 1 ? 's' : ''})`;
    }
}

/**
 * Ver relatório de tabela finalizada
 */
function verRelatorioFinalizado(tabelaId) {
    const tabela = tabelasFinalizadasCache.find(t => t.id === tabelaId);
    if (!tabela || !tabela.relatorio) {
        alert("Relatório não disponível.");
        return;
    }
    
    const resultadoDiv = document.getElementById("resultado");
    if (resultadoDiv) {
        resultadoDiv.innerHTML = `
            <h3>📋 Relatório - ${tabela.prefixo}</h3>
            <pre class="relatorio-pre">${tabela.relatorio}</pre>
        `;
        resultadoDiv.style.display = "block";
        resultadoDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Excluir tabela finalizada
 */
async function excluirTabelaFinalizada(tabelaId) {
    const tabela = tabelasFinalizadasCache.find(t => t.id === tabelaId);
    if (!tabela) {
        alert("Tabela não encontrada!");
        return;
    }
    
    if (!confirm(`Excluir a tabela finalizada "${tabela.prefixo}"?\n\n⚠️ Esta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        const resultado = await excluirTabelaFinalizadaServidor(tabelaId);
        if (resultado.success) {
            await atualizarListaFinalizadas();
            alert(`✅ Tabela "${tabela.prefixo}" excluída!`);
        } else {
            alert(`❌ Erro ao excluir: ${resultado.error}`);
        }
    } catch (error) {
        alert(`❌ Erro de conexão: ${error.message}`);
    }
}

/* ======================================
   PERSISTÊNCIA LOCAL
====================================== */

/**
 * Salva dados do formulário no localStorage
 */
function salvarDadosFormulario() {
    const dados = coletarDadosFormulario();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

/**
 * Restaura dados do formulário do localStorage
 */
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
                if (lastRow.querySelector(".impacto-atend-mecanica")) lastRow.querySelector(".impacto-atend-mecanica").checked = imp.atend_mecanica;
                if (lastRow.querySelector(".impacto-atend-eletrica")) lastRow.querySelector(".impacto-atend-eletrica").checked = imp.atend_eletrica;
                if (lastRow.querySelector(".impacto-atend-operacional")) lastRow.querySelector(".impacto-atend-operacional").checked = imp.atend_operacional;
                if (lastRow.querySelector(".impacto-atend-outro")) lastRow.querySelector(".impacto-atend-outro").checked = imp.atend_outro;
                if (lastRow.querySelector(".impacto-acao")) lastRow.querySelector(".impacto-acao").value = imp.acao;
            }
        });
    }
    
    // Restaurar materiais carvão
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
                if (lastRow.querySelector(".fluxo-mecanica")) lastRow.querySelector(".fluxo-mecanica").checked = fluxo.mecanica;
                if (lastRow.querySelector(".fluxo-eletrica")) lastRow.querySelector(".fluxo-eletrica").checked = fluxo.eletrica;
                if (lastRow.querySelector(".fluxo-operacao")) lastRow.querySelector(".fluxo-operacao").checked = fluxo.operacao;
                if (lastRow.querySelector(".fluxo-motivo")) lastRow.querySelector(".fluxo-motivo").value = fluxo.motivo;
            }
        });
    }
}

/**
 * Limpa dados salvos do localStorage
 */
function limparDadosSalvos() {
    localStorage.removeItem(STORAGE_KEY);
}

/* ======================================
   ELEMENTOS DINÂMICOS
====================================== */

/**
 * Adiciona mudança de fluxo
 */
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
                <label><input type="checkbox" class="fluxo-mecanica" value="MECANICA"> Mecânica</label>
                <label><input type="checkbox" class="fluxo-eletrica" value="ELETRICA"> Elétrica</label>
                <label><input type="checkbox" class="fluxo-operacao" value="OPERACAO"> Operação</label>
            </div>
        </div>
        
        <input type="text" class="fluxo-motivo" placeholder="Motivo da mudança">
    `;
    
    container.appendChild(row);
}

/**
 * Adiciona material de carvão
 */
function adicionarMaterialCarvao() {
    const container = document.getElementById("materiaisCarvaoContainer");
    const index = container.children.length + 1;
    
    const row = document.createElement("div");
    row.className = "material-carvao-row";
    
    row.innerHTML = `
        <div class="material-header">
            <strong>Material #${index}</strong>
            <button type="button" class="btn-remover" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        
        <label>Categoria do Material</label>
        <select class="carvao-categoria" onchange="atualizarTiposMaterial(this)">
            <option value="CARVAO">Carvão</option>
            <option value="COQUE">Coque</option>
        </select>
        
        <label>Tipo de Material (sigla)</label>
        <input type="text" class="carvao-tipo-material" placeholder="Ex: MU, OG (carvão) ou CCM, KL (coque)">
        
        <label>Pátio de origem</label>
        <select class="carvao-patio">
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

/**
 * Adiciona impacto/falha
 */
function adicionarImpacto() {
    const container = document.getElementById("impactosContainer");

    const row = document.createElement("div");
    row.className = "impacto-row";

    row.innerHTML = `
        <input type="text" class="impacto-desc" placeholder="Descrição do impacto/falha (Ex: Subvelocidade AS101)">
        
        <div class="impacto-atendimento-grupo">
            <label class="atendimento-label">Quem atendeu a falha?</label>
            <div class="atendimento-checkboxes">
                <label><input type="checkbox" class="impacto-atend-mecanica" value="MECANICA"> Mecânica</label>
                <label><input type="checkbox" class="impacto-atend-eletrica" value="ELETRICA"> Elétrica</label>
                <label><input type="checkbox" class="impacto-atend-operacional" value="OPERACIONAL"> Operacional</label>
                <label><input type="checkbox" class="impacto-atend-outro" value="OUTRO"> Outro</label>
            </div>
        </div>
        
        <input type="text" class="impacto-acao" placeholder="O que foi feito para resolver? (Ex: Comando local após inspeção)">
        
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

/* ======================================
   CÁLCULO E RESULTADO
====================================== */

/**
 * Função principal de cálculo
 */
function calcular() {
    // Verificar se tabela foi salva
    if (!tabelaSalva) {
        alert("⚠️ Você deve salvar a tabela antes de gerar o resultado!\n\nClique em '💾 Salvar Início' primeiro.");
        return;
    }
    
    // Validar campos de recebimento
    const validacaoRecebimento = validarCamposRecebimento();
    if (!validacaoRecebimento.valido) {
        alert(validacaoRecebimento.mensagem);
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
        if (row.querySelector(".impacto-atend-mecanica")?.checked) atendimentos.push("MECANICA");
        if (row.querySelector(".impacto-atend-eletrica")?.checked) atendimentos.push("ELETRICA");
        if (row.querySelector(".impacto-atend-operacional")?.checked) atendimentos.push("OPERACIONAL");
        if (row.querySelector(".impacto-atend-outro")?.checked) atendimentos.push("OUTRO");
        impactosTipoAtendimento.push(atendimentos.join(" / "));
        
        impactosAcao.push(capitalizarFrases(row.querySelector(".impacto-acao")?.value || ""));
    });

    // Coletar mudanças de fluxo
    const mudancasFluxo = [];
    document.querySelectorAll(".fluxo-row").forEach(row => {
        const solicitantes = [];
        if (row.querySelector(".fluxo-cco")?.checked) solicitantes.push("CCO");
        if (row.querySelector(".fluxo-mecanica")?.checked) solicitantes.push("MECANICA");
        if (row.querySelector(".fluxo-eletrica")?.checked) solicitantes.push("ELETRICA");
        if (row.querySelector(".fluxo-operacao")?.checked) solicitantes.push("OPERACAO");
        
        mudancasFluxo.push({
            hora: row.querySelector(".fluxo-hora")?.value || "",
            fluxo_anterior: toUpperSafe(row.querySelector(".fluxo-anterior")?.value) || "",
            fluxo_novo: toUpperSafe(row.querySelector(".fluxo-novo")?.value) || "",
            solicitante: solicitantes.join(" / "),
            motivo: toUpperSafe(row.querySelector(".fluxo-motivo")?.value) || ""
        });
    });

    // Coletar materiais de carvão
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

        // Mudança de fluxo
        houve_mudanca_fluxo: document.getElementById("houve_mudanca_fluxo")?.value || "NAO",
        mudancas_fluxo: mudancasFluxo,

        // Minério
        equipamento: document.getElementById("equipamento")?.value || "",
        tipo_material: toUpperSafe(document.getElementById("tipo_material")?.value) || "",
        destino: document.getElementById("destino")?.value || "",
        patio: toUpperSafe(document.getElementById("patio_nome")?.value) || "",
        baliza: toUpperSafe(document.getElementById("baliza")?.value) || "",
        maquina_patio: document.getElementById("maquina_patio")?.value || "",
        passando_por: toUpperSafe(document.getElementById("passando_por")?.value) || "",

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

        // Carvão
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
        
        if (dados.produto === "Carvão") {
            resultado.innerHTML = gerarResultadoCarvao(dados, data);
        } else {
            resultado.innerHTML = gerarResultadoMinerio(dados, data);
        }
        
        // Se tem término, finalizar a tabela
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
                        console.warn("Não foi possível salvar tabela automaticamente antes da finalização.");
                    }
                }

                // Se conseguimos um ID (selecionado ou recém-criado), finalizar no servidor
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
                        // Limpa seleção e atualiza listas para exibir em "Finalizadas" imediatamente
                        document.getElementById("seletorTabelasAndamento").value = "";
                        document.getElementById("infoTabelaSelecionada").style.display = "none";
                        await atualizarListaTabelas();
                        console.log("✅ Tabela movida para finalizadas!");
                    }
                }
            } catch (error) {
                console.error("Erro ao finalizar tabela:", error);
            }
        }
    });
}

/* ======================================
   GERAÇÃO DE RESULTADO HTML
====================================== */

/**
 * Gera resultado para minério
 */
function gerarResultadoMinerio(dados, data) {
    let destinoTexto = "";
    if (dados.destino === "PATIO") {
        destinoTexto = `Pátio ${dados.patio} | Baliza ${dados.baliza} | ${dados.maquina_patio || "—"}`;
    }
    if (dados.destino === "BORDO") {
        destinoTexto = dados.passando_por ? `Bordo (passando por ${dados.passando_por})` : "Trem de Bordo";
    }
    if (dados.destino === "PARTIDA") destinoTexto = "Tabela Dividida/Fracionada";

    let impactosHTML = gerarImpactosHTML(dados);
    let passagemHTML = gerarPassagemHTML(dados);
    let mudancaFluxoHTML = gerarMudancaFluxoHTML(dados);

    let dataFormatada = "—";
    if (dados.data) {
        const [ano, mes, dia] = dados.data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }

    let tabelaPartidaHTML = "";
    if (dados.destino === "PARTIDA") {
        if (dados.tipo_divisao === "PATIO_PATIO") {
            tabelaPartidaHTML = `
<strong>📊 TABELA DIVIDIDA (PÁTIO + PÁTIO):</strong><br>
<strong>1º Pátio:</strong> ${dados.patio_partida} | Baliza: ${dados.baliza_partida} | ${dados.maquina_patio1 || "—"}<br>
Vagões: ${dados.vagoes_patio || "—"} (${dados.hora_inicio_patio || "—"} → ${dados.hora_fim_patio || "—"})<br><br>
<strong>2º Pátio:</strong> ${dados.patio_partida2} | Baliza: ${dados.baliza_partida2} | ${dados.maquina_patio2 || "—"}<br>
Vagões: ${dados.vagoes_patio2 || "—"} (${dados.hora_inicio_patio2 || "—"} → ${dados.hora_fim_patio2 || "—"})<br>
<br>`;
        } else {
            tabelaPartidaHTML = `
<strong>📊 TABELA DIVIDIDA (PÁTIO + BORDO):</strong><br>
<strong>Pátio:</strong> ${dados.patio_partida} | Baliza: ${dados.baliza_partida} | ${dados.maquina_patio1 || "—"}<br>
Vagões: ${dados.vagoes_patio || "—"} (${dados.hora_inicio_patio || "—"} → ${dados.hora_fim_patio || "—"})<br><br>
<strong>Bordo:</strong><br>
Vagões: ${dados.vagoes_bordo || "—"} (${dados.hora_inicio_bordo || "—"} → ${dados.hora_fim_bordo || "—"})<br>
<br>`;
        }
    }

    return `
📅 <strong>Data da Operação:</strong> ${dataFormatada}<br>
🕒 <strong>Turno:</strong> ${dados.turno || "—"}<br>
<hr>

<strong>🚆 ${dados.prefixo}</strong><br>
${dados.oferta}<br><br>

👷 Operador: ${dados.operador} | Mat: ${dados.matricula}<br>
👨‍✈️ Maquinista: ${dados.maquinista}<br>
🚂 Locomotivas: ${dados.loc1} / ${dados.loc2}<br>
🕐 Contato com Maquinista: ${dados.horas_maquinista}<br>
📍 Passagem Ponto B: ${dados.ponto_b}<br>
🚦 Passagem pelo Sinal: ${dados.sinal}<br>
📋 Tabela Posicionada: ${dados.tabela_posicionada}<br><br>

⚙️ Equipamento: ${dados.equipamento}<br>
📦 Produto: ${dados.produto} (${dados.tipo_material})<br>
📍 Destino: ${destinoTexto}<br><br>

${tabelaPartidaHTML}
<br>
⏳ <strong>INÍCIO:</strong> ${dados.inicio || "—"}h<br>
⌛ <strong>TÉRMINO:</strong> ${dados.termino || "—"}h<br>
⏱ <strong>${dados.equipamento.startsWith("VV") ? "TMD" : "TMC"}:</strong> ${dados.termino ? formatarTempo(data.tmd) : "—"}<br>
⛔ Tempo Total Parado: ${formatarTempo(data.impactos_total)}<br>
✅ Hora Efetiva: ${dados.termino ? formatarTempo(data.hora_efetiva) : "—"}<br><br>

⚖️ Peso Total: ${dados.peso} t<br>
📈 <strong>Taxa Efetiva:</strong> ${dados.termino && data.taxa_efetiva > 0 ? data.taxa_efetiva + " t/h" : "—"}<br><br>

${mudancaFluxoHTML}
${passagemHTML}
<strong>Impactos/Falhas:</strong><br>${impactosHTML}<br>
<strong>Observações:</strong><br>${dados.observacoes}
    `;
}

/**
 * Gera resultado para carvão
 */
function gerarResultadoCarvao(dados, data) {
    let impactosHTML = gerarImpactosHTML(dados);
    let passagemHTML = gerarPassagemHTML(dados);
    let mudancaFluxoHTML = gerarMudancaFluxoHTML(dados);

    let dataFormatada = "—";
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
📍 ${mat.patio} - ${mat.baliza}<br>
📍 ${mat.recuperadora}<br><br>

📦 ${categoriaNome}: ${mat.tipo_material} (${mat.acao})<br><br>

⚖️ <strong>Peso ECV:</strong> ${mat.peso_ecv || "—"} t<br>
⚖️ <strong>Peso ${mat.recuperadora}:</strong> ${mat.peso_recup || "—"} t<br>
🚃 Vagões: ${mat.vagoes || "—"}<br>
${mat.hora_inicio ? `⏳ ${mat.hora_inicio} → ${mat.hora_fim || "—"}<br><br>` : ""}
</div>`;
            }
        });
    }

    return `
📅 <strong>Data da Operação:</strong> ${dataFormatada}<br>
🕒 <strong>Turno:</strong> ${dados.turno || "—"}<br>
<hr>

<strong>⚫ ECV</strong><br><br>

<strong>${dados.oferta}</strong><br><br>

🚆 <strong>${dados.prefixo}</strong><br><br>

👷 Operador: ${dados.operador} | Mat: ${dados.matricula}<br>
👨‍✈️ Maquinista: ${dados.maquinista}<br>
🚂 Locomotivas: ${dados.loc1} / ${dados.loc2}<br>
🕐 Contato com Maquinista: ${dados.horas_maquinista}<br>
📍 Passagem Ponto B: ${dados.ponto_b}<br>
📋 Tabela Posicionada: ${dados.tabela_posicionada}<br>
🚃 1º Vagão: ${dados.primeiro_vagao || "—"}<br><br>

${materiaisHTML}
<br>
⏳ <strong>INÍCIO:</strong> ${dados.inicio || "—"}h<br>
⌛ <strong>TÉRMINO:</strong> ${dados.termino || "—"}h<br>
⏱ <strong>TMC:</strong> ${dados.termino ? formatarTempo(data.tmd) : "—"}<br>
⛔ Tempo Total Parado: ${formatarTempo(data.impactos_total)}<br>
✅ Hora Efetiva: ${dados.termino ? formatarTempo(data.hora_efetiva) : "—"}<br><br>

⚖️ Peso Total: ${dados.peso} t<br>
📈 <strong>Taxa Efetiva:</strong> ${dados.termino && data.taxa_efetiva > 0 ? data.taxa_efetiva + " t/h" : "—"}<br><br>

${mudancaFluxoHTML}
${passagemHTML}
<strong>Impactos/Falhas:</strong><br>${impactosHTML}<br>
<strong>Observações:</strong><br>${dados.observacoes}
    `;
}

/**
 * Gera HTML dos impactos
 */
function gerarImpactosHTML(dados) {
    let html = "";
    dados.impactos.forEach((min, i) => {
        if (min > 0) {
            const horaInicio = dados.impactos_hora_inicio[i] || "";
            const horaFim = dados.impactos_hora_fim[i] || "";
            const tipoAtend = dados.impactos_tipo_atendimento[i] || "";
            const acao = dados.impactos_acao[i] || "";
            const horarios = horaInicio ? ` (${horaInicio} → ${horaFim})` : "";
            const tipoTexto = tipoAtend ? ` [${tipoAtend}]` : "";
            const acaoTexto = acao ? ` - Ação: ${acao}` : "";
            html += `• ${dados.impactos_desc[i]}${tipoTexto} – ${formatarTempo(min)}${horarios}${acaoTexto}<br>`;
        }
    });
    return html || "Nenhum impacto registrado<br>";
}

/**
 * Gera HTML da passagem de turno
 */
function gerarPassagemHTML(dados) {
    if (dados.houve_passagem === "SIM") {
        let falhaTexto = "";
        if (dados.assumiu_em_falha === "SIM") {
            falhaTexto = `⚠️ Passou em FALHA: ${dados.descricao_falha_assumida} (às ${dados.hora_falha_passagem || "—"})<br>`;
        }
        
        return `
<strong>🔄 PASSAGEM DE TURNO:</strong><br>
🕐 Hora da rendição: ${dados.hora_rendicao || "—"}<br>
🚃 Vagões descarregados no meu turno: ${dados.vagoes_meu_turno || "—"}<br>
🚃 Vagões restantes p/ próximo turno: ${dados.vagoes_proximo_turno || "—"}<br>
👷 Turno que assumiu: ${dados.turno_assumiu || "—"}<br>
👷 Operador que assumiu: ${dados.operador_assumiu || "—"} | Mat: ${dados.matricula_assumiu || "—"}<br>
${falhaTexto}
<br>`;
    }
    return "";
}

/**
 * Gera HTML da mudança de fluxo
 */
function gerarMudancaFluxoHTML(dados) {
    if (dados.houve_mudanca_fluxo === "SIM" && dados.mudancas_fluxo && dados.mudancas_fluxo.length > 0) {
        let html = "<strong>🔄 MUDANÇAS DE FLUXO:</strong><br>";
        dados.mudancas_fluxo.forEach((fluxo, i) => {
            if (fluxo.hora || fluxo.fluxo_anterior || fluxo.fluxo_novo) {
                html += `• ${fluxo.hora || "—"}: ${fluxo.fluxo_anterior} → ${fluxo.fluxo_novo}`;
                if (fluxo.solicitante) html += ` [${fluxo.solicitante}]`;
                if (fluxo.motivo) html += ` - ${fluxo.motivo}`;
                html += "<br>";
            }
        });
        return html + "<br>";
    }
    return "";
}

/* ======================================
   EXPORTAÇÃO (PDF, WHATSAPP, EMAIL)
====================================== */

/**
 * Gera PDF do relatório
 */
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let texto = document.getElementById("resultado").innerText;
    
    // Remover emojis e caracteres especiais
    texto = texto
        .replace(/\[DATA\]\s*/g, "")
        .replace(/\[TURNO\]\s*/g, "")
        .replace(/\[TREM\]\s*/g, "")
        .replace(/📅|🕒|🚆|👷|👨‍✈️|🚂|🕐|📍|🚦|📋|⚙️|📦|🕚|⏱|⛔|✅|⚖️|📈|🔄|⚠️|⏳|⌛|🚃/g, "")
        .replace(/•/g, "-")
        .replace(/→/g, "->")
        .replace(/—/g, "-")
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

/**
 * Copia texto para WhatsApp
 */
function copiarWhatsApp() {
    const texto = document.getElementById("resultado").innerText;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto)
            .then(() => alert("📲 Texto copiado!"));
    } else {
        const textarea = document.createElement("textarea");
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("📲 Texto copiado!");
    }
}

/**
 * Envia relatório por email
 */
function enviarEmail() {
    const resultado = document.getElementById("resultado");
    
    if (resultado.style.display === "none" || !resultado.innerText.trim()) {
        alert("⚠️ Gere o resultado primeiro!");
        return;
    }
    
    const emailDestino = document.getElementById("email").value;
    if (!emailDestino) {
        alert("⚠️ Preencha o email de destino!");
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
    
    const assunto = `Relatório Operacional - ${prefixo} - ${produto} - ${turno} - ${dataFormatada}`;
    let corpo = resultado.innerText;
    
    const mailtoLink = `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = mailtoLink;
}

/* ======================================
   DARK MODE E UTILITÁRIOS
====================================== */

/**
 * Alterna dark mode
 */
function toggleDarkMode() {
    document.documentElement.classList.toggle("dark-mode");
}

/**
 * Limpa formulário
 */
function limparFormulario() {
    if (!confirm("⚠️ Tem certeza que deseja limpar todos os dados?")) {
        return;
    }
    
    limparDadosSalvos();
    tabelaSalva = false; // Resetar flag de salvamento
    window.location.reload();
}

/* ======================================
   INICIALIZAÇÃO
====================================== */

document.addEventListener("DOMContentLoaded", async function() {
    // Listeners para controles de falha
    const assumiuFalha = document.getElementById("assumiu_em_falha");
    if (assumiuFalha) {
        assumiuFalha.addEventListener("change", controleFalhaAssumida);
    }
    
    const recebeuEmFalha = document.getElementById("recebeu_em_falha");
    if (recebeuEmFalha) {
        recebeuEmFalha.addEventListener("change", controleRecebeuEmFalha);
    }
    
    // Listener para assunção de tabela
    const assumindoTabela = document.getElementById("assumindo_tabela");
    if (assumindoTabela) {
        assumindoTabela.addEventListener("change", controleAssuncao);
    }
    
    const recebeuEmFalhaAssuncao = document.getElementById("recebeu_em_falha_assuncao");
    if (recebeuEmFalhaAssuncao) {
        recebeuEmFalhaAssuncao.addEventListener("change", controleFalhaRecebida);
    }
    
    // Listeners para mostrar/esconder botão salvar
    const camposSalvar = ["prefixo", "inicio", "produto", "equipamento", "operador_assumiu", "matricula_assumiu", "turno_assumiu", "vagoes_faltavam_assumir"];
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
    }
    if (operadorField) {
        operadorField.addEventListener("input", verificarTabelaOutroTurno);
        operadorField.addEventListener("blur", verificarTabelaOutroTurno);
    }
    
    // Inicializar equipamentos e controles
    atualizarEquipamentos();
    controleProduto();
    
    // Carregar tabelas do servidor
    await atualizarSeletorTabelas();
    await atualizarListaFinalizadas();
    
    // Atualizar indicador de sincronização
    atualizarIndicadorSincronizacao();
    
    // Iniciar atualização automática (30 segundos)
    iniciarAtualizacaoAutomatica(30);
    
    // Restaurar dados salvos localmente
    restaurarDadosFormulario();
    
    // Salvar dados automaticamente
    document.addEventListener("input", salvarDadosFormulario);
    document.addEventListener("change", salvarDadosFormulario);
    
    console.log("✅ Sistema de tabelas compartilhadas inicializado!");
});
