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
const homeNewsList = document.getElementById('home-news-list');
const API_URL = String((import.meta as any).env?.VITE_API_URL || window.location.origin).replace(/\/$/, '');

type HomeNewsItem = {
    id: string;
    title: string;
    body: string;
    dateLabel: string;
    image?: string;
    linkUrl?: string;
    linkLabel?: string;
    featured?: boolean;
};

if (loggedIn) {
    if (matchAction) matchAction.href = '/match.html';
    if (lobbyAction) lobbyAction.href = '/match.html';
    if (roomLink) roomLink.href = '/match.html';
    if (matchActionTitle) matchActionTitle.textContent = 'Find match';
    if (matchActionCopy) matchActionCopy.textContent = 'Quick Match, private lobby, or CPU battle.';
    if (loginNav) loginNav.textContent = 'Matches';
    if (loginNav instanceof HTMLAnchorElement) loginNav.href = '/match.html';
    if (sessionName) sessionName.textContent = username || 'Player';
}

async function updateServerStatus(): Promise<void> {
    if (!serverPill) return;
    try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) throw new Error('offline');
        serverPill.classList.remove('checking', 'offline');
        serverPill.classList.add('online');
        serverPill.textContent = 'Server online';
    } catch {
        serverPill.classList.remove('checking', 'online');
        serverPill.classList.add('offline');
        serverPill.textContent = 'Server offline';
    }
}

function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char] || char));
}

function formatBasicText(value: string): string {
    return escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/\n/g, '<br>');
}

function renderNews(news: HomeNewsItem[]): void {
    if (!homeNewsList) return;
    if (!news.length) {
        homeNewsList.innerHTML = `
            <article class="news-featured">
                <p class="news-date">NEWS</p>
                <h3>No updates yet</h3>
                <p>Check back soon for balance notes and release updates.</p>
            </article>
        `;
        return;
    }

    homeNewsList.innerHTML = news.map((item, index) => {
        const image = item.image ? `<img class="news-image" src="${escapeHtml(item.image)}" alt="">` : '';
        const link = item.linkUrl
            ? `<a class="news-link" href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.linkLabel || 'Read more')}</a>`
            : '';
        const body = `<p>${formatBasicText(item.body || '')}</p>`;
        if (index === 0 || item.featured) {
            return `
                <article class="news-featured">
                    ${image}
                    <p class="news-date">${escapeHtml(item.dateLabel)}</p>
                    <h3>${escapeHtml(item.title)}</h3>
                    ${body}
                    ${link}
                </article>
            `;
        }
        return `
            <article class="news-row">
                <p class="news-date">${escapeHtml(item.dateLabel)}</p>
                <div>
                    <h3>${escapeHtml(item.title)}</h3>
                    ${body}
                    ${link}
                </div>
            </article>
        `;
    }).join('');
}

async function loadHomeNews(): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/home-news`);
        if (!response.ok) throw new Error('news unavailable');
        const data = await response.json() as { news?: HomeNewsItem[] };
        renderNews(data.news || []);
    } catch {
        renderNews([]);
    }
}

void updateServerStatus();
void loadHomeNews();
