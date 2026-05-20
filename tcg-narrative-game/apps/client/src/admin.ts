type AdminCard = {
    id: string;
    name: string;
    type: string;
    archetype: string;
    cost: number;
    description: string;
    desc?: string;
    extendedLore?: string;
    image?: string;
    sound?: string;
    maxCopies?: number;
    requirements?: unknown[];
    effects?: unknown[];
    likes?: string[];
    dislikes?: string[];
    tags?: string[];
};

type AdminUser = {
    id: string;
    username: string;
    activeDeckId?: string;
};

type AdminSettings = Record<string, string>;
type MediaAsset = {
    id: string;
    name: string;
    type: 'image' | 'audio' | 'other';
    mimeType: string;
    dataUrl: string;
    size: number;
    createdAt: number;
};

const API_URL = 'http://localhost:3000';

let token = localStorage.getItem('adminToken') || '';
let cards: AdminCard[] = [];
let users: AdminUser[] = [];
let mediaAssets: MediaAsset[] = [];
let selectedCardId = '';
let pendingMediaTarget = '';
let pendingMediaType: 'image' | 'audio' | 'other' = 'image';

const FX_OPTIONS = [
    'none',
    'spark',
    'lift-glow',
    'cyan-pulse',
    'gold-pulse',
    'arc-burst',
    'screen-flash',
    'desaturate',
    'shake',
    'zoom-pop',
    'ripple',
    'slot-ring',
];

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function authHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
    };
}

function jsonHeaders() {
    return {
        ...authHeaders(),
        'Content-Type': 'application/json',
    };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data as T;
}

function setMessage(id: string, message: string, error = false) {
    const el = $(id);
    el.textContent = message;
    el.classList.toggle('error', error);
}

function showApp() {
    $('login-view').classList.add('hidden');
    $('app-view').classList.remove('hidden');
}

function showLogin() {
    $('login-view').classList.remove('hidden');
    $('app-view').classList.add('hidden');
}

async function login() {
    try {
        const data = await request<{ token: string }>('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: ($<HTMLInputElement>('admin-username')).value,
                password: ($<HTMLInputElement>('admin-password')).value,
            }),
        });
        token = data.token;
        localStorage.setItem('adminToken', token);
        showApp();
        await loadAll();
    } catch (error: any) {
        setMessage('login-message', error.message, true);
    }
}

async function loadAll() {
    hydrateFxDropdowns();
    await Promise.all([loadCards(), loadUsers(), loadSettings(), loadMedia()]);
}

function hydrateFxDropdowns() {
    document.querySelectorAll<HTMLSelectElement>('.fx-select').forEach(select => {
        select.innerHTML = FX_OPTIONS.map(option => `<option value="${option}">${option}</option>`).join('');
    });
}

async function loadCards() {
    const data = await request<{ cards: AdminCard[] }>('/admin/cards', { headers: authHeaders() });
    cards = data.cards;
    selectedCardId ||= cards[0]?.id || '';
    populateFilters();
    renderCards();
    renderSelectedCard();
}

function populateFilters() {
    const types = Array.from(new Set(cards.map(card => card.type))).sort();
    const archetypes = Array.from(new Set(cards.map(card => card.archetype))).sort();
    $('type-filter').innerHTML = '<option value="">Todas</option>' + types.map(type => `<option>${type}</option>`).join('');
    $('archetype-filter').innerHTML = '<option value="">Todos</option>' + archetypes.map(archetype => `<option>${archetype}</option>`).join('');
}

function renderCards() {
    const search = ($<HTMLInputElement>('card-search')).value.toLowerCase();
    const sort = ($<HTMLSelectElement>('card-sort')).value as keyof AdminCard;
    const type = ($<HTMLSelectElement>('type-filter')).value;
    const archetype = ($<HTMLSelectElement>('archetype-filter')).value;

    const filtered = cards
        .filter(card => !search || card.name.toLowerCase().includes(search) || card.id.toLowerCase().includes(search))
        .filter(card => !type || card.type === type)
        .filter(card => !archetype || card.archetype === archetype)
        .sort((a, b) => String(a[sort] || '').localeCompare(String(b[sort] || '')) || a.name.localeCompare(b.name));

    $('card-list').innerHTML = filtered.map(card => `
        <button class="row ${card.id === selectedCardId ? 'active' : ''}" data-id="${card.id}" type="button">
            <strong>${card.name}</strong>
            <span class="meta">${card.type} / ${card.archetype} / ${card.id}</span>
        </button>
    `).join('');

    document.querySelectorAll<HTMLButtonElement>('#card-list .row').forEach(row => {
        row.addEventListener('click', () => {
            selectedCardId = row.dataset.id || '';
            renderCards();
            renderSelectedCard();
        });
    });
}

function renderSelectedCard() {
    const card = cards.find(item => item.id === selectedCardId);
    if (!card) return;

    ($<HTMLInputElement>('card-id')).value = card.id;
    ($<HTMLInputElement>('card-name')).value = card.name || '';
    ($<HTMLInputElement>('card-type')).value = card.type || '';
    ($<HTMLInputElement>('card-archetype')).value = card.archetype || '';
    ($<HTMLInputElement>('card-cost')).value = String(card.cost ?? 0);
    ($<HTMLInputElement>('card-image')).value = card.image || '';
    ($<HTMLInputElement>('card-sound')).value = card.sound || '';
    ($<HTMLInputElement>('card-max')).value = card.maxCopies ? String(card.maxCopies) : '';
    ($<HTMLTextAreaElement>('card-description')).value = card.description || card.desc || '';
    ($<HTMLTextAreaElement>('card-extended-lore')).value = card.extendedLore || '';
    ($<HTMLTextAreaElement>('card-likes')).value = (card.likes || []).join(', ');
    ($<HTMLTextAreaElement>('card-dislikes')).value = (card.dislikes || []).join(', ');
    ($<HTMLTextAreaElement>('card-requirements')).value = JSON.stringify(card.requirements || [], null, 2);
    ($<HTMLTextAreaElement>('card-effects')).value = JSON.stringify(card.effects || [], null, 2);
}

function parseCsvList(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

async function saveCard() {
    const id = ($<HTMLInputElement>('card-id')).value;
    if (!id) return;

    try {
        const requirements = JSON.parse(($<HTMLTextAreaElement>('card-requirements')).value || '[]');
        const effects = JSON.parse(($<HTMLTextAreaElement>('card-effects')).value || '[]');
        const maxCopiesValue = ($<HTMLInputElement>('card-max')).value;

        const data = await request<{ card: AdminCard }>(`/admin/cards/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({
                name: ($<HTMLInputElement>('card-name')).value,
                type: ($<HTMLInputElement>('card-type')).value,
                archetype: ($<HTMLInputElement>('card-archetype')).value,
                cost: Number(($<HTMLInputElement>('card-cost')).value || 0),
                image: ($<HTMLInputElement>('card-image')).value,
                sound: ($<HTMLInputElement>('card-sound')).value,
                maxCopies: maxCopiesValue ? Number(maxCopiesValue) : undefined,
                description: ($<HTMLTextAreaElement>('card-description')).value,
                extendedLore: ($<HTMLTextAreaElement>('card-extended-lore')).value,
                likes: parseCsvList(($<HTMLTextAreaElement>('card-likes')).value),
                dislikes: parseCsvList(($<HTMLTextAreaElement>('card-dislikes')).value),
                requirements,
                effects,
            }),
        });

        cards = cards.map(card => card.id === id ? data.card : card);
        renderCards();
        renderSelectedCard();
        setMessage('card-message', 'Carta guardada.');
    } catch (error: any) {
        setMessage('card-message', error.message, true);
    }
}

async function importCsv() {
    try {
        const csv = ($<HTMLTextAreaElement>('csv-text')).value;
        const data = await request<{ count: number }>('/admin/cards/import', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ csv }),
        });
        setMessage('import-message', `${data.count} cartas importadas.`);
        await loadCards();
    } catch (error: any) {
        setMessage('import-message', error.message, true);
    }
}

async function loadUsers() {
    const data = await request<{ users: AdminUser[] }>('/admin/users', { headers: authHeaders() });
    users = data.users;
    renderUsers();
}

function renderUsers() {
    $('user-list').innerHTML = users.map(user => `
        <div class="row">
            <strong>${user.username}</strong>
            <span class="meta">${user.id} ${user.activeDeckId ? `/ active deck ${user.activeDeckId}` : ''}</span>
            <div class="actions">
                <button class="btn" data-reset="${user.username}" type="button">Reset password</button>
                <button class="btn danger" data-delete="${user.username}" type="button">Eliminar</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button => {
        button.addEventListener('click', () => deleteUser(button.dataset.delete || ''));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-reset]').forEach(button => {
        button.addEventListener('click', () => resetPassword(button.dataset.reset || ''));
    });
}

async function createUser() {
    try {
        await request('/admin/users', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({
                username: ($<HTMLInputElement>('new-user')).value,
                password: ($<HTMLInputElement>('new-password')).value,
            }),
        });
        ($<HTMLInputElement>('new-user')).value = '';
        ($<HTMLInputElement>('new-password')).value = '';
        setMessage('user-message', 'Usuario creado.');
        await loadUsers();
    } catch (error: any) {
        setMessage('user-message', error.message, true);
    }
}

async function deleteUser(username: string) {
    if (!username || !confirm(`Eliminar usuario ${username}?`)) return;
    try {
        await request(`/admin/users/${encodeURIComponent(username)}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        setMessage('user-message', 'Usuario eliminado.');
        await loadUsers();
    } catch (error: any) {
        setMessage('user-message', error.message, true);
    }
}

async function resetPassword(username: string) {
    const password = prompt(`Nueva password para ${username}`);
    if (!password) return;
    try {
        await request(`/admin/users/${encodeURIComponent(username)}`, {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({ password }),
        });
        setMessage('user-message', 'Password actualizada.');
    } catch (error: any) {
        setMessage('user-message', error.message, true);
    }
}

async function loadSettings() {
    const data = await request<{ settings: AdminSettings }>('/admin/ui-settings', { headers: authHeaders() });
    Object.entries(data.settings).forEach(([key, value]) => {
        const input = document.getElementById(key) as HTMLInputElement | HTMLSelectElement | null;
        if (input) input.value = value || '';
    });
}

async function saveSettings() {
    const keys = [
        'victoryImage',
        'victorySound',
        'defeatImage',
        'defeatSound',
        'playCardEffect',
        'playCardSound',
        'phaseAdvanceEffect',
        'phaseAdvanceSound',
        'handHoverEffect',
        'slotIdleEffect',
        'slotValidDropEffect',
        'eventReadyEffect',
        'eventResolveEffect',
        'victoryEffect',
        'defeatEffect',
        'boardBackgroundImage',
        'turnBannerImage',
    ];
    const settings = Object.fromEntries(keys.map(key => [key, ($<HTMLInputElement | HTMLSelectElement>(key)).value]));

    try {
        await request('/admin/ui-settings', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify(settings),
        });
        setMessage('ui-message', 'Settings guardados.');
    } catch (error: any) {
        setMessage('ui-message', error.message, true);
    }
}

async function loadMedia() {
    const data = await request<{ media: MediaAsset[] }>('/admin/media', { headers: authHeaders() });
    mediaAssets = data.media;
    renderMedia();
}

function renderMedia() {
    $('media-list').innerHTML = mediaAssets.map(asset => mediaTile(asset, true)).join('');
    document.querySelectorAll<HTMLButtonElement>('[data-delete-media]').forEach(button => {
        button.addEventListener('click', () => deleteMedia(button.dataset.deleteMedia || ''));
    });
}

function mediaTile(asset: MediaAsset, withDelete = false): string {
    const preview = asset.type === 'image'
        ? `<img src="${asset.dataUrl}" alt="${asset.name}">`
        : `<div class="meta" style="height:76px; display:grid; place-items:center;">${asset.type.toUpperCase()}</div>`;
    return `
        <div class="media-tile" data-media-id="${asset.id}">
            ${preview}
            <strong title="${asset.name}">${asset.name}</strong>
            <span class="meta">${asset.mimeType} / ${Math.round(asset.size / 1024)} KB</span>
            ${withDelete ? `<button class="btn danger" data-delete-media="${asset.id}" type="button">Eliminar</button>` : ''}
        </div>
    `;
}

async function uploadMedia() {
    const files = Array.from(($<HTMLInputElement>('media-files')).files || []);
    if (files.length === 0) {
        setMessage('media-message', 'Selecciona uno o más archivos.', true);
        return;
    }

    const payload = await Promise.all(files.map(async file => ({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'other',
        mimeType: file.type || 'application/octet-stream',
        dataUrl: await readFileAsDataUrl(file),
        size: file.size,
    })));

    try {
        const data = await request<{ count: number }>('/admin/media', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ files: payload }),
        });
        ($<HTMLInputElement>('media-files')).value = '';
        setMessage('media-message', `${data.count} archivo(s) subido(s).`);
        await loadMedia();
    } catch (error: any) {
        setMessage('media-message', error.message, true);
    }
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function deleteMedia(id: string) {
    if (!id || !confirm('Eliminar archivo?')) return;
    try {
        await request(`/admin/media/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        setMessage('media-message', 'Archivo eliminado.');
        await loadMedia();
    } catch (error: any) {
        setMessage('media-message', error.message, true);
    }
}

function openMediaModal(targetId: string, type: 'image' | 'audio' | 'other') {
    pendingMediaTarget = targetId;
    pendingMediaType = type;
    ($('media-modal-title')).textContent = type === 'image' ? 'Seleccionar imagen' : 'Seleccionar audio';
    ($<HTMLInputElement>('media-modal-search')).value = '';
    $('media-modal').classList.add('open');
    renderMediaModal();
}

function renderMediaModal() {
    const search = ($<HTMLInputElement>('media-modal-search')).value.toLowerCase();
    const filtered = mediaAssets
        .filter(asset => asset.type === pendingMediaType)
        .filter(asset => !search || asset.name.toLowerCase().includes(search));

    $('media-modal-grid').innerHTML = filtered.map(asset => mediaTile(asset)).join('');
    document.querySelectorAll<HTMLElement>('#media-modal-grid .media-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const asset = mediaAssets.find(item => item.id === tile.dataset.mediaId);
            if (!asset || !pendingMediaTarget) return;
            ($<HTMLInputElement>(pendingMediaTarget)).value = asset.dataUrl;
            $('media-modal').classList.remove('open');
        });
    });
}

function bindTabs() {
    document.querySelectorAll<HTMLButtonElement>('.tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab[data-tab]').forEach(item => item.classList.remove('active'));
            document.querySelectorAll('.section').forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            $(`${tab.dataset.tab}-section`).classList.add('active');
        });
    });
}

function bindEvents() {
    $('login-btn').addEventListener('click', login);
    $('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        token = '';
        showLogin();
    });
    $('save-card-btn').addEventListener('click', saveCard);
    $('import-btn').addEventListener('click', importCsv);
    $('create-user-btn').addEventListener('click', createUser);
    $('save-ui-btn').addEventListener('click', saveSettings);
    $('upload-media-btn').addEventListener('click', uploadMedia);
    $('close-media-modal').addEventListener('click', () => $('media-modal').classList.remove('open'));
    $('media-modal-search').addEventListener('input', renderMediaModal);
    document.querySelectorAll<HTMLInputElement>('.media-picker').forEach(input => {
        input.addEventListener('click', () => openMediaModal(input.id, (input.dataset.mediaType || 'image') as any));
    });
    ['card-search', 'card-sort', 'type-filter', 'archetype-filter'].forEach(id => {
        $(id).addEventListener('input', renderCards);
        $(id).addEventListener('change', renderCards);
    });
    $('csv-file').addEventListener('change', async event => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            ($<HTMLTextAreaElement>('csv-text')).value = await file.text();
        }
    });
}

bindTabs();
bindEvents();

if (token) {
    showApp();
    loadAll().catch(error => {
        localStorage.removeItem('adminToken');
        token = '';
        showLogin();
        setMessage('login-message', error.message, true);
    });
} else {
    showLogin();
}

export {};
