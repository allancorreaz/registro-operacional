from flask import Flask, render_template, request, jsonify
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import datetime, timedelta
import os
import uuid

app = Flask(__name__)

REPORT_DIR = "reports"
os.makedirs(REPORT_DIR, exist_ok=True)

@app.route("/")
def index():
    return render_template(
        "index.html",
        turnos=["TURNO A", "TURNO B", "TURNO C", "TURNO D"],
        equipamentos=["VV1", "VV2", "VV3", "ECV"],
        produtos=["Minério", "Carvão"]
    )

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
            linhas.append("")
            linhas.append("  TABELA PARTIDA:")
            linhas.append(f"    Patio: {d.get('patio_partida', '')} | Baliza: {d.get('baliza_partida', '')}")
            linhas.append(f"    Vagoes para Patio: {d.get('vagoes_patio', '')} ({d.get('hora_inicio_patio', '')} -> {d.get('hora_fim_patio', '')})")
            linhas.append(f"    Vagoes para Bordo: {d.get('vagoes_bordo', '')} ({d.get('hora_inicio_bordo', '')} -> {d.get('hora_fim_bordo', '')})")
            if d.get('mudanca_maquina') == 'SIM':
                linhas.append(f"    Mudanca de Maquina: {d.get('maquina_inicial', '')} -> {d.get('maquina_final', '')} as {d.get('hora_mudanca_maquina', '')}")
        elif d.get('destino') == 'PATIO':
            linhas.append(f"PATIO: {d.get('patio', '')} | BALIZA: {d.get('baliza', '')}")
        
        linhas.append(f"PESO: {d.get('peso', '')} t")
        linhas.append("")

    # Horários e cálculos
    linhas.append("-" * 40)
    linhas.append("HORARIOS E CALCULOS")
    linhas.append("-" * 40)
    linhas.append(f"INICIO: {d.get('inicio', '')}")
    linhas.append(f"TERMINO: {termino if termino else '-'}")
    linhas.append(f"TMD/C: {formatar_tempo(tmd) if termino else '-'}")
    linhas.append(f"IMPACTOS TOTAIS: {formatar_tempo(impactos)}")
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

    # Passagem de turno
    if d.get("houve_passagem") == "SIM":
        linhas.append("")
        linhas.append("-" * 40)
        linhas.append("PASSAGEM DE TURNO")
        linhas.append("-" * 40)
        linhas.append(f"  Vagoes descarregados no meu turno: {d.get('vagoes_meu_turno', '')}")
        linhas.append(f"  Turno que assumiu: {d.get('turno_assumiu', '')}")
        linhas.append(f"  Operador que assumiu: {d.get('operador_assumiu', '')}")
        linhas.append(f"  Vagoes restantes: {d.get('vagoes_proximo_turno', '')}")
        if d.get("assumiu_em_falha") == "SIM":
            linhas.append(f"  ** ASSUMIU EM FALHA: {d.get('descricao_falha_assumida', '')} **")

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
