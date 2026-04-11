from flask import Flask, render_template, request, jsonify
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import datetime, timedelta
import os
import uuid
import sqlite3
import json

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUNTIME_DIR = "/tmp" if os.environ.get("VERCEL") else BASE_DIR
REPORT_DIR = os.path.join(RUNTIME_DIR, "reports")
DATABASE = os.path.join(RUNTIME_DIR, "tabelas.db")
os.makedirs(REPORT_DIR, exist_ok=True)

# ===== BANCO DE DADOS =====
def get_db():
    """Conecta ao banco de dados SQLite"""
    conn = sqlite3.connect(DATABASE, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa o banco de dados com as tabelas necessárias"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    
    # Tabela para registros em andamento (iniciados)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tabelas_andamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prefixo TEXT NOT NULL,
            data TEXT,
            turno TEXT,
            produto TEXT,
            operador TEXT,
            inicio TEXT,
            salvo_em TEXT,
            dados TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabela para registros finalizados
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tabelas_finalizadas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prefixo TEXT NOT NULL,
            data TEXT,
            turno TEXT,
            produto TEXT,
            operador TEXT,
            inicio TEXT,
            termino TEXT,
            peso REAL,
            taxa_efetiva REAL,
            relatorio TEXT,
            pdf_path TEXT,
            dados TEXT,
            finalizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Inicializar banco ao iniciar a aplicação
init_db()

@app.route("/")
def index():
    return render_template(
        "index.html",
        turnos=["TURNO A", "TURNO B", "TURNO C", "TURNO D"],
        equipamentos=["VV1", "VV2", "VV3", "ECV"],
        produtos=["Minério", "Carvão"]
    )

# ===== APIs PARA TABELAS COMPARTILHADAS =====

@app.route("/api/tabelas/andamento", methods=["GET"])
def listar_tabelas_andamento():
    """Lista todas as tabelas em andamento (iniciadas mas não finalizadas)"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, prefixo, data, turno, produto, operador, inicio, salvo_em, dados
        FROM tabelas_andamento
        ORDER BY criado_em DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    tabelas = []
    for row in rows:
        try:
            dados_row = json.loads(row["dados"]) if row["dados"] else {}
        except json.JSONDecodeError:
            dados_row = {}

        tabela = {
            "id": row["id"],
            "prefixo": row["prefixo"],
            "data": row["data"],
            "turno": row["turno"],
            "produto": row["produto"],
            "operador": row["operador"],
            "inicio": row["inicio"],
            "salvoEm": row["salvo_em"],
            "dados": dados_row
        }
        tabelas.append(tabela)
    
    return jsonify({"tabelas": tabelas})

@app.route("/api/tabelas/andamento", methods=["POST"])
def salvar_tabela_andamento():
    """Salva ou atualiza uma tabela em andamento"""
    data = request.json
    
    prefixo = data.get("prefixo", "")
    data_tabela = data.get("data", "")
    turno = data.get("turno", "")
    produto = data.get("produto", "")
    operador = data.get("operador", "")
    inicio = data.get("inicio", "")
    dados = json.dumps(data.get("dados", {}))
    salvo_em = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    if not prefixo or not data_tabela or not turno:
        return jsonify({"success": False, "error": "Prefixo, data e turno são obrigatórios."}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verificar se já existe tabela com mesmo prefixo, data e turno
    cursor.execute('''
        SELECT id FROM tabelas_andamento 
        WHERE prefixo = ? AND data = ? AND turno = ?
    ''', (prefixo, data_tabela, turno))
    
    existente = cursor.fetchone()
    
    if existente:
        # Atualizar tabela existente
        cursor.execute('''
            UPDATE tabelas_andamento 
            SET produto = ?, operador = ?, inicio = ?, salvo_em = ?, dados = ?
            WHERE id = ?
        ''', (produto, operador, inicio, salvo_em, dados, existente["id"]))
        tabela_id = existente["id"]
        atualizado = True
    else:
        # Inserir nova tabela
        cursor.execute('''
            INSERT INTO tabelas_andamento (prefixo, data, turno, produto, operador, inicio, salvo_em, dados)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (prefixo, data_tabela, turno, produto, operador, inicio, salvo_em, dados))
        tabela_id = cursor.lastrowid
        atualizado = False
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "success": True,
        "id": tabela_id,
        "atualizado": atualizado,
        "salvoEm": salvo_em
    })

@app.route("/api/tabelas/andamento/<int:tabela_id>", methods=["GET"])
def obter_tabela_andamento(tabela_id):
    """Obtém uma tabela específica em andamento"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, prefixo, data, turno, produto, operador, inicio, salvo_em, dados
        FROM tabelas_andamento WHERE id = ?
    ''', (tabela_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Tabela não encontrada"}), 404

    try:
        dados_row = json.loads(row["dados"]) if row["dados"] else {}
    except json.JSONDecodeError:
        dados_row = {}
    
    tabela = {
        "id": row["id"],
        "prefixo": row["prefixo"],
        "data": row["data"],
        "turno": row["turno"],
        "produto": row["produto"],
        "operador": row["operador"],
        "inicio": row["inicio"],
        "salvoEm": row["salvo_em"],
        "dados": dados_row
    }
    
    return jsonify(tabela)

@app.route("/api/tabelas/andamento/<int:tabela_id>", methods=["DELETE"])
def excluir_tabela_andamento(tabela_id):
    """Exclui uma tabela em andamento"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tabelas_andamento WHERE id = ?', (tabela_id,))
    deletados = cursor.rowcount
    conn.commit()
    conn.close()
    
    if deletados == 0:
        return jsonify({"error": "Tabela não encontrada"}), 404
    
    return jsonify({"success": True})

@app.route("/api/tabelas/finalizadas", methods=["GET"])
def listar_tabelas_finalizadas():
    """Lista todas as tabelas finalizadas"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, prefixo, data, turno, produto, operador, inicio, termino, 
               peso, taxa_efetiva, relatorio, pdf_path, finalizado_em
        FROM tabelas_finalizadas
        ORDER BY finalizado_em DESC
        LIMIT 50
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    tabelas = []
    for row in rows:
        tabela = {
            "id": row["id"],
            "prefixo": row["prefixo"],
            "data": row["data"],
            "turno": row["turno"],
            "produto": row["produto"],
            "operador": row["operador"],
            "inicio": row["inicio"],
            "termino": row["termino"],
            "peso": row["peso"],
            "taxaEfetiva": row["taxa_efetiva"],
            "relatorio": row["relatorio"],
            "pdfPath": row["pdf_path"],
            "finalizadoEm": row["finalizado_em"]
        }
        tabelas.append(tabela)
    
    return jsonify({"tabelas": tabelas})

@app.route("/api/tabelas/finalizar/<int:tabela_id>", methods=["POST"])
def finalizar_tabela(tabela_id):
    """Move uma tabela de andamento para finalizadas"""
    data = request.json
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Obter tabela em andamento
    cursor.execute('SELECT * FROM tabelas_andamento WHERE id = ?', (tabela_id,))
    tabela = cursor.fetchone()
    
    if not tabela:
        conn.close()
        return jsonify({"error": "Tabela não encontrada"}), 404
    
    # Dados da finalização
    termino = data.get("termino", "")
    peso = data.get("peso", 0)
    taxa_efetiva = data.get("taxa_efetiva", 0)
    relatorio = data.get("relatorio", "")
    pdf_path = data.get("pdf_path", "")
    dados = data.get("dados", "{}")
    
    # Inserir na tabela de finalizadas
    cursor.execute('''
        INSERT INTO tabelas_finalizadas 
        (prefixo, data, turno, produto, operador, inicio, termino, peso, taxa_efetiva, relatorio, pdf_path, dados)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (tabela["prefixo"], tabela["data"], tabela["turno"], tabela["produto"],
          tabela["operador"], tabela["inicio"], termino, peso, taxa_efetiva, 
          relatorio, pdf_path, json.dumps(dados)))
    
    # Remover da tabela de andamento
    cursor.execute('DELETE FROM tabelas_andamento WHERE id = ?', (tabela_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({"success": True})

@app.route("/api/tabelas/finalizadas/<int:tabela_id>", methods=["DELETE"])
def excluir_tabela_finalizada(tabela_id):
    """Exclui uma tabela finalizada"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tabelas_finalizadas WHERE id = ?', (tabela_id,))
    deletados = cursor.rowcount
    conn.commit()
    conn.close()
    
    if deletados == 0:
        return jsonify({"error": "Tabela não encontrada"}), 404
    
    return jsonify({"success": True})

def minutos_entre(inicio, termino):
    fmt = "%H:%M"
    i = datetime.strptime(inicio, fmt)
    t = datetime.strptime(termino, fmt)
    if t < i:
        t += timedelta(days=1)  # virada de dia
    return int((t - i).total_seconds() / 60)

@app.route("/calcular", methods=["POST"])
def calcular():
    data = request.json

    inicio = data.get("inicio", "")
    termino = data.get("termino", "")
    impactos = data.get("impactos", [])
    peso = float(data.get("peso") or 0)

    # Se não tem término, retorna zeros para os cálculos
    if inicio and termino:
        tmd = minutos_entre(inicio, termino)
        impactos_total = sum(impactos)
        hora_efetiva = max(tmd - impactos_total, 0)
        horas = hora_efetiva / 60 if hora_efetiva > 0 else 0
        taxa_efetiva = round(peso / horas, 2) if horas > 0 else 0
    else:
        tmd = 0
        impactos_total = sum(impactos)
        hora_efetiva = 0
        taxa_efetiva = 0

    relatorio_texto = montar_relatorio_texto(data, tmd, impactos_total, hora_efetiva, taxa_efetiva)

    pdf_path = gerar_pdf(relatorio_texto)

    return jsonify({
        "tmd": tmd,
        "impactos_total": impactos_total,
        "hora_efetiva": hora_efetiva,
        "taxa_efetiva": taxa_efetiva,
        "relatorio": relatorio_texto,
        "pdf": pdf_path
    })

def formatar_tempo(minutos):
    if minutos >= 60:
        h = minutos // 60
        m = minutos % 60
        return f"{h}h {m}min" if m > 0 else f"{h}h"
    return f"{minutos} min"

def formatar_data_br(data_str):
    if data_str:
        try:
            ano, mes, dia = data_str.split("-")
            return f"{dia}/{mes}/{ano}"
        except:
            return data_str
    return ""

def montar_relatorio_texto(d, tmd, impactos, efetiva, taxa):
    termino = d.get('termino', '')
    produto = d.get('produto', 'Minério')
    
    linhas = [
        "=" * 40,
        "RELATORIO OPERACIONAL",
        "=" * 40,
        "",
        f"DATA: {formatar_data_br(d.get('data', ''))}",
        f"TURNO: {d.get('turno', '')}",
        f"PREFIXO/TREM: {d.get('prefixo', '')}",
        f"OFERTA: {d.get('oferta', '')}",
        "",
        "-" * 40,
        "DADOS DO MAQUINISTA",
        "-" * 40,
        f"OPERADOR: {d.get('operador', '')} | MATRICULA: {d.get('matricula', '')}",
        f"MAQUINISTA: {d.get('maquinista', '')}",
        f"LOCOMOTIVAS: {d.get('loc1', '')} / {d.get('loc2', '')}",
        f"CONTATO MAQUINISTA: {d.get('horas_maquinista', '')}",
        f"PASSAGEM PONTO B: {d.get('ponto_b', '')}",
        f"PASSAGEM SINAL: {d.get('sinal', '')}",
        f"TABELA POSICIONADA: {d.get('tabela_posicionada', '')}",
        "",
    ]

    # Seção específica para carvão ou minério
    if produto == "Carvão":
        linhas.append("-" * 40)
        linhas.append("CARREGAMENTO DE CARVAO - ECV")
        linhas.append("-" * 40)
        linhas.append(f"1o VAGAO DA TABELA: {d.get('primeiro_vagao', '')}")
        linhas.append("")
        
        materiais_carvao = d.get("materiais_carvao", [])
        for i, mat in enumerate(materiais_carvao, 1):
            if mat.get("tipo_material"):
                linhas.append(f"  MATERIAL {i}:")
                linhas.append(f"    Patio: {mat.get('patio', '')} - Baliza: {mat.get('baliza', '')}")
                linhas.append(f"    Recuperadora: {mat.get('recuperadora', '')}")
                linhas.append(f"    Tipo Material: {mat.get('tipo_material', '')} ({mat.get('acao', '')})")
                linhas.append(f"    Peso ECV: {mat.get('peso_ecv', '')} t")
                linhas.append(f"    Peso {mat.get('recuperadora', '')}: {mat.get('peso_recup', '')} t")
                linhas.append(f"    Vagoes: {mat.get('vagoes', '')}")
                if mat.get('hora_inicio'):
                    linhas.append(f"    Horario: {mat.get('hora_inicio', '')} -> {mat.get('hora_fim', '')}")
                linhas.append("")
    else:
        linhas.append("-" * 40)
        linhas.append("DADOS DA OPERACAO")
        linhas.append("-" * 40)
        linhas.append(f"EQUIPAMENTO: {d.get('equipamento', '')}")
        linhas.append(f"PRODUTO: {d.get('produto', '')}")
        linhas.append(f"TIPO DE MATERIAL: {d.get('tipo_material', '')}")
        linhas.append(f"DESTINO: {d.get('destino', '')}")
        
        # Tabela partida
        if d.get('destino') == 'PARTIDA':
            tipo_div = d.get('tipo_divisao', 'PATIO_BORDO')
            linhas.append("")
            if tipo_div == 'PATIO_PATIO':
                linhas.append("  TABELA DIVIDIDA (PATIO + PATIO):")
                linhas.append(f"    1o Patio: {d.get('patio_partida', '')} | Baliza: {d.get('baliza_partida', '')} | {d.get('maquina_patio1', '')}")
                linhas.append(f"    Vagoes: {d.get('vagoes_patio', '')} ({d.get('hora_inicio_patio', '')} -> {d.get('hora_fim_patio', '')})")
                linhas.append(f"    2o Patio: {d.get('patio_partida2', '')} | Baliza: {d.get('baliza_partida2', '')} | {d.get('maquina_patio2', '')}")
                linhas.append(f"    Vagoes: {d.get('vagoes_patio2', '')} ({d.get('hora_inicio_patio2', '')} -> {d.get('hora_fim_patio2', '')})")
            else:
                linhas.append("  TABELA DIVIDIDA (PATIO + BORDO):")
                linhas.append(f"    Patio: {d.get('patio_partida', '')} | Baliza: {d.get('baliza_partida', '')} | {d.get('maquina_patio1', '')}")
                linhas.append(f"    Vagoes para Patio: {d.get('vagoes_patio', '')} ({d.get('hora_inicio_patio', '')} -> {d.get('hora_fim_patio', '')})")
                linhas.append(f"    Vagoes para Bordo: {d.get('vagoes_bordo', '')} ({d.get('hora_inicio_bordo', '')} -> {d.get('hora_fim_bordo', '')})")
        elif d.get('destino') == 'PATIO':
            linhas.append(f"PATIO: {d.get('patio', '')} | BALIZA: {d.get('baliza', '')} | MAQUINA: {d.get('maquina_patio', '')}")
        elif d.get('destino') == 'BORDO':
            passando = d.get('passando_por', '')
            if passando:
                linhas.append(f"BORDO (passando por {passando})")
            else:
                linhas.append("TREM DE BORDO")
        
        linhas.append(f"PESO: {d.get('peso', '')} t")
        linhas.append("")

    # Horários e cálculos
    linhas.append("-" * 40)
    linhas.append("HORARIOS E CALCULOS")
    linhas.append("-" * 40)
    linhas.append(f"INICIO: {d.get('inicio', '')}")
    linhas.append(f"TERMINO: {termino if termino else '-'}")
    linhas.append(f"TMD/C: {formatar_tempo(tmd) if termino else '-'}")
    linhas.append(f"TEMPO TOTAL PARADO: {formatar_tempo(impactos)}")
    linhas.append(f"HORA EFETIVA: {formatar_tempo(efetiva) if termino else '-'}")
    linhas.append(f"TAXA EFETIVA: {taxa} t/h" if termino and taxa > 0 else "TAXA EFETIVA: -")
    linhas.append("")

    # Mudanças de fluxo
    if d.get("houve_mudanca_fluxo") == "SIM":
        mudancas = d.get("mudancas_fluxo", [])
        if mudancas:
            linhas.append("-" * 40)
            linhas.append("MUDANCAS DE FLUXO")
            linhas.append("-" * 40)
            for i, fluxo in enumerate(mudancas, 1):
                if fluxo.get("hora") or fluxo.get("fluxo_anterior"):
                    linha = f"  {i}. {fluxo.get('hora', '-')}: {fluxo.get('fluxo_anterior', '')} -> {fluxo.get('fluxo_novo', '')}"
                    if fluxo.get("solicitante"):
                        linha += f" [{fluxo.get('solicitante')}]"
                    if fluxo.get("motivo"):
                        linha += f" - {fluxo.get('motivo')}"
                    linhas.append(linha)
            linhas.append("")

    # Impactos/Falhas
    linhas.append("-" * 40)
    linhas.append("IMPACTOS / FALHAS")
    linhas.append("-" * 40)

    impactos_desc = d.get("impactos_desc", [])
    impactos_hora_inicio = d.get("impactos_hora_inicio", [])
    impactos_hora_fim = d.get("impactos_hora_fim", [])
    impactos_tipo_atendimento = d.get("impactos_tipo_atendimento", [])
    impactos_acao = d.get("impactos_acao", [])
    
    for i, tempo in enumerate(d.get("impactos", []), 1):
        if tempo > 0:
            desc = impactos_desc[i-1] if i-1 < len(impactos_desc) else ""
            hora_inicio = impactos_hora_inicio[i-1] if i-1 < len(impactos_hora_inicio) else ""
            hora_fim = impactos_hora_fim[i-1] if i-1 < len(impactos_hora_fim) else ""
            tipo_atend = impactos_tipo_atendimento[i-1] if i-1 < len(impactos_tipo_atendimento) else ""
            acao = impactos_acao[i-1] if i-1 < len(impactos_acao) else ""
            horarios = f" ({hora_inicio} -> {hora_fim})" if hora_inicio else ""
            tipo_texto = f" [{tipo_atend}]" if tipo_atend else ""
            acao_texto = f" | Acao: {acao}" if acao else ""
            linhas.append(f"  {i}. {desc}{tipo_texto} - {formatar_tempo(tempo)}{horarios}{acao_texto}")

    # Recebimento de tabela de outro turno
    if d.get("recebeu_de_outro_turno"):
        linhas.append("")
        linhas.append("-" * 40)
        linhas.append("RECEBIMENTO DE TABELA (OUTRO TURNO)")
        linhas.append("-" * 40)
        linhas.append(f"  Turno que passou: {d.get('turno_passou_tabela', '')}")
        linhas.append(f"  Operador que passou: {d.get('operador_passou_tabela', '')} | Mat: {d.get('matricula_passou_tabela', '')}")
        linhas.append(f"  Hora que assumiu: {d.get('hora_assumiu_tabela', '')}")
        linhas.append(f"  Vagoes faltando ao assumir: {d.get('vagoes_faltavam_assumir', '')}")
        
        if d.get("recebeu_em_falha") == "SIM":
            linhas.append("")
            linhas.append("  ** RECEBEU EM FALHA **")
            linhas.append(f"  Falha: {d.get('falha_recebida_desc', '')}")
            linhas.append(f"  Hora inicio falha: {d.get('hora_inicio_falha_recebida', '')}")
            
            tempo_h = d.get('tempo_parado_h', '') or '0'
            tempo_m = d.get('tempo_parado_m', '') or '0'
            linhas.append(f"  Tempo ja parado ao assumir: {tempo_h}h {tempo_m}min")
            
            # Tipo de atendimento
            atendimentos = []
            if d.get('falha_recebida_mecanica'): atendimentos.append("MECANICA")
            if d.get('falha_recebida_eletrica'): atendimentos.append("ELETRICA")
            if d.get('falha_recebida_operacional'): atendimentos.append("OPERACIONAL")
            if d.get('falha_recebida_outro'): atendimentos.append("OUTRO")
            if atendimentos:
                linhas.append(f"  Tipo atendimento: {' / '.join(atendimentos)}")
            
            if d.get('acao_falha_recebida'):
                linhas.append(f"  Acao em andamento: {d.get('acao_falha_recebida', '')}")

    # Passagem de turno
    if d.get("houve_passagem") == "SIM":
        linhas.append("")
        linhas.append("-" * 40)
        linhas.append("PASSAGEM DE TURNO (SAINDO)")
        linhas.append("-" * 40)
        linhas.append(f"  Hora da rendicao: {d.get('hora_rendicao', '')}")
        linhas.append(f"  Vagoes descarregados no meu turno: {d.get('vagoes_meu_turno', '')}")
        linhas.append(f"  Vagoes restantes p/ proximo turno: {d.get('vagoes_proximo_turno', '')}")
        linhas.append(f"  Turno que assumiu: {d.get('turno_assumiu', '')}")
        linhas.append(f"  Operador que assumiu: {d.get('operador_assumiu', '')} | Mat: {d.get('matricula_assumiu', '')}")
        if d.get("assumiu_em_falha") == "SIM":
            linhas.append(f"  ** PASSOU EM FALHA: {d.get('descricao_falha_assumida', '')} (as {d.get('hora_falha_passagem', '')}) **")

    linhas.append("")
    linhas.append("-" * 40)
    linhas.append("OBSERVACOES")
    linhas.append("-" * 40)
    linhas.append(d.get("observacoes", ""))
    linhas.append("")
    linhas.append("=" * 40)

    return "\n".join(linhas)

def gerar_pdf(texto):
    nome = f"relatorio_{uuid.uuid4().hex}.pdf"
    caminho = os.path.join(REPORT_DIR, nome)

    c = canvas.Canvas(caminho, pagesize=A4)
    c.setFont("Helvetica", 10)

    x, y = 2 * cm, 28 * cm
    for linha in texto.split("\n"):
        if y < 2 * cm:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = 28 * cm
        c.drawString(x, y, linha)
        y -= 14

    c.save()
    return caminho

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
