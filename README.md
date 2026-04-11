# Sistema de Registro Operacional - Virador de Vagoes

Aplicacao web interna para registro de operacoes portuarias, com tabelas em andamento, finalizacao, relatorios e compartilhamento entre usuarios pela mesma instancia do servidor.

## Objetivo

Este sistema permite que operadores de turno:

- iniciem e atualizem tabelas operacionais em tempo real;
- assumam tabelas de outros turnos;
- finalizem tabelas com calculos automaticos;
- consultem tabelas finalizadas;
- compartilhem os dados com outros usuarios conectados.

## Funcionalidades Principais

### 1) Salvamento automatico

- **Persistencia local**: os dados do formulario sao salvos automaticamente no navegador.
- **Persistencia no servidor**: ao salvar inicio/finalizar, os dados ficam no banco e visiveis aos demais usuarios.
- **Protecao contra perda**: recarregar a pagina nao elimina o preenchimento local.

### 2) Tabelas compartilhadas

- Tabelas em andamento visiveis para todos os usuarios.
- Tabelas finalizadas armazenadas e consultaveis.
- Fluxo de colaboracao entre turnos.

### 3) Calculos operacionais

- TMD/TMC
- impactos
- hora efetiva
- taxa efetiva
- geracao de relatorio textual e PDF

## Tecnologias

- Backend: Flask
- Banco de dados: SQLite
- Relatorios: ReportLab (PDF)
- Frontend: HTML, CSS, JavaScript (vanilla)
- Servidor de producao: Gunicorn
- Hospedagem: Render

## Estrutura do Projeto

```text
app.py                 # Backend Flask e APIs
requirements.txt       # Dependencias Python
Procfile               # Comando de inicializacao (deploy)
render.yaml            # Configuracao de deploy no Render
start.sh               # Comando alternativo de inicializacao

templates/
  index.html           # Estrutura da interface

static/
  style.css            # Estilos da interface
  script.js            # Logica frontend e integracao com APIs

reports/               # Relatorios gerados (runtime)
tabelas.db             # Banco SQLite local (runtime)
```

## Endpoints Principais

### Tabelas em andamento

- `GET /api/tabelas/andamento`
- `POST /api/tabelas/andamento`
- `GET /api/tabelas/andamento/<id>`
- `DELETE /api/tabelas/andamento/<id>`

### Tabelas finalizadas

- `POST /api/tabelas/finalizar/<id>`
- `GET /api/tabelas/finalizadas`
- `DELETE /api/tabelas/finalizadas/<id>`

### Calculo

- `POST /calcular`

## Como Rodar Localmente (Windows)

### 1. Criar/ativar ambiente virtual

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Instalar dependencias

```powershell
pip install -r requirements.txt
```

### 3. Executar

```powershell
python app.py
```

Aplicacao disponivel em:

- `http://127.0.0.1:5000`

## Deploy no Render

Comando de inicio:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

Configuracao recomendada de disco persistente em `render.yaml` para preservar `tabelas.db` entre deploys.

## Regras Importantes de Dados

- O banco `tabelas.db` e local ao servidor da aplicacao.
- Para todos os usuarios verem os mesmos dados, todos devem acessar a mesma instancia.
- Banco local e relatorios gerados nao devem ser versionados no Git.

## Seguranca e Versionamento

O `.gitignore` evita commit de:

- segredos (`.env`, chaves e certificados);
- ambiente virtual e caches;
- banco local SQLite e arquivos temporarios;
- relatorios gerados em runtime;
- relatorios de manutencao interna.

## Relatorios de Manutencao (Ocultos no Git)

Para manter a manutencao interna organizada sem expor dados operacionais no repositorio, os relatorios de manutencao sao ignorados pelo Git.

Padroes ignorados:

- `reports/manutencao/`
- `reports/maintenance/`
- `maintenance_reports/`
- arquivos com `manutencao` ou `maintenance` no nome (`.pdf` e `.txt`)

Recomendacao de uso:

1. Salvar relatorios tecnicos internos em uma das pastas acima.
2. Nao versionar relatorios com dados operacionais sensiveis.
3. Versionar apenas codigo e documentacao funcional.

## Manutencao (Guia Rapido)

### Onde ajustar regras de negocio

- Backend/API: `app.py`
- Fluxo de UI e autosave: `static/script.js`
- Tema/layout responsivo: `static/style.css`
- Estrutura da tela: `templates/index.html`

### Fluxo recomendado para evolucao

1. Criar branch de feature.
2. Alterar codigo com foco em um fluxo por vez.
3. Testar manualmente:
   - criar/editar tabela;
   - carregar tabela em andamento;
   - finalizar tabela;
   - verificar lista de finalizadas.
4. Revisar se nenhum arquivo sensivel entrou no commit.
5. Abrir PR com cenarios testados.

### Checklist antes de commit

- [ ] Aplicacao abre sem erro
- [ ] Salvamento automatico funcionando
- [ ] Tabelas em andamento atualizam para outros usuarios
- [ ] Finalizacao move para lista de finalizadas
- [ ] Sem arquivos sensiveis no `git status`

## Suporte

Se houver comportamento inesperado:

1. validar se todos os usuarios estao no mesmo servidor;
2. verificar logs do backend;
3. confirmar permissao de escrita no diretorio do banco;
4. revisar mudancas recentes em `app.py` e `static/script.js`.
