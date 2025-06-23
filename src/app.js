import { Conversation } from '@11labs/client';

let conversation = null;
let assistenteData = null;

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
    } catch (error) {
        console.error('Microphone permission denied:', error);
        return false;
    }
}

async function fetchAssistenteData(slug) {
    try {
        const response = await fetch(`/api/assistente/${slug}`);
        if (!response.ok) throw new Error('Assistente não encontrado');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao buscar assistente:', error);
        alert('Erro ao carregar assistente. Verifique a URL ou tente novamente.');
        throw error;
    }
}

async function getSignedUrl() {
    if (!assistenteData || !assistenteData.signed_url) {
        throw new Error('Assistente não carregado ou signed_url indisponível');
    }
    return assistenteData.signed_url;
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

    console.log('Speaking status updated:', { mode, isSpeaking });
}

async function startConversation() {
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');

    try {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert('Microphone permission is required for the conversation.');
            return;
        }

        const signedUrl = await getSignedUrl();

        conversation = await Conversation.startSession({
            signedUrl,
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
                updateSpeakingStatus({ mode: 'listening' });
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

function updateUIWithAssistente(data) {
    document.querySelector('h1').textContent = data.nome || 'Assistente';
    document.querySelector('h2').textContent = data.descricao || '';
    document.querySelector('.avatar_image').src = data.foto_url || '';
    if (data.background_image) {
        document.body.style.backgroundImage = `url(${data.background_image})`;
    }
}

async function init() {
    const slug = window.location.pathname.slice(1) || 'lina'; // Default slug
    try {
        assistenteData = await fetchAssistenteData(slug);
        updateUIWithAssistente(assistenteData);
    } catch {
        // Erro tratado no fetch
    }
}

document.getElementById('startButton').addEventListener('click', startConversation);
document.getElementById('endButton').addEventListener('click', endConversation);

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

init();
