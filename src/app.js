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

function updateStatus(isConnected) {
  const statusElement = document.getElementById('connectionStatus');
  statusElement.textContent = isConnected ? 'Conectado' : 'Desconectado';
  statusElement.classList.toggle('connected', isConnected);
}

function updateSpeakingStatus(mode) {
  const statusElement = document.getElementById('speakingStatus');
  const pulseBlurElement = document.querySelector('.pulse-blur');
  const isSpeaking = mode.mode === 'speaking';

  statusElement.textContent = isSpeaking ? 'Agent Speaking' : 'Agent Silent';
  statusElement.classList.toggle('speaking', isSpeaking);
  pulseBlurElement.style.display = isSpeaking ? 'block' : 'none';
}

async function startConversation(slug) {
  const startButton = document.getElementById('startButton');
  const endButton = document.getElementById('endButton');

  try {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert('Microphone permission is required.');
      return;
    }

    const signedUrl = await getSignedUrl(slug);

    conversation = await Conversation.startSession({
      signedUrl,
      onConnect: () => {
        updateStatus(true);
        startButton.disabled = true;
        endButton.disabled = false;
      },
      onDisconnect: () => {
        updateStatus(false);
        startButton.disabled = false;
        endButton.disabled = true;
        updateSpeakingStatus({ mode: 'listening' });
      },
      onError: (error) => {
        console.error('Conversation error:', error);
        alert('Erro na conversa.');
      },
      onModeChange: updateSpeakingStatus,
    });
  } catch (error) {
    console.error('Erro ao iniciar:', error);
    alert('Erro ao iniciar conversa.');
  }
}

async function endConversation() {
  if (conversation) {
    await conversation.endSession();
    conversation = null;
  }
}

document.getElementById('startButton').addEventListener('click', () => {
  const slug = window.location.pathname.split('/')[1];
  startConversation(slug);
});
document.getElementById('endButton').addEventListener('click', endConversation);

window.addEventListener('DOMContentLoaded', async () => {
  const slug = window.location.pathname.split('/')[1];

  try {
    const res = await fetch(`/${slug}/data`);
    const data = await res.json();

    if (data.detail === 'Assistente não encontrado') {
      document.body.innerHTML = '<h2>Assistente não encontrado</h2>';
      return;
    }

    document.querySelector('h1').innerText = data.nome;
    document.querySelector('h2').innerText = data.descricao;
    document.querySelector('img').src = data.foto_url;
    document.body.style.backgroundImage = `url(${data.background_image})`;

    window.elevenLabsVoiceId = data.elevenlabs_voice_id;
  } catch (e) {
    console.error('Erro carregando dados do assistente:', e);
  }
});
