const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const loggedIn = Boolean(token && username);

const matchAction = document.getElementById('match-action') as HTMLAnchorElement | null;
const matchActionTitle = document.getElementById('match-action-title');
const matchActionCopy = document.getElementById('match-action-copy');
const lobbyAction = document.getElementById('lobby-action') as HTMLAnchorElement | null;
const roomLink = document.getElementById('room-link') as HTMLAnchorElement | null;
const loginNav = document.getElementById('login-nav');
const sessionName = document.getElementById('session-name');
const serverPill = document.getElementById('server-pill');
const API_URL = String((import.meta as any).env?.VITE_API_URL || window.location.origin).replace(/\/$/, '');

if (loggedIn) {
    if (matchAction) matchAction.href = '/match.html';
    if (lobbyAction) lobbyAction.href = '/match.html';
    if (roomLink) roomLink.href = '/match.html';
    if (matchActionTitle) matchActionTitle.textContent = 'Buscar partida';
    if (matchActionCopy) matchActionCopy.textContent = 'Quick Match, lobby privado o batalla contra CPU.';
    if (loginNav) loginNav.textContent = 'Partidas';
    if (loginNav instanceof HTMLAnchorElement) loginNav.href = '/match.html';
    if (sessionName) sessionName.textContent = username || 'Jugador';
}

async function updateServerStatus(): Promise<void> {
    if (!serverPill) return;
    try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) throw new Error('offline');
        serverPill.classList.remove('checking', 'offline');
        serverPill.classList.add('online');
        serverPill.textContent = 'Servidor online';
    } catch {
        serverPill.classList.remove('checking', 'online');
        serverPill.classList.add('offline');
        serverPill.textContent = 'Servidor sin conexion';
    }
}

void updateServerStatus();
