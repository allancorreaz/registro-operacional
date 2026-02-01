/* ===== FUNÇÕES DE FORMATAÇÃO DE TEXTO ===== */

// Capitalizar primeira letra e após pontos (para descrição de impactos)
function capitalizarFrases(texto) {
    if (!texto) return texto;
    return texto
        .toLowerCase()
        .replace(/(^|[.!?]\s*)([a-záàâãéèêíïóôõöúçñ])/gi, (match, p1, p2) => p1 + p2.toUpperCase());
}

// Aplicar capitalização em tempo real nos campos de impacto
function aplicarCapitalizacaoImpacto(input) {
    input.addEventListener('blur', function() {
        this.value = capitalizarFrases(this.value);
    });
}

// Converter para maiúsculas (para envio ao servidor)
function toUpperSafe(valor) {
    return valor ? valor.toUpperCase() : valor;
}

/* ===== EQUIPAMENTOS POR PRODUTO ===== */
const equipamentosMinério = ["VV1", "VV2", "VV3"];
const equipamentosCarvao = ["ECV"];
const recuperadorasCarvao = ["R5", "R1A"];

function atualizarEquipamentos() {
    const produto = document.getElementById("produto").value;
    const selectEquip = document.getElementById("equipamento");
    
    selectEquip.innerHTML = "";
    
    const equipamentos = produto === "Carvão" ? equipamentosCarvao : equipamentosMinério;
    
    equipamentos.forEach(eq => {
        const opt = document.createElement("option");
        opt.value = eq;
        opt.textContent = eq;
        selectEquip.appendChild(opt);
    });
    
    controleEquipamento();
}

function controleEquipamento() {
    const equipamento = document.getElementById("equipamento").value;
    const sinalContainer = document.getElementById("sinalContainer");
    
    // ECV não tem passagem pelo sinal
    if (equipamento === "ECV") {
        sinalContainer.style.display = "none";
    } else {
        sinalContainer.style.display = "block";
    }
}

// Atualizar placeholder do tipo de material com base na categoria
function atualizarTiposMaterial(selectCategoria) {
    const row = selectCategoria.closest('.material-carvao-row');
    const inputTipo = row.querySelector('.carvao-tipo-material');
    const categoria = selectCategoria.value;
    
    if (categoria === "CARVAO") {
        inputTipo.placeholder = "Ex: MU, OG";
    } else {
        inputTipo.placeholder = "Ex: CCM, KL, KIN";
    }
}

/* ===== CONTROLES DE VISIBILIDADE ===== */

function controleDestino() {
    const destino = document.getElementById("destino").value;
    const patioExtra = document.getElementById("patioExtra");
    const tabelaPartidaExtra = document.getElementById("tabelaPartidaExtra");
    
    patioExtra.style.display = destino === "PATIO" ? "block" : "none";
    tabelaPartidaExtra.style.display = destino === "PARTIDA" ? "block" : "none";
}

function controleProduto() {
    const produto = document.getElementById("produto").value;
    const minerioExtra = document.getElementById("minerioExtra");
    const carvaoExtra = document.getElementById("carvaoExtra");
    
    atualizarEquipamentos();
    
    if (produto === "Carvão") {
        minerioExtra.style.display = "none";
        carvaoExtra.style.display = "block";
    } else {
        minerioExtra.style.display = "block";
        carvaoExtra.style.display = "none";
    }
}

function controleTipoDivisao() {
    const tipo = document.getElementById("tipo_divisao").value;
    const secaoBordo = document.getElementById("secaoBordo");
    const secaoPatio2 = document.getElementById("secaoPatio2");
    
    if (tipo === "PATIO_PATIO") {
        secaoBordo.style.display = "none";
        secaoPatio2.style.display = "block";
    } else {
        secaoBordo.style.display = "block";
        secaoPatio2.style.display = "none";
    }
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
    
    // Campos que devem ser obrigatórios quando houver passagem de turno
    const camposPassagem = [
        "vagoes_meu_turno",
        "turno_assumiu",
        "operador_assumiu",
        "matricula_assumiu",
        "hora_rendicao",
        "vagoes_proximo_turno",
        "assumiu_em_falha"
    ];
    
    camposPassagem.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            if (houve === "SIM") {
                campo.setAttribute("required", "required");
            } else {
                campo.removeAttribute("required");
                campo.value = ""; // Limpar campo quando desabilitar
            }
        }
    });
    
    // Se não houve passagem, limpar também os campos de falha
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
    
    // Campos obrigatórios se passou com falha
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

/* ===== PERSISTÊNCIA DE DADOS (SESSION STORAGE) ===== */
const STORAGE_KEY = "registro_operacional_dados";
const STORAGE_KEY_TABELAS = "registro_operacional_tabelas_andamento";

// Lista de IDs dos campos do formulário para salvar
const camposFormulario = [
    "produto", "equipamento", "maquinista", "loc1", "loc2", "horas_maquinista",
    "ponto_b", "sinal", "tabela_posicionada", "data", "turno", "operador", "matricula",
    "tipo_material", "destino", "patio_nome", "baliza", "tipo_divisao", "primeiro_vagao",
    "vagoes_patio", "patio_partida", "baliza_partida", "maquina_patio1",
    "hora_inicio_patio", "hora_fim_patio", "vagoes_bordo", "hora_inicio_bordo",
    "hora_fim_bordo", "vagoes_patio2", "patio_partida2", "baliza_partida2",
    "maquina_patio2", "hora_inicio_patio2", "hora_fim_patio2",
    "prefixo", "oferta", "inicio", "termino", "peso",
    "houve_mudanca_fluxo", "houve_passagem", "vagoes_meu_turno", "turno_assumiu",
    "operador_assumiu", "matricula_assumiu", "hora_rendicao", "vagoes_proximo_turno", 
    "assumiu_em_falha", "descricao_falha_assumida", "hora_falha_passagem",
    "observacoes", "email"
];

/* ===== HISTÓRICO DE TABELAS EM ANDAMENTO ===== */

// Obter todas as tabelas salvas
function obterTabelasAndamento() {
    const dados = localStorage.getItem(STORAGE_KEY_TABELAS);
    return dados ? JSON.parse(dados) : [];
}

// Salvar lista de tabelas
function salvarTabelasAndamento(tabelas) {
    localStorage.setItem(STORAGE_KEY_TABELAS, JSON.stringify(tabelas));
}

// Coletar dados atuais do formulário
function coletarDadosFormulario() {
    const dados = {};
    
    // Salvar campos simples
    camposFormulario.forEach(id => {
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

// Salvar tabela como início (em andamento)
function salvarTabelaInicio() {
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
    
    const tabelas = obterTabelasAndamento();
    
    // Verificar se já existe uma tabela com mesmo prefixo, data e turno
    const indiceExistente = tabelas.findIndex(t => 
        t.prefixo === prefixo && t.data === data && t.turno === turno
    );
    
    const dadosFormulario = coletarDadosFormulario();
    
    const novaTabela = {
        id: indiceExistente >= 0 ? tabelas[indiceExistente].id : Date.now(),
        prefixo: prefixo,
        data: data,
        turno: turno,
        produto: produto,
        operador: operador,
        inicio: inicio,
        salvoEm: new Date().toLocaleString('pt-BR'),
        dados: dadosFormulario
    };
    
    if (indiceExistente >= 0) {
        tabelas[indiceExistente] = novaTabela;
        alert(`✅ Tabela "${prefixo}" atualizada no histórico!`);
    } else {
        tabelas.unshift(novaTabela); // Adicionar no início da lista
        alert(`✅ Tabela "${prefixo}" salva no histórico!\n\nQuando quiser finalizar, selecione-a na lista "Tabelas em Andamento".`);
    }
    
    salvarTabelasAndamento(tabelas);
    atualizarSeletorTabelas();
    
    // Selecionar a tabela recém-salva
    document.getElementById("seletorTabelasAndamento").value = novaTabela.id;
    mostrarInfoTabelaSelecionada(novaTabela);
}

// Atualizar o seletor de tabelas em andamento
function atualizarSeletorTabelas() {
    const select = document.getElementById("seletorTabelasAndamento");
    const tabelas = obterTabelasAndamento();
    
    // Limpar opções existentes (exceto a primeira)
    select.innerHTML = '<option value="">-- Nova Tabela --</option>';
    
    tabelas.forEach(tabela => {
        const option = document.createElement("option");
        option.value = tabela.id;
        
        // Formatar data para exibição
        let dataFormatada = "";
        if (tabela.data) {
            const [ano, mes, dia] = tabela.data.split("-");
            dataFormatada = `${dia}/${mes}`;
        }
        
        option.textContent = `${tabela.prefixo} | ${dataFormatada} | ${tabela.turno} | Início: ${tabela.inicio}`;
        select.appendChild(option);
    });
}

// Mostrar informações da tabela selecionada
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

// Carregar tabela selecionada do histórico
function carregarTabelaAndamento() {
    const select = document.getElementById("seletorTabelasAndamento");
    const tabelaId = select.value;
    
    if (!tabelaId) {
        // Nova tabela - limpar formulário
        document.getElementById("infoTabelaSelecionada").style.display = "none";
        return;
    }
    
    const tabelas = obterTabelasAndamento();
    const tabela = tabelas.find(t => t.id == tabelaId);
    
    if (!tabela) {
        alert("⚠️ Tabela não encontrada!");
        return;
    }
    
    // Confirmar carregamento
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
    camposFormulario.forEach(id => {
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
    
    mostrarInfoTabelaSelecionada(tabela);
    
    // Rolar para o campo de término
    document.getElementById("termino").scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById("termino").focus();
    
    alert(`✅ Tabela "${tabela.prefixo}" carregada!\n\nAgora preencha o Término e gere o resultado.`);
}

// Excluir tabela selecionada
function excluirTabelaAndamento() {
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
    
    if (!confirm(`Excluir a tabela "${tabela.prefixo}" do histórico?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    const novasTabelas = tabelas.filter(t => t.id != tabelaId);
    salvarTabelasAndamento(novasTabelas);
    atualizarSeletorTabelas();
    
    document.getElementById("infoTabelaSelecionada").style.display = "none";
    
    alert(`✅ Tabela "${tabela.prefixo}" excluída do histórico!`);
}

function salvarDadosFormulario() {
    const dados = {};
    
    // Salvar campos simples
    camposFormulario.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            dados[id] = elemento.value;
        }
    });
    
    // Salvar impactos
    dados.impactos = [];
    document.querySelectorAll(".impacto-row").forEach(row => {
        dados.impactos.push({
            desc: row.querySelector(".impacto-desc")?.value || "",
            tempo: row.querySelector(".impacto-tempo")?.value || "",
            hora_inicio: row.querySelector(".impacto-hora-inicio")?.value || "",
            hora_fim: row.querySelector(".impacto-hora-fim")?.value || "",
            tipo_atendimento: row.querySelector(".impacto-tipo-atendimento")?.value || "",
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
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function restaurarDadosFormulario() {
    const dadosSalvos = sessionStorage.getItem(STORAGE_KEY);
    if (!dadosSalvos) return;
    
    const dados = JSON.parse(dadosSalvos);
    
    // Restaurar campos simples
    camposFormulario.forEach(id => {
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
                if (lastRow.querySelector(".impacto-tempo")) lastRow.querySelector(".impacto-tempo").value = imp.tempo;
                if (lastRow.querySelector(".impacto-hora-inicio")) lastRow.querySelector(".impacto-hora-inicio").value = imp.hora_inicio;
                if (lastRow.querySelector(".impacto-hora-fim")) lastRow.querySelector(".impacto-hora-fim").value = imp.hora_fim;
                if (lastRow.querySelector(".impacto-tipo-atendimento")) lastRow.querySelector(".impacto-tipo-atendimento").value = imp.tipo_atendimento;
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

function limparDadosSalvos() {
    sessionStorage.removeItem(STORAGE_KEY);
}

// Adicionar listener após carregar a página
document.addEventListener("DOMContentLoaded", function() {
    const assumiuFalha = document.getElementById("assumiu_em_falha");
    if (assumiuFalha) {
        assumiuFalha.addEventListener("change", controleFalhaAssumida);
    }
    
    // Inicializar equipamentos e controles
    atualizarEquipamentos();
    controleProduto();
    
    // Carregar histórico de tabelas em andamento
    atualizarSeletorTabelas();
    
    // Restaurar dados salvos
    restaurarDadosFormulario();
    
    // Salvar dados automaticamente quando qualquer campo mudar
    document.addEventListener("input", salvarDadosFormulario);
    document.addEventListener("change", salvarDadosFormulario);
});

/* ===== MUDANÇA DE FLUXO (DINÂMICO) ===== */
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

/* ===== MATERIAIS CARVÃO (DINÂMICO) ===== */
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
        <input type="text" class="carvao-patio" placeholder="Ex: Pátio 0">
        
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

/* ===== FORMATAR TEMPO EM HORAS E MINUTOS ===== */
function formatarTempo(minutos) {
    if (minutos >= 60) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${minutos} min`;
}

/* ===== IMPACTOS DINÂMICOS (H + MIN) ===== */
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

    // Aplicar capitalização inteligente nos campos de descrição e ação
    const descInput = row.querySelector(".impacto-desc");
    const acaoInput = row.querySelector(".impacto-acao");
    aplicarCapitalizacaoImpacto(descInput);
    aplicarCapitalizacaoImpacto(acaoInput);

    container.appendChild(row);
}
function calcular() {

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
        // Aplicar capitalização de frases na descrição e ação
        impactosDesc.push(capitalizarFrases(row.querySelector(".impacto-desc")?.value || ""));
        impactosHoraInicio.push(row.querySelector(".impacto-hora-inicio")?.value || "");
        impactosHoraFim.push(row.querySelector(".impacto-hora-fim")?.value || "");
        
        // Coletar checkboxes de atendimento marcados
        const atendimentos = [];
        if (row.querySelector(".impacto-atend-mecanica")?.checked) atendimentos.push("MECANICA");
        if (row.querySelector(".impacto-atend-eletrica")?.checked) atendimentos.push("ELETRICA");
        if (row.querySelector(".impacto-atend-operacional")?.checked) atendimentos.push("OPERACIONAL");
        if (row.querySelector(".impacto-atend-outro")?.checked) atendimentos.push("OUTRO");
        impactosTipoAtendimento.push(atendimentos.join(" / "));
        
        // Aplicar capitalização de frases na ação
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

        // campos maquinista
        maquinista: toUpperSafe(document.getElementById("maquinista")?.value) || "",
        loc1: toUpperSafe(document.getElementById("loc1")?.value) || "",
        loc2: toUpperSafe(document.getElementById("loc2")?.value) || "",
        horas_maquinista: document.getElementById("horas_maquinista")?.value || "",
        ponto_b: document.getElementById("ponto_b")?.value || "",
        sinal: document.getElementById("sinal")?.value || "",
        tabela_posicionada: document.getElementById("tabela_posicionada")?.value || "",

        // campos passagem de turno
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

        // mudança de fluxo
        houve_mudanca_fluxo: document.getElementById("houve_mudanca_fluxo")?.value || "NAO",
        mudancas_fluxo: mudancasFluxo,

        // campos específicos minério
        equipamento: document.getElementById("equipamento")?.value || "",
        tipo_material: toUpperSafe(document.getElementById("tipo_material")?.value) || "",
        destino: document.getElementById("destino")?.value || "",
        patio: toUpperSafe(document.getElementById("patio_nome")?.value) || "",
        baliza: toUpperSafe(document.getElementById("baliza")?.value) || "",

        // tabela partida (minério)
        tipo_divisao: document.getElementById("tipo_divisao")?.value || "PATIO_BORDO",
        vagoes_patio: document.getElementById("vagoes_patio")?.value || "",
        patio_partida: toUpperSafe(document.getElementById("patio_partida")?.value) || "",
        baliza_partida: toUpperSafe(document.getElementById("baliza_partida")?.value) || "",
        maquina_patio1: toUpperSafe(document.getElementById("maquina_patio1")?.value) || "",
        hora_inicio_patio: document.getElementById("hora_inicio_patio")?.value || "",
        hora_fim_patio: document.getElementById("hora_fim_patio")?.value || "",
        // bordo (para pátio+bordo)
        vagoes_bordo: document.getElementById("vagoes_bordo")?.value || "",
        hora_inicio_bordo: document.getElementById("hora_inicio_bordo")?.value || "",
        hora_fim_bordo: document.getElementById("hora_fim_bordo")?.value || "",
        // segundo pátio (para pátio+pátio)
        vagoes_patio2: document.getElementById("vagoes_patio2")?.value || "",
        patio_partida2: toUpperSafe(document.getElementById("patio_partida2")?.value) || "",
        baliza_partida2: toUpperSafe(document.getElementById("baliza_partida2")?.value) || "",
        maquina_patio2: toUpperSafe(document.getElementById("maquina_patio2")?.value) || "",
        hora_inicio_patio2: document.getElementById("hora_inicio_patio2")?.value || "",
        hora_fim_patio2: document.getElementById("hora_fim_patio2")?.value || "",

        // campos específicos carvão
        equipamento_carvao: document.getElementById("equipamento_carvao")?.value || "",
        recuperadora_carvao: document.getElementById("recuperadora_carvao")?.value || "",
        primeiro_vagao: toUpperSafe(document.getElementById("primeiro_vagao")?.value) || "",
        materiais_carvao: materiaisCarvao
    };

    fetch("/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        const resultado = document.getElementById("resultado");
        resultado.style.display = "block";
        
        if (dados.produto === "Carvão") {
            resultado.innerHTML = gerarResultadoCarvao(dados, data);
        } else {
            resultado.innerHTML = gerarResultadoMinerio(dados, data);
        }
    });
}

/* ===== GERAR RESULTADO MINÉRIO ===== */
function gerarResultadoMinerio(dados, data) {
    let destinoTexto = "";
    if (dados.destino === "PATIO") destinoTexto = `Pátio ${dados.patio} | Baliza ${dados.baliza}`;
    if (dados.destino === "BORDO") destinoTexto = "Trem de Bordo";
    if (dados.destino === "PARTIDA") destinoTexto = "Tabela Partida (Pátio + Bordo)";

    let impactosHTML = gerarImpactosHTML(dados);
    let passagemHTML = gerarPassagemHTML(dados);
    let mudancaFluxoHTML = gerarMudancaFluxoHTML(dados);

    // Formatar data para DD/MM/AAAA
    let dataFormatada = "—";
    if (dados.data) {
        const [ano, mes, dia] = dados.data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }

    // Tabela partida
    let tabelaPartidaHTML = "";
    if (dados.destino === "PARTIDA") {
        if (dados.tipo_divisao === "PATIO_PATIO") {
            // Pátio + Pátio
            tabelaPartidaHTML = `
<strong>📊 TABELA DIVIDIDA (PÁTIO + PÁTIO):</strong><br>
<strong>1º Pátio:</strong> ${dados.patio_partida} | Baliza: ${dados.baliza_partida} | ${dados.maquina_patio1 || "—"}<br>
Vagões: ${dados.vagoes_patio || "—"} (${dados.hora_inicio_patio || "—"} → ${dados.hora_fim_patio || "—"})<br><br>
<strong>2º Pátio:</strong> ${dados.patio_partida2} | Baliza: ${dados.baliza_partida2} | ${dados.maquina_patio2 || "—"}<br>
Vagões: ${dados.vagoes_patio2 || "—"} (${dados.hora_inicio_patio2 || "—"} → ${dados.hora_fim_patio2 || "—"})<br>
<br>`;
        } else {
            // Pátio + Bordo
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

/* ===== GERAR RESULTADO CARVÃO ===== */
function gerarResultadoCarvao(dados, data) {
    let impactosHTML = gerarImpactosHTML(dados);
    let passagemHTML = gerarPassagemHTML(dados);
    let mudancaFluxoHTML = gerarMudancaFluxoHTML(dados);

    // Formatar data para DD/MM/AAAA
    let dataFormatada = "—";
    if (dados.data) {
        const [ano, mes, dia] = dados.data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }

    // Gerar HTML dos materiais do carvão
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

/* ===== FUNÇÕES AUXILIARES DE HTML ===== */
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

/* ===== GERAR PDF ===== */
function gerarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Remover emojis e caracteres especiais para o PDF
    let texto = document.getElementById("resultado").innerText;
    
    // Remove completamente os textos entre colchetes e emojis
    texto = texto
        .replace(/\[DATA\]\s*/g, "")
        .replace(/\[TURNO\]\s*/g, "")
        .replace(/\[TREM\]\s*/g, "")
        .replace(/📅/g, "")
        .replace(/🕒/g, "")
        .replace(/🚆/g, "")
        .replace(/👷/g, "")
        .replace(/👨‍✈️/g, "")
        .replace(/🚂/g, "")
        .replace(/🕐/g, "")
        .replace(/📍/g, "")
        .replace(/🚦/g, "")
        .replace(/📋/g, "")
        .replace(/⚙️/g, "")
        .replace(/📦/g, "")
        .replace(/🕚/g, "")
        .replace(/⏱/g, "")
        .replace(/⛔/g, "")
        .replace(/✅/g, "")
        .replace(/⚖️/g, "")
        .replace(/📈/g, "")
        .replace(/🔄/g, "")
        .replace(/⚠️/g, "")
        .replace(/•/g, "-")
        .replace(/→/g, "->")
        .replace(/—/g, "-")
        .replace(/[^\x00-\x7F\u00C0-\u00FF\n]/g, "");

    const linhas = texto.split("\n");
    
    let y = 20;
    const margemEsquerda = 15;
    const larguraPagina = 180;

    // Título centralizado e em negrito
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATORIO OPERACIONAL", doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
    y += 12;

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(margemEsquerda, y, margemEsquerda + larguraPagina, y);
    y += 8;

    doc.setFontSize(10);

    linhas.forEach(linha => {
        // Pular linha vazia
        if (linha.trim() === "") {
            y += 4;
            return;
        }

        if (y > 280) {
            doc.addPage();
            y = 20;
        }

        // Verificar se é linha de impacto (começa com -)
        if (linha.trim().startsWith("-") && linha.includes("Acao:")) {
            // Separar a parte do impacto da ação
            const partes = linha.split("- Acao:");
            const impactoParte = partes[0].trim();
            const acaoParte = partes[1] ? partes[1].trim() : "";
            
            // Primeira linha: impacto sem a ação
            doc.setFont("helvetica", "normal");
            const linhasImpacto = doc.splitTextToSize(impactoParte, larguraPagina);
            linhasImpacto.forEach(li => {
                if (y > 280) { doc.addPage(); y = 20; }
                doc.text(li, margemEsquerda, y);
                y += 5;
            });
            
            // Segunda linha: Ação com indentação
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

        // Verificar se a linha tem subtítulo (texto antes de dois pontos)
        const match = linha.match(/^([^:]+):(.*)/);
        if (match) {
            const subtitulo = match[1].trim();
            const valor = match[2].trim();
            
            // Subtítulo em negrito
            doc.setFont("helvetica", "bold");
            const subtituloText = subtitulo + ": ";
            const subtituloWidth = doc.getTextWidth(subtituloText);
            
            // Verificar se cabe na linha
            const valorWidth = doc.getTextWidth(valor);
            const espacoDisponivel = larguraPagina - subtituloWidth;
            
            if (valorWidth > espacoDisponivel) {
                // Quebrar valor em múltiplas linhas
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
            // Linha normal sem dois pontos - sempre alinhar à esquerda
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

/* ===== COPIAR WHATSAPP (COM FALLBACK HTTP) ===== */
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

/* ===== ENVIAR EMAIL ===== */
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
    
    // Pegar dados para o assunto
    const data = document.getElementById("data").value || "";
    const turno = document.getElementById("turno").value || "";
    const prefixo = document.getElementById("prefixo").value || "";
    const produto = document.getElementById("produto").value || "";
    
    // Formatar data para o assunto
    let dataFormatada = "";
    if (data) {
        const [ano, mes, dia] = data.split("-");
        dataFormatada = `${dia}/${mes}/${ano}`;
    }
    
    const assunto = `Relatório Operacional - ${prefixo} - ${produto} - ${turno} - ${dataFormatada}`;
    
    // Pegar texto sem emojis problemáticos para email
    let corpo = resultado.innerText;
    
    // Codificar para URL
    const mailtoLink = `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    
    // Abrir cliente de email
    window.location.href = mailtoLink;
}

/* ===== DARK MODE ===== */
function toggleDarkMode() {
    document.documentElement.classList.toggle("dark-mode");
}

/* ===== LIMPAR FORMULÁRIO ===== */
function limparFormulario() {
    if (!confirm("⚠️ Tem certeza que deseja limpar todos os dados?")) {
        return;
    }
    
    // Limpar dados salvos
    limparDadosSalvos();
    
    // Recarregar página
    window.location.reload();
}
