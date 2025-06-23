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

// Conexão com o banco de dados
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Rota dinâmica para acessar assistente por slug
app.get('/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        const [rows] = await db.query('SELECT * FROM assistentes WHERE slug = ?', [slug]);

        if (rows.length === 0) {
            return res.status(404).send('Assistente não encontrado');
        }

        const assistente = rows[0];

        // Obter signed URL da ElevenLabs com o voice_id da assistente
        const elevenResponse = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?voice_id=${assistente.elevenlabs_voice_id}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': process.env.XI_API_KEY,
                }
            }
        );

        if (!elevenResponse.ok) {
            throw new Error('Erro ao buscar signed URL');
        }

        const data = await elevenResponse.json();

        // Retorna dados completos do assistente
        res.json({
            nome: assistente.nome,
            descricao: assistente.descricao,
            foto_url: assistente.foto_url,
            background_image: assistente.background_image,
            voice_id: assistente.elevenlabs_voice_id,
            signed_url: data.signed_url
        });

    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: 'Erro interno ao buscar assistente' });
    }
});

// API antiga fixa (fallback)
app.get('/api/signed-url', async (req, res) => {
    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.AGENT_ID}`,
            {
                method: 'GET',
                headers: {
                    'xi-api-key': process.env.XI_API_KEY,
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get signed URL');
        }

        const data = await response.json();
        res.json({ signedUrl: data.signed_url });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get signed URL' });
    }
});

// Retorna o agentId fixo, se necessário
app.get('/api/getAgentId', (req, res) => {
    const agentId = process.env.AGENT_ID;
    res.json({ agentId: `${agentId}` });
});

// Fallback para SPA (index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
