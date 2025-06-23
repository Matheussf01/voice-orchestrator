// --- src/app.js ---
import { Conversation } from '@11labs/client';

let conversation = null;

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

async function getSignedUrl(slug) {
    try {
        const response = await fetch(`/${slug}/api/signed-url`);
        if (!response.ok) throw new Error('Failed to get signed URL');
        const data = await response.json();
        return data.signedUrl;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

async function getAgentId(slug) {
    try {
        const response = await fetch(`/${slug}/api/getAgentId`);
        if (!response.ok) throw new Error('Failed to get agent ID');
        const { agentId } = await response.json();
        return agentId;
    } catch (error) {
        console.error('Error getting agent ID:', error);
        throw error;
    }
}

function updateStatus(isConnected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = isConnected ? 'Conectado' : 'Desconectado';
    statusElement.classList.toggle('connected', isConnected);
}

function updateSpeakingStatus(mode) {
    const statusElement = document.getElementById('speakingStatus');
    const pulseBlurElement = document.querySelector('.pulse-blur'); // Seleciona o elemento pulse-blur

    // Verifica se o agente está falando
    const isSpeaking = mode.mode === 'speaking';
    statusElement.textContent = isSpeaking ? 'Agent Speaking' : 'Agent Silent';
    statusElement.classList.toggle('speaking', isSpeaking);

    // Mostra ou oculta a div com a classe pulse-blur
    if (isSpeaking) {
        pulseBlurElement.style.display = 'block'; // Exibe o efeito
    } else {
        pulseBlurElement.style.display = 'none'; // Oculta o efeito
    }

    console.log('Speaking status updated:', { mode, isSpeaking }); // Debug log
}

async function startConversation() {
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');
    
    const slug = window.location.pathname.split("/")[1];

    try {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert('Microphone permission is required for the conversation.');
            return;
        }

        const signedUrl = await getSignedUrl(slug);
        // const agentId = await getAgentId(slug); // Caso queira usar agentId

        conversation = await Conversation.startSession({
            signedUrl: signedUrl,
            // agentId: agentId,
            onConnect: () => {
                console.log('Connected');
                updateStatus(true);
                startButton.disabled = true;
                endButton.disabled = false;
            },
            onDisconnect: () => {
                console.log('Disconnected');
                updateStatus(false);
                startButton.disabled = false;
                endButton.disabled = true;
                updateSpeakingStatus({ mode: 'listening' }); // Reset to listening mode on disconnect
            },
            onError: (error) => {
                console.error('Conversation error:', error);
                alert('An error occurred during the conversation.');
            },
            onModeChange: (mode) => {
                console.log('Mode changed:', mode);
                updateSpeakingStatus(mode);
            }
        });
    } catch (error) {
        console.error('Error starting conversation:', error);
        alert('Failed to start conversation. Please try again.');
    }
}

async function endConversation() {
    if (conversation) {
        await conversation.endSession();
        conversation = null;
    }
}

document.getElementById('startButton').addEventListener('click', startConversation);
document.getElementById('endButton').addEventListener('click', endConversation);

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});



window.addEventListener('DOMContentLoaded', async () => {
  const slug = window.location.pathname.slice(1); // pega tudo depois da barra inicial

  try {
    const res = await fetch(`/api/${slug}`); // chama API nova
    const data = await res.json();

    if (data.error) {
      document.body.innerHTML = "<h2>Assistente não encontrado</h2>";
      return;
    }

    // Atualiza a página com os dados
    document.querySelector("h1").innerText = data.nome;
    document.querySelector("h2").innerText = data.descricao;
    document.querySelector("img").src = data.foto_url;
    document.body.style.backgroundImage = `url(${data.background_image})`;

    window.elevenLabsVoiceId = data.elevenlabs_voice_id;

  } catch (e) {
    console.error(e);
  }
});
