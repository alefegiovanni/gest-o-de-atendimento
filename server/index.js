const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gestao-consorcio-super-segredo-2026';

app.use(cors());
app.use(express.json());

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token de autenticação não fornecido.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
    req.user = user;
    next();
  });
}

function requireManager(req, res, next) {
  if (req.user.perfil !== 'gerente') {
    return res.status(403).json({ error: 'Acesso restrito ao perfil de Gerente/Administrador.' });
  }
  next();
}

function logAudit(userId, tipoAcao, entidade, entidadeId, detalhes) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (usuario_responsavel_id, tipo_de_acao, entidade, entidade_id, detalhes)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, tipoAcao, entidade, entidadeId, typeof detalhes === 'object' ? JSON.stringify(detalhes) : String(detalhes));
  } catch (err) {
    console.error('Erro ao salvar log de auditoria:', err);
  }
}

// ---------------- AUTH ROUTES ----------------

// 1. Login por Primeiro Nome e Código de 6 números
// Se houver ambiguidade no primeiro nome, o sistema avisa ou aceita nome_completo / id
app.post('/api/auth/login', (req, res) => {
  const { primeiro_nome, codigo_acesso, nome_completo, user_id } = req.body;

  if (!codigo_acesso || (!primeiro_nome && !nome_completo && !user_id)) {
    return res.status(400).json({ error: 'Informe seu primeiro nome e o código de 6 números.' });
  }

  let users = [];
  if (user_id) {
    users = db.prepare('SELECT * FROM users WHERE id = ? AND ativo = 1').all(user_id);
  } else if (nome_completo) {
    users = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM(?)) AND ativo = 1').all(nome_completo);
  } else {
    users = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(primeiro_nome)) = LOWER(TRIM(?)) AND ativo = 1').all(primeiro_nome);
  }

  if (users.length === 0) {
    return res.status(401).json({ error: 'Usuário não encontrado ou inativo. Verifique os dados digitados.' });
  }

  // Se houver mais de um usuário com o mesmo primeiro nome, solicita desambiguação
  if (users.length > 1 && !user_id && !nome_completo) {
    const options = users.map(u => ({
      id: u.id,
      nome_completo: u.nome_completo,
      primeiro_nome: u.primeiro_nome
    }));
    return res.status(300).json({
      ambiguous: true,
      message: 'Existe mais de um colaborador com este primeiro nome. Por favor, selecione seu nome completo.',
      options
    });
  }

  const user = users[0];
  const validCode = bcrypt.compareSync(codigo_acesso.toString().trim(), user.codigo_acesso_protegido);

  if (!validCode) {
    return res.status(401).json({ error: 'Código de acesso incorreto. Tente novamente.' });
  }

  const token = jwt.sign(
    { id: user.id, nome_completo: user.nome_completo, primeiro_nome: user.primeiro_nome, perfil: user.perfil },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      nome_completo: user.nome_completo,
      primeiro_nome: user.primeiro_nome,
      perfil: user.perfil,
      telefone: user.telefone
    }
  });
});

// 2. Obter perfil autenticado atual
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, nome_completo, primeiro_nome, perfil, telefone, ativo, criado_em FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ user });
});

// 3. Alterar o próprio código de acesso
app.post('/api/auth/change-code', authenticateToken, (req, res) => {
  const { codigo_atual, novo_codigo } = req.body;

  if (!codigo_atual || !novo_codigo) {
    return res.status(400).json({ error: 'Código atual e novo código são obrigatórios.' });
  }

  if (!/^\d{6}$/.test(String(novo_codigo))) {
    return res.status(400).json({ error: 'O novo código precisa ter exatamente 6 números.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const valid = bcrypt.compareSync(String(codigo_atual).trim(), user.codigo_acesso_protegido);

  if (!valid) {
    return res.status(401).json({ error: 'Código atual informado está incorreto.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(String(novo_codigo).trim(), salt);

  db.prepare('UPDATE users SET codigo_acesso_protegido = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
  logAudit(req.user.id, 'ALTERACAO_SENHA', 'users', req.user.id, 'O próprio usuário alterou seu código de 6 dígitos.');

  res.json({ message: 'Código de acesso alterado com sucesso!' });
});

// 4. Alterar dados do perfil próprio (ex: nome do gerente)
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { nome_completo, primeiro_nome } = req.body;

  if (!nome_completo || !primeiro_nome) {
    return res.status(400).json({ error: 'Nome completo e primeiro nome são obrigatórios.' });
  }

  db.prepare(`
    UPDATE users 
    SET nome_completo = ?, primeiro_nome = ?, atualizado_em = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(nome_completo.trim(), primeiro_nome.trim(), req.user.id);

  logAudit(req.user.id, 'EDICAO_PERFIL', 'users', req.user.id, { nome_completo, primeiro_nome });

  const updatedUser = db.prepare('SELECT id, nome_completo, primeiro_nome, perfil, telefone, ativo FROM users WHERE id = ?').get(req.user.id);

  res.json({
    message: 'Nome atualizado com sucesso!',
    user: updatedUser
  });
});

// ---------------- ROTAS DO VENDEDOR ----------------

// Status e registro do dia do vendedor autenticado
app.get('/api/seller/today-status', authenticateToken, (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const record = db.prepare('SELECT * FROM daily_records WHERE user_id = ? AND data = ?').get(req.user.id, todayStr);
  
  res.json({
    data_atual: todayStr,
    preenchido: !!record,
    registro: record || null
  });
});

// Resumo do mês e histórico para o vendedor logado
app.get('/api/seller/my-dashboard', authenticateToken, (req, res) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const userId = req.user.id;

  // Totais do mês
  const monthlyTotals = db.prepare(`
    SELECT 
      COALESCE(SUM(contatos), 0) as total_contatos,
      COALESCE(SUM(respostas), 0) as total_respostas,
      COALESCE(SUM(atendimentos), 0) as total_atendimentos,
      COALESCE(SUM(propostas), 0) as total_propostas,
      COALESCE(SUM(vendas), 0) as total_vendas,
      COALESCE(SUM(valor_vendido), 0) as total_valor_vendido,
      COUNT(*) as dias_com_registro
    FROM daily_records 
    WHERE user_id = ? AND data LIKE ?
  `).get(userId, `${currentMonth}%`);

  // Metas do mês para o vendedor
  const goal = db.prepare(`
    SELECT * FROM goals WHERE user_id = ? AND mes_referencia = ?
  `).get(userId, currentMonth) || {
    meta_contatos: 0,
    meta_atendimentos: 0,
    meta_propostas: 0,
    meta_vendas: 0,
    meta_valor_vendido: 0
  };

  // Histórico diário dos últimos 30 dias para o gráfico
  const dailyHistory = db.prepare(`
    SELECT data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao, id
    FROM daily_records 
    WHERE user_id = ? 
    ORDER BY data ASC
  `).all(userId);

  // Status de hoje
  const todayStr = now.toISOString().split('T')[0];
  const todayRecord = dailyHistory.find(r => r.data === todayStr) || null;

  res.json({
    mes_referencia: currentMonth,
    hoje: todayStr,
    hoje_preenchido: !!todayRecord,
    registro_hoje: todayRecord,
    totais_mes: monthlyTotals,
    metas: goal,
    historico_diario: dailyHistory
  });
});

// Salvar ou atualizar registro diário (vendedor ou gerente)
app.post('/api/records', authenticateToken, (req, res) => {
  const { data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao, user_id } = req.body;

  // Vendedor só pode salvar para si próprio. Gerente pode salvar para si ou para outro.
  let targetUserId = req.user.id;
  if (req.user.perfil === 'gerente' && user_id) {
    targetUserId = Number(user_id);
  }

  if (!data) {
    return res.status(400).json({ error: 'A data do registro é obrigatória.' });
  }

  // Validação de números positivos ou zero
  const c = Math.max(0, parseInt(contatos, 10) || 0);
  const r = Math.max(0, parseInt(respostas, 10) || 0);
  const a = Math.max(0, parseInt(atendimentos, 10) || 0);
  const p = Math.max(0, parseInt(propostas, 10) || 0);
  const v = Math.max(0, parseInt(vendas, 10) || 0);
  const val = Math.max(0, parseFloat(valor_vendido) || 0);
  const obs = observacao ? String(observacao).trim() : null;

  // Verifica se já existe registro nesta data para este vendedor
  const existing = db.prepare('SELECT * FROM daily_records WHERE user_id = ? AND data = ?').get(targetUserId, data);

  if (existing) {
    // Atualização
    db.prepare(`
      UPDATE daily_records 
      SET contatos = ?, respostas = ?, atendimentos = ?, propostas = ?, vendas = ?, valor_vendido = ?, observacao = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(c, r, a, p, v, val, obs, existing.id);

    logAudit(
      req.user.id,
      'ATUALIZACAO_REGISTRO',
      'daily_records',
      existing.id,
      {
        usuario_alvo: targetUserId,
        data,
        antes: existing,
        depois: { contatos: c, respostas: r, atendimentos: a, propostas: p, vendas: v, valor_vendido: val, observacao: obs }
      }
    );

    return res.json({ message: 'Registro diário atualizado com sucesso!', id: existing.id });
  } else {
    // Inserção
    const info = db.prepare(`
      INSERT INTO daily_records (user_id, data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(targetUserId, data, c, r, a, p, v, val, obs);

    logAudit(
      req.user.id,
      'CRIACAO_REGISTRO',
      'daily_records',
      info.lastInsertRowid,
      { usuario_alvo: targetUserId, data, contatos: c, respostas: r, atendimentos: a, propostas: p, vendas: v, valor_vendido: val }
    );

    return res.json({ message: 'Registro diário salvo com sucesso!', id: info.lastInsertRowid });
  }
});

// Excluir próprio registro diário (Vendedor ou Gerente)
app.delete('/api/records/:id', authenticateToken, (req, res) => {
  const recordId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(recordId);

  if (!existing) {
    return res.status(404).json({ error: 'Lançamento não encontrado.' });
  }

  // Se for vendedor, só pode excluir o seu próprio lançamento
  if (req.user.perfil !== 'gerente' && existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Você só pode excluir os seus próprios lançamentos.' });
  }

  db.prepare('DELETE FROM daily_records WHERE id = ?').run(recordId);
  logAudit(req.user.id, 'EXCLUSAO_REGISTRO', 'daily_records', recordId, { registro_excluido: existing });

  return res.json({ message: 'Lançamento excluído com sucesso!' });
});

// ---------------- ROTAS DO GERENTE / ADMINISTRADOR ----------------

// 1. Dashboard Completa do Gerente
app.get('/api/manager/dashboard', authenticateToken, requireManager, (req, res) => {
  const { periodo = 'mes', data_inicio, data_fim, vendedor_id } = req.query;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Cálculo das datas com base no período
  let startStr = todayStr;
  let endStr = todayStr;

  if (periodo === 'hoje') {
    startStr = todayStr;
    endStr = todayStr;
  } else if (periodo === 'semana') {
    const dayOfWeek = now.getDay() || 7; // Segunda como 1
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    startStr = monday.toISOString().split('T')[0];
    endStr = todayStr;
  } else if (periodo === 'mes') {
    startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    endStr = todayStr;
  } else if (periodo === 'custom' && data_inicio && data_fim) {
    startStr = data_inicio;
    endStr = data_fim;
  } else {
    // Default: mês atual
    startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    endStr = todayStr;
  }

  // Cláusula de vendedor
  let userFilter = '';
  let params = [startStr, endStr];
  if (vendedor_id && vendedor_id !== 'todos') {
    userFilter = 'AND r.user_id = ?';
    params.push(Number(vendedor_id));
  }

  // Totais do período selecionado
  const totals = db.prepare(`
    SELECT 
      COALESCE(SUM(r.contatos), 0) as contatos,
      COALESCE(SUM(r.respostas), 0) as respostas,
      COALESCE(SUM(r.atendimentos), 0) as atendimentos,
      COALESCE(SUM(r.propostas), 0) as propostas,
      COALESCE(SUM(r.vendas), 0) as vendas,
      COALESCE(SUM(r.valor_vendido), 0) as valor_vendido
    FROM daily_records r
    JOIN users u ON u.id = r.user_id
    WHERE r.data >= ? AND r.data <= ? ${userFilter}
  `).get(...params);

  // Comparação com mês anterior (mês completo ou proporcional)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthStart = `${prevMonthStr}-01`;
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const prevMonthEnd = `${prevMonthStr}-${String(lastDayPrevMonth).padStart(2, '0')}`;

  let prevParams = [prevMonthStart, prevMonthEnd];
  if (vendedor_id && vendedor_id !== 'todos') {
    prevParams.push(Number(vendedor_id));
  }
  const prevTotals = db.prepare(`
    SELECT 
      COALESCE(SUM(r.contatos), 0) as contatos,
      COALESCE(SUM(r.respostas), 0) as respostas,
      COALESCE(SUM(r.atendimentos), 0) as atendimentos,
      COALESCE(SUM(r.propostas), 0) as propostas,
      COALESCE(SUM(r.vendas), 0) as vendas,
      COALESCE(SUM(r.valor_vendido), 0) as valor_vendido
    FROM daily_records r
    JOIN users u ON u.id = r.user_id
    WHERE r.data >= ? AND r.data <= ? ${userFilter}
  `).get(...prevParams);

  // Evolução diária no período filtrado
  const dailyEvolution = db.prepare(`
    SELECT 
      r.data,
      SUM(r.contatos) as contatos,
      SUM(r.atendimentos) as atendimentos,
      SUM(r.propostas) as propostas,
      SUM(r.vendas) as vendas,
      SUM(r.valor_vendido) as valor_vendido
    FROM daily_records r
    JOIN users u ON u.id = r.user_id
    WHERE r.data >= ? AND r.data <= ? ${userFilter}
    GROUP BY r.data
    ORDER BY r.data ASC
  `).all(...params);

  // Comparativo por vendedor (Ranking e Gráfico de barras / rosca)
  const rankingQuery = `
    SELECT 
      u.id as user_id,
      u.nome_completo,
      u.primeiro_nome,
      COALESCE(SUM(r.contatos), 0) as contatos,
      COALESCE(SUM(r.respostas), 0) as respostas,
      COALESCE(SUM(r.atendimentos), 0) as atendimentos,
      COALESCE(SUM(r.propostas), 0) as propostas,
      COALESCE(SUM(r.vendas), 0) as vendas,
      COALESCE(SUM(r.valor_vendido), 0) as valor_vendido
    FROM users u
    LEFT JOIN daily_records r ON r.user_id = u.id AND r.data >= ? AND r.data <= ?
    WHERE u.perfil = 'vendedor' AND u.ativo = 1
    GROUP BY u.id
    ORDER BY valor_vendido DESC, vendas DESC, atendimentos DESC
  `;
  const sellersRanking = db.prepare(rankingQuery).all(startStr, endStr);

  // Metas do mês atual (para comparação)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const teamGoal = db.prepare(`
    SELECT * FROM goals WHERE user_id IS NULL AND mes_referencia = ?
  `).get(currentMonthKey) || {
    meta_contatos: 0,
    meta_atendimentos: 0,
    meta_propostas: 0,
    meta_vendas: 0,
    meta_valor_vendido: 0
  };

  const individualGoals = db.prepare(`
    SELECT * FROM goals WHERE user_id IS NOT NULL AND mes_referencia = ?
  `).all(currentMonthKey);

  const goalMap = {};
  individualGoals.forEach(g => {
    goalMap[g.user_id] = g;
  });

  // Enriquecer ranking com metas e taxas
  const enrichedRanking = sellersRanking.map((s, index) => {
    const sGoal = goalMap[s.user_id] || { meta_vendas: 0, meta_valor_vendido: 0, meta_contatos: 0, meta_atendimentos: 0, meta_propostas: 0 };
    const pctMetaValor = sGoal.meta_valor_vendido > 0 ? (s.valor_vendido / sGoal.meta_valor_vendido) * 100 : 0;
    const taxaFechamento = s.propostas > 0 ? (s.vendas / s.propostas) * 100 : 0;
    const taxaAtendimento = s.respostas > 0 ? (s.atendimentos / s.respostas) * 100 : 0;

    return {
      posicao: index + 1,
      ...s,
      meta_valor: sGoal.meta_valor_vendido,
      meta_vendas: sGoal.meta_vendas,
      percentual_meta_valor: Math.round(pctMetaValor * 10) / 10,
      taxa_fechamento: Math.round(taxaFechamento * 10) / 10,
      taxa_atendimento: Math.round(taxaAtendimento * 10) / 10
    };
  });

  // Alertas do Gerente
  // 1. Quem ainda não registrou hoje
  const activeSellers = db.prepare(`SELECT id, nome_completo, primeiro_nome, telefone FROM users WHERE perfil = 'vendedor' AND ativo = 1`).all();
  const registeredTodayIds = new Set(
    db.prepare(`SELECT user_id FROM daily_records WHERE data = ?`).all(todayStr).map(r => r.user_id)
  );

  const pendentesHoje = activeSellers.filter(s => !registeredTodayIds.has(s.id));

  // 2. Vendedores com ritmo baixo no mês ou metas superadas
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diaAtual = now.getDate();
  const ritmoEsperado = (diaAtual / diasNoMes) * 100;

  const ritmoBaixo = [];
  const metasBatidas = [];

  enrichedRanking.forEach(s => {
    if (s.meta_valor > 0) {
      if (s.percentual_meta_valor >= 100) {
        metasBatidas.push({
          user_id: s.user_id,
          nome: s.nome_completo,
          percentual: s.percentual_meta_valor,
          valor: s.valor_vendido,
          meta: s.meta_valor
        });
      } else if (s.percentual_meta_valor < (ritmoEsperado * 0.6) && diaAtual > 5) {
        ritmoBaixo.push({
          user_id: s.user_id,
          nome: s.nome_completo,
          percentual: s.percentual_meta_valor,
          esperado: Math.round(ritmoEsperado),
          valor: s.valor_vendido,
          meta: s.meta_valor
        });
      }
    }
  });

  res.json({
    periodo: {
      tipo: periodo,
      inicio: startStr,
      fim: endStr
    },
    totais: totals,
    mes_anterior: prevTotals,
    meta_equipe: teamGoal,
    evolucao_diaria: dailyEvolution,
    ranking: enrichedRanking,
    alertas: {
      pendentes_hoje: pendentesHoje,
      ritmo_baixo: ritmoBaixo,
      metas_batidas: metasBatidas,
      total_vendedores_ativos: activeSellers.length,
      total_registrados_hoje: registeredTodayIds.size
    }
  });
});

// 2. Gestão de Equipe (CRUD Vendedores)
app.get('/api/manager/sellers', authenticateToken, requireManager, (req, res) => {
  const sellers = db.prepare(`
    SELECT id, nome_completo, primeiro_nome, perfil, telefone, ativo, criado_em, atualizado_em
    FROM users
    WHERE perfil = 'vendedor'
    ORDER BY ativo DESC, nome_completo ASC
  `).all();
  res.json({ sellers });
});

app.post('/api/manager/sellers', authenticateToken, requireManager, (req, res) => {
  const { nome_completo, primeiro_nome, codigo_acesso, telefone, ativo = 1, metas } = req.body;

  if (!nome_completo || !primeiro_nome || !codigo_acesso) {
    return res.status(400).json({ error: 'Nome completo, primeiro nome e código de 6 dígitos são obrigatórios.' });
  }

  if (!/^\d{6}$/.test(String(codigo_acesso))) {
    return res.status(400).json({ error: 'O código de acesso deve conter exatamente 6 números.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(String(codigo_acesso).trim(), salt);

  try {
    const info = db.prepare(`
      INSERT INTO users (nome_completo, primeiro_nome, codigo_acesso_protegido, perfil, telefone, ativo)
      VALUES (?, ?, ?, 'vendedor', ?, ?)
    `).run(nome_completo.trim(), primeiro_nome.trim(), hash, telefone ? telefone.trim() : null, ativo ? 1 : 0);

    const newUserId = info.lastInsertRowid;

    // Se metas foram informadas para o mês atual
    if (metas) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      db.prepare(`
        INSERT INTO goals (user_id, mes_referencia, meta_contatos, meta_atendimentos, meta_propostas, meta_vendas, meta_valor_vendido)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        newUserId,
        currentMonth,
        metas.meta_contatos || 0,
        metas.meta_atendimentos || 0,
        metas.meta_propostas || 0,
        metas.meta_vendas || 0,
        metas.meta_valor_vendido || 0
      );
    }

    logAudit(req.user.id, 'CADASTRO_VENDEDOR', 'users', newUserId, { nome_completo, primeiro_nome });

    res.json({ message: 'Vendedor cadastrado com sucesso!', id: newUserId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar vendedor: ' + err.message });
  }
});

app.put('/api/manager/sellers/:id', authenticateToken, requireManager, (req, res) => {
  const sellerId = Number(req.params.id);
  const { nome_completo, primeiro_nome, telefone, ativo, novo_codigo } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(sellerId);
  if (!existing) return res.status(404).json({ error: 'Vendedor não encontrado.' });

  let updateQuery = `
    UPDATE users 
    SET nome_completo = COALESCE(?, nome_completo),
        primeiro_nome = COALESCE(?, primeiro_nome),
        telefone = ?,
        ativo = COALESCE(?, ativo),
        atualizado_em = CURRENT_TIMESTAMP
  `;
  const params = [
    nome_completo ? nome_completo.trim() : null,
    primeiro_nome ? primeiro_nome.trim() : null,
    telefone !== undefined ? telefone : existing.telefone,
    ativo !== undefined ? (ativo ? 1 : 0) : null
  ];

  if (novo_codigo) {
    if (!/^\d{6}$/.test(String(novo_codigo))) {
      return res.status(400).json({ error: 'O código precisa ter exatamente 6 números.' });
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(String(novo_codigo).trim(), salt);
    updateQuery += `, codigo_acesso_protegido = ?`;
    params.push(hash);
  }

  updateQuery += ` WHERE id = ?`;
  params.push(sellerId);

  db.prepare(updateQuery).run(...params);
  logAudit(req.user.id, 'EDICAO_VENDEDOR', 'users', sellerId, { alteracoes: req.body });

  res.json({ message: 'Vendedor atualizado com sucesso!' });
});

// 3. Gestão de Metas (Equipe e Individuais)
app.get('/api/manager/goals', authenticateToken, requireManager, (req, res) => {
  const { mes } = req.query;
  const now = new Date();
  const currentMonth = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const teamGoal = db.prepare(`SELECT * FROM goals WHERE user_id IS NULL AND mes_referencia = ?`).get(currentMonth) || null;
  
  const individualGoals = db.prepare(`
    SELECT g.*, u.nome_completo, u.primeiro_nome
    FROM goals g
    JOIN users u ON u.id = g.user_id
    WHERE g.mes_referencia = ? AND u.ativo = 1
  `).all(currentMonth);

  res.json({
    mes_referencia: currentMonth,
    meta_equipe: teamGoal,
    metas_individuais: individualGoals
  });
});

app.post('/api/manager/goals', authenticateToken, requireManager, (req, res) => {
  const { user_id, mes_referencia, meta_contatos, meta_atendimentos, meta_propostas, meta_vendas, meta_valor_vendido } = req.body;

  if (!mes_referencia) return res.status(400).json({ error: 'Mês de referência (AAAA-MM) é obrigatório.' });

  const targetUserId = user_id ? Number(user_id) : null;
  const c = Math.max(0, parseInt(meta_contatos, 10) || 0);
  const a = Math.max(0, parseInt(meta_atendimentos, 10) || 0);
  const p = Math.max(0, parseInt(meta_propostas, 10) || 0);
  const v = Math.max(0, parseInt(meta_vendas, 10) || 0);
  const val = Math.max(0, parseFloat(meta_valor_vendido) || 0);

  const existing = targetUserId
    ? db.prepare('SELECT * FROM goals WHERE user_id = ? AND mes_referencia = ?').get(targetUserId, mes_referencia)
    : db.prepare('SELECT * FROM goals WHERE user_id IS NULL AND mes_referencia = ?').get(mes_referencia);

  if (existing) {
    db.prepare(`
      UPDATE goals 
      SET meta_contatos = ?, meta_atendimentos = ?, meta_propostas = ?, meta_vendas = ?, meta_valor_vendido = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(c, a, p, v, val, existing.id);

    logAudit(req.user.id, 'ATUALIZACAO_META', 'goals', existing.id, { mes_referencia, user_id: targetUserId });
  } else {
    const info = db.prepare(`
      INSERT INTO goals (user_id, mes_referencia, meta_contatos, meta_atendimentos, meta_propostas, meta_vendas, meta_valor_vendido)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(targetUserId, mes_referencia, c, a, p, v, val);

    logAudit(req.user.id, 'CRIACAO_META', 'goals', info.lastInsertRowid, { mes_referencia, user_id: targetUserId });
  }

  res.json({ message: 'Meta salva com sucesso!' });
});

// 4. Listagem e Edição/Exclusão de Registros com Auditoria
app.get('/api/manager/records', authenticateToken, requireManager, (req, res) => {
  const { vendedor_id, data_inicio, data_fim } = req.query;

  let query = `
    SELECT r.*, u.nome_completo, u.primeiro_nome
    FROM daily_records r
    JOIN users u ON u.id = r.user_id
    WHERE 1=1
  `;
  const params = [];

  if (vendedor_id && vendedor_id !== 'todos') {
    query += ` AND r.user_id = ?`;
    params.push(Number(vendedor_id));
  }
  if (data_inicio) {
    query += ` AND r.data >= ?`;
    params.push(data_inicio);
  }
  if (data_fim) {
    query += ` AND r.data <= ?`;
    params.push(data_fim);
  }

  query += ` ORDER BY r.data DESC, u.nome_completo ASC LIMIT 500`;

  const records = db.prepare(query).all(...params);
  res.json({ records });
});

app.delete('/api/manager/records/:id', authenticateToken, requireManager, (req, res) => {
  const recordId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(recordId);

  if (!existing) return res.status(404).json({ error: 'Lançamento não encontrado.' });

  db.prepare('DELETE FROM daily_records WHERE id = ?').run(recordId);
  logAudit(req.user.id, 'EXCLUSAO_REGISTRO', 'daily_records', recordId, { registro_excluido: existing });

  res.json({ message: 'Lançamento excluído com sucesso!' });
});

// 5. Histórico de Auditoria
app.get('/api/manager/audit-logs', authenticateToken, requireManager, (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, u.nome_completo as autor_nome
    FROM audit_logs a
    JOIN users u ON u.id = a.usuario_responsavel_id
    ORDER BY a.data_hora DESC
    LIMIT 100
  `).all();
  res.json({ logs });
});

// Servir arquivos estáticos do Vite em produção
app.use(express.static(path.join(__dirname, '../dist')));

app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});

