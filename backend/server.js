const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configurações do banco de dados
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// Serve os arquivos estáticos da pasta dist (onde seu frontend está)
app.use(express.static(path.join(__dirname, '../dist')));

// ✅ Nova rota API (retorna JSON com os dados do assistente)
app.get('/api/assistente/:slug', async (req, res) => {
  const slug = req.params.slug;
  try {
    const [rows] = await db.query('SELECT * FROM assistentes WHERE slug = ?', [slug]);

    if (rows.length === 0) {
      return res.status(404).send('Assistente não encontrado');
    }

    const assistente = rows[0];

    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${assistente.elevenlabs_voice_id}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.XI_API_KEY,
        }
      }
    );

    if (!elevenResponse.ok) {
      console.error('Erro ao buscar signed URL:', await elevenResponse.text());
      throw new Error('Erro ao buscar signed URL');
    }

    const data = await elevenResponse.json();

    res.json({
      nome: assistente.nome,
      descricao: assistente.descricao,
      foto_url: assistente.foto_url,
      background_image: assistente.background_image,
      voice_id: assistente.elevenlabs_voice_id,
      signed_url: data.signed_url
    });

  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro interno ao buscar assistente' });
  }
});

// ✅ Serve index.html para qualquer slug
app.get('/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
