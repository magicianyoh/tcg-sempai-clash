import Phaser from 'phaser';
import { phaserConfig } from './phaser/phaser.config';
import { NetworkSystem } from './phaser/systems/NetworkSystem';

// Global Game Instance
let game: Phaser.Game;

// Simple UI Logic for MVP
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username') as HTMLInputElement;
const loginContainer = document.getElementById('login-container');
const lobbyContainer = document.getElementById('lobby-container');
const findMatchBtn = document.getElementById('find-match-btn');

const network = new NetworkSystem();

function getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}

loginBtn?.addEventListener('click', async () => {
    const username = usernameInput.value;
    // Mock Auth for NOW
    console.log('Logging in as', username);
    loginContainer!.style.display = 'none';
    lobbyContainer!.style.display = 'block';

    // Connect WS
    network.connect(getWebSocketUrl());
});

findMatchBtn?.addEventListener('click', () => {
    network.findMatch();
    // Start Phaser Game on Match Found (handled in Network callback usually, but ensuring game start here for demo)
    if (!game) {
        game = new Phaser.Game(phaserConfig);
    }
});

export { network, game };
