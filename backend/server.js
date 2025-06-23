const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch'); // se não tiver, instale: npm install node-fetch@2

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../dist')));

// Configuração do banco
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Rota dinâmica para pegar signed-url com slug
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
    const xiApiKey = process.env.XI_API_KEY;

    if (!xiApiKey) {
      return res.status(500).json({ error: 'XI_API_KEY não configurada' });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: { 'xi-api-key': xiApiKey },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get signed URL from ElevenLabs');
    }

    const data = await response.json();

    return res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erro ao buscar signed URL' });
  }
});

// Rota dinâmica para pegar agentId pelo slug
app.get('/:slug/api/getAgentId', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT elevenlabs_voice_id FROM assistentes WHERE slug = ?', [slug]);
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assistente não encontrado' });
    }

    return res.json({ agentId: rows[0].elevenlabs_voice_id });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erro ao buscar agentId' });
  }
});

// Rota para pegar dados do assistente pelo slug
app.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT * FROM assistentes WHERE slug = ?', [slug]);
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assistente não encontrado' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Erro ao buscar assistente' });
  }
});

// Servir index.html para todas as outras rotas que não bateram com as anteriores
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});


app.use((err, req, res, next) => {
  console.error('Erro global:', err);
  res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
});
