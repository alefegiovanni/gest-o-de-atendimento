# Gestão de Atendimento - Consórcios

Aplicação web completa, responsiva e em português do Brasil desenvolvida para gestão de produtividade e acompanhamento de equipes de vendas de consórcios.

---

## 🚀 Como Executar

### 1. Iniciar o servidor integrado (Frontend e Backend)
```bash
npm run start
```
O sistema estará disponível em: **`http://localhost:3001`**

Para rodar em modo de desenvolvimento com hot-reload do Vite:
```bash
# Terminal 1 - Backend API:
npm run dev:server

# Terminal 2 - Frontend Vite:
npm run dev
```

---

## 🔑 Credenciais de Demonstração (Já cadastradas e populadas)

| Perfil | Nome | Primeiro Nome (Login) | Código (6 números) |
|---|---|---|---|
| **Gerente / Administrador** | Carlos Silva | `Carlos` | `123456` |
| **Vendedora (Top)** | Ana Carolina Martins | `Ana` | `482916` |
| **Vendedor** | Bruno Henrique Souza | `Bruno` | `591823` |
| **Vendedora** | Camila Fernandes Lima | `Camila` | `736192` |
| **Vendedor (Pendente Hoje)** | Diego Rodrigo Alves | `Diego` | `849201` |
| **Vendedora (Pendente Hoje)** | Eduarda Santos Rocha | `Eduarda` | `627184` |

*Obs: A tela de login possui botões de atalho ("Acessos de Demonstração") que preenchem os dados com 1 clique.*

---

## ✨ Funcionalidades Implementadas

### 1. Autenticação & Segurança
- **Login sem e-mail**: Acesso via **Primeiro Nome** e **Código de 6 números**.
- Códigos armazenados com hash **bcrypt** (nunca texto puro).
- Detecção e resolução de nomes repetidos (apresenta seletor de nome completo).
- Opção para qualquer usuário alterar seu próprio código de 6 números.
- JWT com verificação de perfil de acesso (`gerente` vs `vendedor`).

### 2. Tela Inicial do Vendedor
- Saudação personalizada com data em formato brasileiro por extenso.
- **Status do dia destacado**: preenchido ou pendente.
- **Formulário de lançamento diário**:
  - Contatos feitos, clientes que responderam, atendimentos realizados, propostas/simulações e vendas fechadas.
  - Valor total vendido em Reais (`R$`).
  - Campo de observações do dia.
  - Validações: bloqueio de números negativos, prevenção de lançamentos duplicados na mesma data (permite atualização do registro existente).
- **Cards de resumo do mês** com cálculo de taxas de atendimento, proposta e fechamento.
- **Barras de progresso das metas mensais individuais** (vendas de cotas, valor total vendido, atendimentos).
- **Gráfico de evolução diária (Chart.js)** dos últimos 30 dias.

### 3. Painel do Gerente / Administrador
- **Filtros completos**: Período (Hoje, Esta Semana, Este Mês, Intervalo personalizado) e Vendedor (Toda a equipe ou vendedor individual).
- **Comparativo com o mês anterior** (crescimento % em vendas e volume financeiro).
- **Cards de Indicadores**:
  - Total de Contatos, Respostas, Atendimentos, Propostas, Vendas Fechadas e Valor Total Vendido.
  - Taxas médias de resposta, atendimento e fechamento.
  - Percentual atingido da meta geral da equipe.
- **Alertas automáticos do Gerente**:
  - Lista de vendedores ativos com registro pendente no dia atual.
  - Alerta de ritmo abaixo do necessário para a meta do mês.
  - Destaque para metas atingidas e superadas.
- **4 Gráficos Interativos**:
  1. Comparativo por vendedor (alternável entre Valor Vendido, Vendas, Atendimentos e Contatos).
  2. Gráfico de linha com evolução diária da equipe.
  3. Gráfico de rosca (Market Share) de participação de cada vendedor no faturamento.
  4. Comparativo de metas (Realizado vs Meta Individual).
- **Ranking da equipe**:
  - Tabela ordenável com destaque visual (medalhas e pódio) para os 3 primeiros colocados.
- **Exportação e Relatórios**:
  - Exportação direta em planilha Excel (.xlsx).
  - Impressão formatada para PDF com cabeçalho limpo.

### 4. Módulos Administrativos
- **Gestão de Equipe**: Cadastro de novos vendedores, edição de dados, ativação/inativação e redefinição de código de 6 dígitos.
- **Planejamento de Metas**: Metas mensais para toda a equipe e metas individuais por vendedor.
- **Central de Lançamentos & Auditoria**:
  - Gerente pode consultar, filtrar, editar ou excluir qualquer lançamento diário.
  - **Tabela de Auditoria**: Registra quem realizou alterações, tipo de ação, data/hora e valores anteriores/novos.
- **Meu Registro**: O gerente também pode lançar seus próprios atendimentos e vendas, caso necessário.

---

## 🗄️ Estrutura do Banco de Dados (SQLite)
- `users`: id, nome_completo, primeiro_nome, codigo_acesso_protegido, perfil, telefone, ativo, criado_em, atualizado_em.
- `daily_records`: id, user_id, data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao, criado_em, atualizado_em.
- `goals`: id, user_id (NULL para equipe), mes_referencia, meta_contatos, meta_atendimentos, meta_propostas, meta_vendas, meta_valor_vendido, criado_em, atualizado_em.
- `audit_logs`: id, usuario_responsavel_id, tipo_de_acao, entidade, entidade_id, detalhes, data_hora.

