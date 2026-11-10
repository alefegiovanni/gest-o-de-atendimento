const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const sqliteDb = new Database(path.join(__dirname, 'database.sqlite'));

const SUPABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.cmwkjoyfopnfqkoechol:Be310519%40Be310519@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Iniciando migração para o Supabase PostgreSQL...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Criar tabelas se não existirem
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        primeiro_nome VARCHAR(100) NOT NULL,
        codigo_acesso_protegido VARCHAR(255) NOT NULL,
        perfil VARCHAR(50) NOT NULL CHECK(perfil IN ('gerente', 'vendedor')),
        telefone VARCHAR(50),
        ativo INTEGER NOT NULL DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS daily_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data VARCHAR(20) NOT NULL,
        contatos INTEGER NOT NULL DEFAULT 0,
        respostas INTEGER NOT NULL DEFAULT 0,
        atendimentos INTEGER NOT NULL DEFAULT 0,
        propostas INTEGER NOT NULL DEFAULT 0,
        vendas INTEGER NOT NULL DEFAULT 0,
        valor_vendido NUMERIC NOT NULL DEFAULT 0,
        observacao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, data)
      );

      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mes_referencia VARCHAR(20) NOT NULL,
        meta_contatos INTEGER NOT NULL DEFAULT 0,
        meta_atendimentos INTEGER NOT NULL DEFAULT 0,
        meta_propostas INTEGER NOT NULL DEFAULT 0,
        meta_vendas INTEGER NOT NULL DEFAULT 0,
        meta_valor_vendido NUMERIC NOT NULL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, mes_referencia)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        usuario_responsavel_id INTEGER REFERENCES users(id),
        tipo_de_acao VARCHAR(100) NOT NULL,
        entidade VARCHAR(100) NOT NULL,
        entidade_id INTEGER,
        detalhes TEXT,
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tabelas verificadas/criadas no Supabase.');

    // 2. Migrar Usuários do SQLite
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, nome_completo, primeiro_nome, codigo_acesso_protegido, perfil, telefone, ativo, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          nome_completo = EXCLUDED.nome_completo,
          primeiro_nome = EXCLUDED.primeiro_nome,
          codigo_acesso_protegido = EXCLUDED.codigo_acesso_protegido,
          perfil = EXCLUDED.perfil,
          telefone = EXCLUDED.telefone,
          ativo = EXCLUDED.ativo
      `, [u.id, u.nome_completo, u.primeiro_nome, u.codigo_acesso_protegido, u.perfil, u.telefone, u.ativo, u.criado_em, u.atualizado_em]);
    }
    // Ajustar sequence
    await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`);
    console.log(`${users.length} usuários migrados.`);

    // 3. Migrar daily_records
    const records = sqliteDb.prepare('SELECT * FROM daily_records').all();
    for (const r of records) {
      await client.query(`
        INSERT INTO daily_records (id, user_id, data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id, data) DO UPDATE SET
          contatos = EXCLUDED.contatos,
          respostas = EXCLUDED.respostas,
          atendimentos = EXCLUDED.atendimentos,
          propostas = EXCLUDED.propostas,
          vendas = EXCLUDED.vendas,
          valor_vendido = EXCLUDED.valor_vendido,
          observacao = EXCLUDED.observacao
      `, [r.id, r.user_id, r.data, r.contatos, r.respostas, r.atendimentos, r.propostas, r.vendas, r.valor_vendido, r.observacao, r.criado_em, r.atualizado_em]);
    }
    if (records.length > 0) {
      await client.query(`SELECT setval('daily_records_id_seq', (SELECT MAX(id) FROM daily_records));`);
    }
    console.log(`${records.length} lançamentos diários migrados.`);

    // 4. Migrar goals
    const goals = sqliteDb.prepare('SELECT * FROM goals').all();
    for (const g of goals) {
      await client.query(`
        INSERT INTO goals (id, user_id, mes_referencia, meta_contatos, meta_atendimentos, meta_propostas, meta_vendas, meta_valor_vendido, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, mes_referencia) DO NOTHING
      `, [g.id, g.user_id, g.mes_referencia, g.meta_contatos, g.meta_atendimentos, g.meta_propostas, g.meta_vendas, g.meta_valor_vendido, g.criado_em, g.atualizado_em]);
    }
    if (goals.length > 0) {
      await client.query(`SELECT setval('goals_id_seq', (SELECT MAX(id) FROM goals));`);
    }

    // 5. Migrar logs
    const logs = sqliteDb.prepare('SELECT * FROM audit_logs').all();
    for (const l of logs) {
      await client.query(`
        INSERT INTO audit_logs (id, usuario_responsavel_id, tipo_de_acao, entidade, entidade_id, detalhes, data_hora)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [l.id, l.usuario_responsavel_id, l.tipo_de_acao, l.entidade, l.entidade_id, l.detalhes, l.data_hora]);
    }
    if (logs.length > 0) {
      await client.query(`SELECT setval('audit_logs_id_seq', (SELECT MAX(id) FROM audit_logs));`);
    }

    await client.query('COMMIT');
    console.log('✅ Migração para Supabase concluída com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();

