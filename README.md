# Registro Operacional - Virador de Vagoes

Aplicacao web interna para registro operacional de descarregamento/carregamento, com suporte a tabelas em andamento, finalizacao, relatorios e sincronizacao entre usuarios via banco SQLite.

## Objetivo

Este sistema permite que operadores de turno:

- iniciem e atualizem tabelas operacionais em tempo real;
- assumam tabelas de outros turnos;
- finalizem tabelas com calculos automaticos;
- consultem tabelas finalizadas;
- compartilhem os dados com outros usuarios conectados.

## Tecnologias

- Backend: Flask
- Banco de dados: SQLite
- Relatorios: ReportLab (PDF)
- Frontend: HTML, CSS, JavaScript (vanilla)
- Servidor de producao: Gunicorn

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

## Funcionalidades Principais

### 1) Tabelas em andamento (compartilhadas)

- Criar nova tabela
- Atualizar tabela existente
- Listar tabelas em andamento para todos os usuarios
- Excluir tabela em andamento

Endpoints:

- `GET /api/tabelas/andamento`
- `POST /api/tabelas/andamento`
- `GET /api/tabelas/andamento/<id>`
- `DELETE /api/tabelas/andamento/<id>`

### 2) Tabelas finalizadas

- Finalizar tabela em andamento
- Listar ultimas finalizadas
- Excluir finalizada

Endpoints:

- `POST /api/tabelas/finalizar/<id>`
- `GET /api/tabelas/finalizadas`
- `DELETE /api/tabelas/finalizadas/<id>`

### 3) Calculo operacional

- TMD/TMC
- Impactos
- Hora efetiva
- Taxa efetiva
- Geracao de relatorio textual e PDF

Endpoint:

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

## Como Rodar em Producao

Com Gunicorn (Linux/Render):

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

## Regras Importantes de Dados

- O banco `tabelas.db` e local ao servidor que esta rodando a aplicacao.
- Para todos os usuarios verem os mesmos dados, todos devem acessar a mesma instancia do servidor.
- Arquivos de banco local e relatorios gerados nao devem ser versionados no Git.

## Seguranca e Versionamento

O `.gitignore` foi configurado para evitar commit de:

- segredos (`.env`, certificados/chaves)
- ambiente virtual (`.venv`)
- cache Python (`__pycache__`)
- banco local (`*.db`) e arquivos temporarios SQLite
- relatorios gerados em runtime (`reports/*.pdf`)
- relatorios de manutencao interna (pastas e arquivos com nome de manutencao/maintenance)

## Relatorios de Manutencao (Ocultos no Git)

Para facilitar manutencao interna sem expor arquivos operacionais no repositorio, os relatorios de manutencao estao ocultos pelo `.gitignore`.

Padroes ignorados:

- `reports/manutencao/`
- `reports/maintenance/`
- `maintenance_reports/`
- arquivos com `manutencao` ou `maintenance` no nome (`.pdf` e `.txt`)

Recomendacao de uso:

1. Salvar relatorios tecnicos internos em uma das pastas acima.
2. Nao versionar relatorios com dados operacionais sensiveis.
3. Versionar apenas codigo e documentacao funcional (como este README).

## Manutencao (Guia Rapido)

### Onde ajustar regras de negocio

- Backend/API: `app.py`
- Fluxo de UI e salvamento automatico: `static/script.js`
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
5. Abrir PR com descricao dos cenarios testados.

### Checklist antes de commit

- [ ] Aplicacao abre sem erro
- [ ] Salvamento automatico funcionando
- [ ] Tabelas em andamento atualizam para outros usuarios
- [ ] Finalizacao move para lista de finalizadas
- [ ] Sem arquivos sensiveis no `git status`

## Possiveis Melhorias Futuras

- Migrar de SQLite para PostgreSQL em ambiente multi-instancia
- Autenticacao de usuarios
- Auditoria por usuario/turno
- Testes automatizados (API e frontend)
- Exportacao de indicadores em dashboard

## Suporte

Se houver comportamento inesperado:

1. Validar se todos os usuarios estao no mesmo servidor;
2. Verificar logs de erro do backend;
3. Confirmar permissao de escrita no diretorio do banco;
4. Revisar mudancas recentes em `app.py` e `static/script.js`.
