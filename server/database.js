const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  // 1. users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_completo TEXT NOT NULL,
      primeiro_nome TEXT NOT NULL,
      codigo_acesso_protegido TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK(perfil IN ('gerente', 'vendedor')),
      telefone TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. daily_records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      contatos INTEGER NOT NULL DEFAULT 0,
      respostas INTEGER NOT NULL DEFAULT 0,
      atendimentos INTEGER NOT NULL DEFAULT 0,
      propostas INTEGER NOT NULL DEFAULT 0,
      vendas INTEGER NOT NULL DEFAULT 0,
      valor_vendido REAL NOT NULL DEFAULT 0,
      observacao TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, data),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      mes_referencia TEXT NOT NULL,
      meta_contatos INTEGER NOT NULL DEFAULT 0,
      meta_atendimentos INTEGER NOT NULL DEFAULT 0,
      meta_propostas INTEGER NOT NULL DEFAULT 0,
      meta_vendas INTEGER NOT NULL DEFAULT 0,
      meta_valor_vendido REAL NOT NULL DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, mes_referencia),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. audit_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_responsavel_id INTEGER NOT NULL,
      tipo_de_acao TEXT NOT NULL,
      entidade TEXT NOT NULL,
      entidade_id INTEGER,
      detalhes TEXT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(usuario_responsavel_id) REFERENCES users(id)
    );
  `);

  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial demo data...');

  const insertUser = db.prepare(`
    INSERT INTO users (nome_completo, primeiro_nome, codigo_acesso_protegido, perfil, telefone, ativo)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Hash codes: Gerente: 123456, Vendedores: 482916, 591823, 736192, 849201, 627184
  const salt = bcrypt.genSaltSync(10);

  const managerId = insertUser.run(
    'Carlos Silva (Gerente)',
    'Carlos',
    bcrypt.hashSync('123456', salt),
    'gerente',
    '(11) 98765-4321',
    1
  ).lastInsertRowid;

  const sellersData = [
    { nome: 'Ana Carolina Martins', primeiro: 'Ana', codigo: '482916', tel: '(11) 99123-1122' },
    { nome: 'Bruno Henrique Souza', primeiro: 'Bruno', codigo: '591823', tel: '(11) 98234-2233' },
    { nome: 'Camila Fernandes Lima', primeiro: 'Camila', codigo: '736192', tel: '(11) 97345-3344' },
    { nome: 'Diego Rodrigo Alves', primeiro: 'Diego', codigo: '849201', tel: '(11) 96456-4455' },
    { nome: 'Eduarda Santos Rocha', primeiro: 'Eduarda', codigo: '627184', tel: '(11) 95567-5566' }
  ];

  const sellerIds = [];
  for (const s of sellersData) {
    const sId = insertUser.run(
      s.nome,
      s.primeiro,
      bcrypt.hashSync(s.codigo, salt),
      'vendedor',
      s.tel,
      1
    ).lastInsertRowid;
    sellerIds.push({ id: sId, nome: s.nome, primeiro: s.primeiro });
  }

  // Get current year and month for goals (format YYYY-MM)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Previous month
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const insertGoal = db.prepare(`
    INSERT INTO goals (user_id, mes_referencia, meta_contatos, meta_atendimentos, meta_propostas, meta_vendas, meta_valor_vendido)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Team Goals (user_id is NULL)
  insertGoal.run(null, currentMonth, 1200, 720, 360, 48, 4800000);
  insertGoal.run(null, prevMonth, 1100, 660, 330, 44, 4400000);

  // Individual Goals (current & prev)
  const goalsTemplates = [
    { contatos: 260, atend: 160, prop: 80, vendas: 12, valor: 1200000 },
    { contatos: 240, atend: 150, prop: 75, vendas: 10, valor: 1000000 },
    { contatos: 250, atend: 150, prop: 75, vendas: 10, valor: 1000000 },
    { contatos: 220, atend: 130, prop: 65, vendas: 8, valor: 800000 },
    { contatos: 230, atend: 130, prop: 65, vendas: 8, valor: 800000 }
  ];

  sellerIds.forEach((seller, idx) => {
    const tmpl = goalsTemplates[idx];
    insertGoal.run(seller.id, currentMonth, tmpl.contatos, tmpl.atend, tmpl.prop, tmpl.vendas, tmpl.valor);
    insertGoal.run(seller.id, prevMonth, tmpl.contatos - 20, tmpl.atend - 10, tmpl.prop - 5, tmpl.vendas - 1, tmpl.valor - 100000);
  });

  // Generate 30 days of records
  const insertRecord = db.prepare(`
    INSERT INTO daily_records (user_id, data, contatos, respostas, atendimentos, propostas, vendas, valor_vendido, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Performance weights for sellers
  const sellerWeights = [
    { cMin: 10, cMax: 18, rRate: 0.75, aRate: 0.85, pRate: 0.55, vRate: 0.20, ticket: 110000 }, // Ana (Top)
    { cMin: 8,  cMax: 16, rRate: 0.70, aRate: 0.80, pRate: 0.50, vRate: 0.16, ticket: 95000 },  // Bruno
    { cMin: 8,  cMax: 15, rRate: 0.68, aRate: 0.82, pRate: 0.48, vRate: 0.15, ticket: 100000 }, // Camila
    { cMin: 6,  cMax: 12, rRate: 0.60, aRate: 0.75, pRate: 0.45, vRate: 0.12, ticket: 90000 },  // Diego
    { cMin: 7,  cMax: 13, rRate: 0.65, aRate: 0.75, pRate: 0.45, vRate: 0.14, ticket: 85000 }   // Eduarda
  ];

  // For the last 30 days up to today
  for (let d = 29; d >= 0; d--) {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - d);
    
    // Skip Sundays
    if (dateObj.getDay() === 0) continue;

    const dateStr = dateObj.toISOString().split('T')[0];
    const isToday = (d === 0);

    sellerIds.forEach((seller, idx) => {
      // If today, let's leave 2 sellers pending so alerts show up!
      if (isToday && (idx === 3 || idx === 4)) {
        return; // Diego and Eduarda pending today
      }

      const w = sellerWeights[idx];
      const contatos = Math.floor(Math.random() * (w.cMax - w.cMin + 1)) + w.cMin;
      const respostas = Math.min(contatos, Math.max(1, Math.round(contatos * (w.rRate + (Math.random() * 0.1 - 0.05)))));
      const atendimentos = Math.min(respostas, Math.max(1, Math.round(respostas * (w.aRate + (Math.random() * 0.1 - 0.05)))));
      const propostas = Math.min(atendimentos, Math.round(atendimentos * (w.pRate + (Math.random() * 0.1 - 0.05))));
      
      let vendas = 0;
      if (propostas > 0 && Math.random() < (w.vRate * propostas)) {
        vendas = Math.min(propostas, Math.floor(Math.random() * 2) + 1);
      }
      
      const valorVendido = vendas > 0 ? (vendas * w.ticket * (0.8 + Math.random() * 0.4)) : 0;
      const roundedValor = Math.round(valorVendido / 1000) * 1000;

      const obs = vendas > 0 
        ? `Fechamento de consórcio auto/imóvel com cliente indicado.` 
        : (propostas > 0 ? `Aguardando retorno de simulação enviada.` : null);

      try {
        insertRecord.run(seller.id, dateStr, contatos, respostas, atendimentos, propostas, vendas, roundedValor, obs);
      } catch (e) {
        // ignore duplicate
      }
    });
  }

  // Audit log initial demo
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (usuario_responsavel_id, tipo_de_acao, entidade, entidade_id, detalhes)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertAudit.run(managerId, 'CRIACAO', 'users', managerId, 'Inicialização do sistema com dados de demonstração');

  console.log('Database seeded successfully!');
}

initDb();

module.exports = db;

