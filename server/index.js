const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gestao-consorcio-super-segredo-2026-prod';

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

async function logAudit(userId, tipoAcao, entidade, entidadeId, detalhes) {
  try {
    await db.query(`
      INSERT INTO audit_logs (usuario_responsavel_id, tipo_de_acao, entidade, entidade_id, detalhes)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, tipoAcao, entidade, entidadeId, typeof detalhes === 'object' ? JSON.stringify(detalhes) : String(detalhes)]);
  } catch (err) {
    console.error('Erro ao salvar log de auditoria:', err);
  }
}

// ---------------- AUTH ROUTES ----------------

// 1. Login por Primeiro Nome e Código de 6 números
app.post('/api/auth/login', async (req, res) => {
  const { primeiro_nome, codigo_acesso, nome_completo, user_id } = req.body;

  if (!codigo_acesso || (!primeiro_nome && !nome_completo && !user_id)) {
    return res.status(400).json({ error: 'Informe seu primeiro nome e o código de 6 números.' });
  }

  try {
    let result;
    if (user_id) {
      result = await db.query('SELECT * FROM users WHERE id = $1 AND ativo = 1', [user_id]);
    } else if (nome_completo) {
      result = await db.query('SELECT * FROM users WHERE LOWER(TRIM(nome_completo)) = LOWER(TRIM($1)) AND ativo = 1', [nome_completo]);
    } else {
      result = await db.query('SELECT * FROM users WHERE LOWER(TRIM(primeiro_nome)) = LOWER(TRIM($1)) AND ativo = 1', [primeiro_nome]);
    }

    const users = result.rows;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo. Verifique os dados digitados.' });
    }

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
        telefone: user.telefone,
        precisa_trocar_codigo: user.precisa_trocar_codigo === 1
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno do servidor no login.' });
  }
});

// 2. Trocar código direto pela tela de login (sem precisar estar logado)
app.post('/api/auth/reset-code', async (req, res) => {
  const { primeiro_nome, codigo_atual, novo_codigo } = req.body;

  if (!primeiro_nome || !codigo_atual || !novo_codigo) {
    return res.status(400).json({ error: 'Primeiro nome, código atual e novo código são obrigatórios.' });
  }

  if (!/^\d{6}$/.test(String(novo_codigo))) {
    return res.status(400).json({ error: 'O novo código precisa ter exatamente 6 números.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE LOWER(TRIM(primeiro_nome)) = LOWER(TRIM($1)) AND ativo = 1', [primeiro_nome]);
    const users = result.rows;

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado ou inativo.' });
    }

    if (users.length > 1) {
      return res.status(400).json({ error: 'Existe mais de um colaborador com este nome. Por favor, acesse o sistema antes de trocar a senha.' });
    }

    const user = users[0];
    const valid = bcrypt.compareSync(String(codigo_atual).trim(), user.codigo_acesso_protegido);

    if (!valid) {
      return res.status(401).json({ error: 'Código atual informado está incorreto.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(String(novo_codigo).trim(), salt);

    await db.query('UPDATE users SET codigo_acesso_protegido = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2', [hash, user.id]);
    await logAudit(user.id, 'ALTERACAO_SENHA_LOGIN', 'users', user.id, 'Usuário alterou seu código pela tela de login.');

    res.json({ message: 'Código de acesso alterado com sucesso! Já pode fazer login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao redefinir código.' });
  }
});

// 3. Obter perfil autenticado atual
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome_completo, primeiro_nome, perfil, telefone, ativo, criado_em FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
  }
});

// 3. Alterar o próprio código de acesso
app.post('/api/auth/change-code', authenticateToken, async (req, res) => {
  const { codigo_atual, novo_codigo } = req.body;

  if (!codigo_atual || !novo_codigo) {
    return res.status(400).json({ error: 'Código atual e novo código são obrigatórios.' });
  }

  if (!/^\d{6}$/.test(String(novo_codigo))) {
    return res.status(400).json({ error: 'O novo código precisa ter exatamente 6 números.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    const valid = bcrypt.compareSync(String(codigo_atual).trim(), user.codigo_acesso_protegido);

    if (!valid) {
      return res.status(401).json({ error: 'Código atual informado está incorreto.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(String(novo_codigo).trim(), salt);

    await db.query('UPDATE users SET codigo_acesso_protegido = $1, precisa_trocar_codigo = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user.id]);
    await logAudit(req.user.id, 'ALTERACAO_SENHA', 'users', req.user.id, 'O próprio usuário alterou seu código de 6 dígitos.');

    res.json({ message: 'Código de acesso alterado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar código.' });
  }
});

// 4. Alterar dados do perfil próprio (ex: nome do gerente)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { nome_completo, primeiro_nome } = req.body;

  if (!nome_completo || !primeiro_nome) {
    return res.status(400).json({ error: 'Nome completo e primeiro nome são obrigatórios.' });
  }

  try {
    await db.query(`
      UPDATE users 
      SET nome_completo = $1, primeiro_nome = $2, atualizado_em = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [nome_completo.trim(), primeiro_nome.trim(), req.user.id]);

    await logAudit(req.user.id, 'EDICAO_PERFIL', 'users', req.user.id, { nome_completo, primeiro_nome });

    const result = await db.query('SELECT id, nome_completo, primeiro_nome, perfil, telefone, ativo FROM users WHERE id = $1', [req.user.id]);

    res.json({
      message: 'Nome atualizado com sucesso!',
      user: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// ---------------- ROTAS DO VENDEDOR ----------------

// Status e registro do dia do vendedor autenticado
app.get('/api/seller/today-status', authenticateToken, async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const result = await db.query('SELECT * FROM daily_records WHERE user_id = $1 AND data = $2', [req.user.id, todayStr]);
    const record = result.rows[0] || null;
    res.json({
      data_atual: todayStr,
      preenchido: !!record,
      registro: record
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar status do dia.' });
  }
});

// Resumo do mês e histórico para o vendedor logado
app.get('/api/seller/my-dashboard', authenticateToken, async (req, res) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const userId = req.user.id;

  try {
    const totalsRes = await db.query(`
      SELECT 
        COALESCE(SUM(contatos), 0)::int as total_contatos,
        COALESCE(SUM(respostas), 0)::int as total_respostas,
        COALESCE(SUM(atendimentos), 0)::int as total_atendimentos,
        COALESCE(SUM(propostas), 0)::int as total_propostas,
        COALESCE(SUM(vendas), 0)::int as total_vendas,
        COALESCE(SUM(valor_vendido), 0)::float as total_valor_vendido,
        COUNT(*)::int as dias_com_registro
      FROM daily_records 
      WHERE user_id = $1 AND data LIKE $2
    `, [userId, `${currentMonth}%`]);

    const goalRes = await db.query(`
      SELECT * FROM goals WHERE user_id = $1 AND mes_referencia = $2
    `, [userId, currentMonth]);

    const goal = goalRes.rows[0] || {
      meta_contatos: 0,
      meta_atendimentos: 0,
      meta_propostas: 0,
      meta_vendas: 0,
      meta_valor_vendido: 0
    };

    const historyRes = await db.query(`
      SELECT data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao, id
      FROM daily_records 
      WHERE user_id = $1 
      ORDER BY data ASC
    `, [userId]);

    const dailyHistory = historyRes.rows;
    const todayStr = now.toISOString().split('T')[0];
    const todayRecord = dailyHistory.find(r => r.data === todayStr) || null;

    res.json({
      mes_referencia: currentMonth,
      hoje: todayStr,
      hoje_preenchido: !!todayRecord,
      registro_hoje: todayRecord,
      totais_mes: totalsRes.rows[0],
      metas: goal,
      historico_diario: dailyHistory
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard do vendedor.' });
  }
});

// Salvar ou atualizar registro diário (vendedor ou gerente)
app.post('/api/records', authenticateToken, async (req, res) => {
  const { data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao, user_id } = req.body;

  let targetUserId = req.user.id;
  if (req.user.perfil === 'gerente' && user_id) {
    targetUserId = Number(user_id);
  }

  if (!data) {
    return res.status(400).json({ error: 'A data do registro é obrigatória.' });
  }

  const c = Math.max(0, parseInt(contatos, 10) || 0);
  const r = Math.max(0, parseInt(respostas, 10) || 0);
  const a = Math.max(0, parseInt(atendimentos, 10) || 0);
  const p = Math.max(0, parseInt(propostas, 10) || 0);
  const v = Math.max(0, parseInt(vendas, 10) || 0);
  const val = Math.max(0, parseFloat(valor_vendido) || 0);
  const obs = observacao ? String(observacao).trim() : null;

  try {
    const existingRes = await db.query('SELECT * FROM daily_records WHERE user_id = $1 AND data = $2', [targetUserId, data]);
    const existing = existingRes.rows[0];

    if (existing) {
      await db.query(`
        UPDATE daily_records 
        SET contatos = $1, respostas = $2, atendimentos = $3, propostas = $4, vendas = $5, valor_vendido = $6, observacao = $7, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $8
      `, [c, r, a, p, v, val, obs, existing.id]);

      await logAudit(
        req.user.id,
        'ATUALIZACAO_REGISTRO',
        'daily_records',
        existing.id,
        { usuario_alvo: targetUserId, data, antes: existing, depois: { contatos: c, atendimentos: a } }
      );

      return res.json({ message: 'Registro diário atualizado com sucesso!', id: existing.id });
    } else {
      const insertRes = await db.query(`
        INSERT INTO daily_records (user_id, data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [targetUserId, data, c, r, a, p, v, val, obs]);

      const newId = insertRes.rows[0].id;

      await logAudit(
        req.user.id,
        'CRIACAO_REGISTRO',
        'daily_records',
        newId,
        { usuario_alvo: targetUserId, data, contatos: c, atendimentos: a }
      );

      return res.json({ message: 'Registro diário salvo com sucesso!', id: newId });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar registro.' });
  }
});

// Excluir próprio registro diário
app.delete('/api/records/:id', authenticateToken, async (req, res) => {
  const recordId = Number(req.params.id);

  try {
    const existingRes = await db.query('SELECT * FROM daily_records WHERE id = $1', [recordId]);
    const existing = existingRes.rows[0];

    if (!existing) {
      return res.status(404).json({ error: 'Lançamento não encontrado.' });
    }

    if (req.user.perfil !== 'gerente' && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode excluir os seus próprios lançamentos.' });
    }

    await db.query('DELETE FROM daily_records WHERE id = $1', [recordId]);
    await logAudit(req.user.id, 'EXCLUSAO_REGISTRO', 'daily_records', recordId, { registro_excluido: existing });

    return res.json({ message: 'Lançamento excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir registro.' });
  }
});

// Excluir TODOS os lançamentos de um funcionário específico (Somente Gerente)
app.delete('/api/manager/records/seller/:userId', authenticateToken, requireManager, async (req, res) => {
  const sellerId = Number(req.params.userId);

  try {
    const userRes = await db.query('SELECT nome_completo FROM users WHERE id = $1', [sellerId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    const countRes = await db.query('SELECT COUNT(*)::int as count FROM daily_records WHERE user_id = $1', [sellerId]);
    const totalDeleted = countRes.rows[0].count;

    await db.query('DELETE FROM daily_records WHERE user_id = $1', [sellerId]);
    await logAudit(req.user.id, 'EXCLUSAO_TODOS_REGISTROS_VENDEDOR', 'daily_records', sellerId, {
      vendedor: user.nome_completo,
      quantidade_excluida: totalDeleted
    });

    return res.json({ message: `Todos os ${totalDeleted} lançamentos de ${user.nome_completo} foram excluídos com sucesso!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir lançamentos do funcionário.' });
  }
});

// Excluir TODOS os lançamentos de TODA a equipe (Zerar histórico) (Somente Gerente)
app.delete('/api/manager/records/all', authenticateToken, requireManager, async (req, res) => {
  try {
    const countRes = await db.query('SELECT COUNT(*)::int as count FROM daily_records');
    const totalDeleted = countRes.rows[0].count;

    await db.query('DELETE FROM daily_records');
    await logAudit(req.user.id, 'LIMPEZA_GERAL_HISTORICO', 'daily_records', null, {
      quantidade_excluida: totalDeleted
    });

    return res.json({ message: `Todos os ${totalDeleted} registros da equipe foram apagados com sucesso!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao apagar histórico geral.' });
  }
});

// ---------------- ROTAS DO GERENTE / ADMINISTRADOR ----------------

app.get('/api/manager/dashboard', authenticateToken, requireManager, async (req, res) => {
  const { periodo = 'hoje', data_inicio, data_fim, vendedor_id } = req.query;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let startStr = todayStr;
  let endStr = todayStr;

  if (periodo === 'hoje') {
    startStr = todayStr;
    endStr = todayStr;
  } else if (periodo === 'semana') {
    const dayOfWeek = now.getDay() || 7;
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
  }

  let userFilter = '';
  let params = [startStr, endStr];
  if (vendedor_id && vendedor_id !== 'todos') {
    userFilter = 'AND r.user_id = $3';
    params.push(Number(vendedor_id));
  }

  try {
    const totalsRes = await db.query(`
      SELECT 
        COALESCE(SUM(r.contatos), 0)::int as contatos,
        COALESCE(SUM(r.respostas), 0)::int as respostas,
        COALESCE(SUM(r.atendimentos), 0)::int as atendimentos,
        COALESCE(SUM(r.propostas), 0)::int as propostas,
        COALESCE(SUM(r.vendas), 0)::int as vendas,
        COALESCE(SUM(r.valor_vendido), 0)::float as valor_vendido
      FROM daily_records r
      JOIN users u ON u.id = r.user_id
      WHERE r.data >= $1 AND r.data <= $2 ${userFilter}
    `, params);

    // Comparativo por vendedor (Ranking)
    const rankingRes = await db.query(`
      SELECT 
        u.id as user_id,
        u.nome_completo,
        u.primeiro_nome,
        COALESCE(SUM(r.contatos), 0)::int as contatos,
        COALESCE(SUM(r.respostas), 0)::int as respostas,
        COALESCE(SUM(r.atendimentos), 0)::int as atendimentos,
        COALESCE(SUM(r.propostas), 0)::int as propostas,
        COALESCE(SUM(r.vendas), 0)::int as vendas,
        COALESCE(SUM(r.valor_vendido), 0)::float as valor_vendido,
        MAX(r.observacao) as ultima_observacao
      FROM users u
      LEFT JOIN daily_records r ON r.user_id = u.id AND r.data >= $1 AND r.data <= $2
      WHERE u.perfil = 'vendedor' AND u.ativo = 1
      GROUP BY u.id, u.nome_completo, u.primeiro_nome
      ORDER BY atendimentos DESC, contatos DESC
    `, [startStr, endStr]);

    // Alertas
    const activeSellersRes = await db.query(`SELECT id, nome_completo, primeiro_nome, telefone FROM users WHERE perfil = 'vendedor' AND ativo = 1`);
    const registeredTodayRes = await db.query(`SELECT user_id FROM daily_records WHERE data = $1`, [todayStr]);

    const registeredSet = new Set(registeredTodayRes.rows.map(r => r.user_id));
    const pendentesHoje = activeSellersRes.rows.filter(s => !registeredSet.has(s.id));

    res.json({
      periodo: { tipo: periodo, inicio: startStr, fim: endStr },
      totais: totalsRes.rows[0],
      ranking: rankingRes.rows,
      alertas: {
        pendentes_hoje: pendentesHoje,
        total_vendedores_ativos: activeSellersRes.rows.length,
        total_registrados_hoje: registeredSet.size
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dados do gerente.' });
  }
});

// CRUD Vendedores
app.get('/api/manager/sellers', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, nome_completo, primeiro_nome, perfil, telefone, ativo, criado_em, atualizado_em
      FROM users
      WHERE perfil = 'vendedor'
      ORDER BY ativo DESC, nome_completo ASC
    `);
    res.json({ sellers: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar vendedores.' });
  }
});

app.post('/api/manager/sellers', authenticateToken, requireManager, async (req, res) => {
  const { nome_completo, primeiro_nome, codigo_acesso, telefone, ativo = 1 } = req.body;

  if (!nome_completo || !primeiro_nome || !codigo_acesso) {
    return res.status(400).json({ error: 'Nome completo, primeiro nome e código de 6 dígitos são obrigatórios.' });
  }

  if (!/^\d{6}$/.test(String(codigo_acesso))) {
    return res.status(400).json({ error: 'O código de acesso deve conter exatamente 6 números.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(String(codigo_acesso).trim(), salt);

  try {
    const result = await db.query(`
      INSERT INTO users (nome_completo, primeiro_nome, codigo_acesso_protegido, perfil, telefone, ativo, precisa_trocar_codigo)
      VALUES ($1, $2, $3, 'vendedor', $4, $5, 1)
      RETURNING id
    `, [nome_completo.trim(), primeiro_nome.trim(), hash, telefone ? telefone.trim() : null, ativo ? 1 : 0]);

    const newUserId = result.rows[0].id;
    await logAudit(req.user.id, 'CADASTRO_VENDEDOR', 'users', newUserId, { nome_completo, primeiro_nome });

    res.json({ message: 'Vendedor cadastrado com sucesso!', id: newUserId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cadastrar vendedor: ' + err.message });
  }
});

// Redefinir senha padrão para TODOS os vendedores de uma vez
app.post('/api/manager/sellers/reset-all-passwords', authenticateToken, requireManager, async (req, res) => {
  const { codigo_padrao } = req.body;

  if (!codigo_padrao || !/^\d{6}$/.test(String(codigo_padrao))) {
    return res.status(400).json({ error: 'O código padrão deve conter exatamente 6 números.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(String(codigo_padrao).trim(), salt);

  try {
    await db.query(`
      UPDATE users 
      SET codigo_acesso_protegido = $1, precisa_trocar_codigo = 1, atualizado_em = CURRENT_TIMESTAMP
      WHERE perfil = 'vendedor'
    `, [hash]);

    await logAudit(req.user.id, 'REDEFINIR_CODIGO_PADRAO_TODOS', 'users', null, { codigo_padrao });

    res.json({ message: 'Senha padrão aplicada a todos os vendedores com sucesso! No próximo login, eles serão solicitados a cadastrar uma nova senha.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao redefinir código de todos: ' + err.message });
  }
});

app.put('/api/manager/sellers/:id', authenticateToken, requireManager, async (req, res) => {
  const sellerId = Number(req.params.id);
  const { nome_completo, primeiro_nome, telefone, ativo, novo_codigo, forcar_troca } = req.body;

  try {
    const existingRes = await db.query('SELECT * FROM users WHERE id = $1', [sellerId]);
    const existing = existingRes.rows[0];
    if (!existing) return res.status(404).json({ error: 'Vendedor não encontrado.' });

    let updateQuery = `
      UPDATE users 
      SET nome_completo = COALESCE($1, nome_completo),
          primeiro_nome = COALESCE($2, primeiro_nome),
          telefone = $3,
          ativo = COALESCE($4, ativo),
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
      updateQuery += `, codigo_acesso_protegido = $5, precisa_trocar_codigo = 1 WHERE id = $6`;
      params.push(hash, sellerId);
    } else {
      updateQuery += ` WHERE id = $5`;
      params.push(sellerId);
    }

    await db.query(updateQuery, params);
    await logAudit(req.user.id, 'EDICAO_VENDEDOR', 'users', sellerId, { alteracoes: req.body });

    res.json({ message: 'Vendedor atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar vendedor.' });
  }
});

// Listagem de lançamentos
app.get('/api/manager/records', authenticateToken, requireManager, async (req, res) => {
  const { vendedor_id, data_inicio, data_fim } = req.query;

  let query = `
    SELECT r.*, u.nome_completo, u.primeiro_nome
    FROM daily_records r
    JOIN users u ON u.id = r.user_id
    WHERE 1=1
  `;
  const params = [];

  if (vendedor_id && vendedor_id !== 'todos') {
    params.push(Number(vendedor_id));
    query += ` AND r.user_id = $${params.length}`;
  }
  if (data_inicio) {
    params.push(data_inicio);
    query += ` AND r.data >= $${params.length}`;
  }
  if (data_fim) {
    params.push(data_fim);
    query += ` AND r.data <= $${params.length}`;
  }

  query += ` ORDER BY r.data DESC, u.nome_completo ASC LIMIT 500`;

  try {
    const result = await db.query(query, params);
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar lançamentos.' });
  }
});

// Servir arquivos estáticos do Vite em produção
app.use(express.static(path.join(__dirname, '../dist')));

app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Exportar para Vercel Serverless
module.exports = app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Backend rodando com Supabase em http://localhost:${PORT}`);
  });
}
