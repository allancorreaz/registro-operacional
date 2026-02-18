# Sistema de Registro Operacional - Virador de Vagões

Sistema web para registro de operações portuárias com gerenciamento de tabelas em andamento e finalizadas.

## Funcionalidades Principais

### 💾 Salvamento Automático
- **Persistência Local**: Todos os dados preenchidos são salvos automaticamente no navegador usando localStorage
- **Dados preservados**: Mesmo após recarregar a página, os dados preenchidos permanecem disponíveis
- **Sem perda de dados**: Trabalhe com segurança sabendo que seu progresso está sempre salvo

### 📋 Tabelas Compartilhadas
- **Tabelas em Andamento**: Visíveis para todos os usuários através do banco de dados
- **Tabelas Finalizadas**: Permanentemente armazenadas e acessíveis
- **Colaboração**: Qualquer operador pode ver e finalizar tabelas iniciadas por outros

### ⏰ Horário Preciso
- **Horário de Brasília**: Exibição automática do horário correto (UTC-3)
- **Sincronização**: Relógio atualizado em tempo real
- **Fuso horário**: Usa a timezone America/Sao_Paulo

### 🔄 Botão "Salvar Início"
- **Compartilhamento**: Salva o início da operação no servidor para que outros usuários possam ver
- **Visibilidade inteligente**: Aparece automaticamente quando os campos obrigatórios são preenchidos
- **Feedback claro**: Mensagens informativas sobre o status do salvamento

## Requisitos

- Python 3.11+
- Flask
- Gunicorn
- ReportLab
- SQLite3 (incluído no Python)

## Instalação Local

```bash
# Instalar dependências
pip install -r requirements.txt

# Executar aplicação
python app.py
```

A aplicação estará disponível em `http://localhost:5000`

## Deployment no Render

### Configuração Automática

O projeto está configurado para deploy automático no Render usando `render.yaml`.

### Persistência de Dados

**IMPORTANTE**: O arquivo `render.yaml` inclui configuração de disco persistente para garantir que os dados do banco de dados (`tabelas.db`) não sejam perdidos entre deploys:

```yaml
disk:
  name: registro-data
  mountPath: /opt/render/project/src
  sizeGB: 1
```

Isso garante que:
- ✅ As tabelas em andamento permanecem disponíveis após redeploy
- ✅ As tabelas finalizadas são preservadas permanentemente
- ✅ O histórico de operações não é perdido

### Primeiro Deploy

1. Conecte seu repositório GitHub ao Render
2. O Render detectará automaticamente o `render.yaml`
3. O disco persistente será criado automaticamente
4. O banco de dados será inicializado na primeira execução

### Acesso às Tabelas

Todas as tabelas (em andamento e finalizadas) são acessíveis via:
- **Interface Web**: Disponível para todos os usuários através do link do aplicativo
- **API REST**: Endpoints disponíveis em `/api/tabelas/andamento` e `/api/tabelas/finalizadas`

## Estrutura do Banco de Dados

### Tabela: `tabelas_andamento`
Armazena tabelas iniciadas mas não finalizadas.

### Tabela: `tabelas_finalizadas`
Armazena tabelas completamente finalizadas com todos os dados operacionais.

## Tecnologias Utilizadas

- **Backend**: Flask (Python)
- **Banco de Dados**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **PDF Generation**: ReportLab
- **Server**: Gunicorn
- **Hosting**: Render.com

## Desenvolvedor

Criado por Allan Correa – Mecânica Corretiva Turno A  
Todos os direitos reservados

## Suporte

Para questões ou suporte, entre em contato com o desenvolvedor.
