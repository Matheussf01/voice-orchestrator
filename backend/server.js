const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../dist')));

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Testa a conexão ao iniciar
(async () => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    await conn.ping();
    console.log('✅ Conexão com o banco de dados OK');
    await conn.end();
  } catch (err) {
    console.error('❌ Erro ao conectar no banco de dados:', err.message);
  }
})();

// Rota: signed-url
app.get('/:slug/api/signed-url', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT elevenlabs_voice_id FROM assistentes WHERE slug = ?', [slug]);
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assistente não encontrado' });
    }

    const agentId = rows[0].elevenlabs_voice_id;

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
      method: 'GET',
      headers: { 'xi-api-key': process.env.XI_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Erro na ElevenLabs: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('❌ Erro signed-url:', error.message);
    res.status(500).json({ error: 'Erro ao buscar signed URL' });
  }
});

// Rota: agentId
app.get('/:slug/api/getAgentId', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT elevenlabs_voice_id FROM assistentes WHERE slug = ?', [slug]);
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assistente não encontrado' });
    }

    res.json({ agentId: rows[0].elevenlabs_voice_id });
  } catch (error) {
    console.error('❌ Erro getAgentId:', error.message);
    res.status(500).json({ error: 'Erro ao buscar agentId' });
  }
});

// Rota: dados do assistente
app.get('/api/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT * FROM assistentes WHERE slug = ?', [slug]);
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assistente não encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('❌ Erro dados assistente:', error.message);
    res.status(500).json({ error: 'Erro ao buscar assistente' });
  }
});

// Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});


// Captura erros não tratados
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

// ⬇️ ESSENCIAL no Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
