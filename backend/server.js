const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch'); // npm install node-fetch@2

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '../dist')));

// Configuração do MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// 🔹 Rota para dados do assistente
app.get('/:slug/data', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT * FROM assistentes WHERE slug = ?',
      [slug]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Assistente não encontrado' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar assistente' });
  }
});

// 🔹 Rota para pegar signed URL
app.get('/:slug/api/signed-url', async (req, res) => {
  const { slug } = req.params;

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT elevenlabs_voice_id FROM assistentes WHERE slug = ?',
      [slug]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Assistente não encontrado' });
    }

    const agentId = rows[0].elevenlabs_voice_id;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.XI_API_KEY,
        },
      }
    );

    const data = await response.json();
    return res.json({ signedUrl: data.signed_url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar signed URL' });
  }
});

// 🔹 Fallback: sempre renderiza o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});
