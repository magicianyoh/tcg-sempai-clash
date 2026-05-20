type WikiRequirement = {
    type: string;
    value?: number;
    cardIds?: string[];
    cardType?: string;
    tag?: string;
    description?: string;
};

type WikiEffect = {
    type: string;
    value?: number;
    target?: string;
    description?: string;
};

type WikiCard = {
    id: string;
    name: string;
    type: string;
    archetype: string;
    cost?: number;
    desc?: string;
    description?: string;
    backstory?: string;
    extendedLore?: string;
    image?: string;
    sound?: string;
    maxCopies?: number;
    prereqs?: string[];
    requirements?: WikiRequirement[];
    effects?: WikiEffect[];
    likes?: string[];
    dislikes?: string[];
    tags?: string[];
};

type WikiContent = {
    rules: string;
    modes: string;
    mechanics: string;
};

let cards: WikiCard[] = [];
let selectedCardId = '';
let adminToken = localStorage.getItem('adminToken') || '';
let canEdit = false;
let wikiContent: WikiContent = {
    rules: '',
    modes: '',
    mechanics: '',
};

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function apiBases(): string[] {
    return [window.location.origin];
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    let lastError: Error | null = null;
    for (const base of apiBases()) {
        try {
            const response = await fetch(`${base}${path}`, options);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error((data as any).error || `HTTP ${response.status}`);
            }
            return data as T;
        } catch (error: any) {
            lastError = error;
        }
    }
    throw lastError || new Error('No se pudo conectar con el servidor.');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function parseList(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

function linesToList(value: string): string {
    const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return '<p class="meta">Sin documentacion cargada.</p>';
    return `<ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
}

function asList(items?: string[]): string {
    if (!items || items.length === 0) return '<span class="meta">Sin datos cargados.</span>';
    return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function prettyJson(value: unknown): string {
    const empty = Array.isArray(value) && value.length === 0;
    if (!value || empty) return 'Sin datos cargados.';
    return JSON.stringify(value, null, 2);
}

function loreFor(card: WikiCard): string {
    if (card.extendedLore?.trim()) return card.extendedLore;
    if (card.backstory?.trim()) return card.backstory;
    return `${card.name} todavia no tiene lore extendido cargado desde el admin panel.`;
}

function setMessage(id: string, text: string, error = false): void {
    const el = $(id);
    el.textContent = text;
    el.classList.toggle('error', error);
}

function renderWikiContent(): void {
    $('rules-content').innerHTML = linesToList(wikiContent.rules);
    $('modes-content').innerHTML = linesToList(wikiContent.modes);
    $('mechanics-content').innerHTML = linesToList(wikiContent.mechanics);

    if (canEdit) {
        ($<HTMLTextAreaElement>('edit-rules')).value = wikiContent.rules;
        ($<HTMLTextAreaElement>('edit-modes')).value = wikiContent.modes;
        ($<HTMLTextAreaElement>('edit-mechanics')).value = wikiContent.mechanics;
    }
}

function renderFilters(): void {
    const archetypes = Array.from(new Set(cards.map(card => card.archetype).filter(Boolean))).sort();
    const types = Array.from(new Set(cards.map(card => card.type).filter(Boolean))).sort();

    $('archetype').innerHTML = '<option value="">Todos los arquetipos</option>'
        + archetypes.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    $('type').innerHTML = '<option value="">Todas las categorias</option>'
        + types.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function filteredCards(): WikiCard[] {
    const search = ($<HTMLInputElement>('search')).value.toLowerCase().trim();
    const archetype = ($<HTMLSelectElement>('archetype')).value;
    const type = ($<HTMLSelectElement>('type')).value;

    return cards
        .filter(card => !search
            || card.name.toLowerCase().includes(search)
            || card.id.toLowerCase().includes(search)
            || (card.tags || []).some(tag => tag.toLowerCase().includes(search)))
        .filter(card => !archetype || card.archetype === archetype)
        .filter(card => !type || card.type === type)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function renderCardList(): void {
    const filtered = filteredCards();
    if (!selectedCardId && filtered[0]) selectedCardId = filtered[0].id;

    $('card-list').innerHTML = filtered.map(card => `
        <button class="card-link ${card.id === selectedCardId ? 'active' : ''}" data-id="${escapeHtml(card.id)}" type="button">
            <strong>${escapeHtml(card.name)}</strong>
            <span class="meta">${escapeHtml(card.type)} / ${escapeHtml(card.archetype)} / ${escapeHtml(card.id)}</span>
        </button>
    `).join('');

    document.querySelectorAll<HTMLButtonElement>('#card-list .card-link').forEach(button => {
        button.addEventListener('click', () => {
            selectedCardId = button.dataset.id || '';
            renderCardList();
            renderCardDetail();
        });
    });

    renderCardDetail();
}

function cardReadView(card: WikiCard, image: string): string {
    return `
        <div class="detail-head">
            <div>
                <h2>${escapeHtml(card.name)}</h2>
                <p class="meta">${escapeHtml(card.type)} / ${escapeHtml(card.archetype)} / ${escapeHtml(card.id)}</p>
            </div>
            <span class="cost">Costo ${card.cost ?? 0}</span>
        </div>
        <div class="card-profile">
            ${image}
            <div>
                <h3>Descripcion</h3>
                <p>${escapeHtml(card.description || card.desc || 'Sin descripcion.')}</p>
                <h3>Lore extendido</h3>
                <p>${escapeHtml(loreFor(card))}</p>
                <div class="details-grid">
                    <div>
                        <h3>Likes</h3>
                        ${asList(card.likes)}
                    </div>
                    <div>
                        <h3>Dislikes</h3>
                        ${asList(card.dislikes)}
                    </div>
                    <div>
                        <h3>Tags</h3>
                        ${asList(card.tags)}
                    </div>
                    <div>
                        <h3>Otros datos</h3>
                        <ul>
                            <li>Max copias: ${card.maxCopies ?? 'default'}</li>
                            <li>Sonido: ${escapeHtml(card.sound || 'sin sonido')}</li>
                            <li>Prerequisitos: ${escapeHtml((card.prereqs || []).join(', ') || 'ninguno')}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        <div class="details-grid">
            <div>
                <h3>Requisitos</h3>
                <pre>${escapeHtml(prettyJson(card.requirements || []))}</pre>
            </div>
            <div>
                <h3>Efectos</h3>
                <pre>${escapeHtml(prettyJson(card.effects || []))}</pre>
            </div>
        </div>
    `;
}

function cardEditView(card: WikiCard): string {
    if (!canEdit) return '';
    return `
        <div class="admin-tools" style="margin-top: 14px; padding: 14px; border-radius: 8px;">
            <h3>Editar carta en Wiki</h3>
            <div class="admin-grid">
                <label>Nombre
                    <input id="edit-card-name" value="${escapeHtml(card.name || '')}">
                </label>
                <label>Imagen / asset
                    <input id="edit-card-image" value="${escapeHtml(card.image || '')}">
                </label>
                <label style="grid-column: 1 / -1;">Descripcion
                    <textarea id="edit-card-description">${escapeHtml(card.description || card.desc || '')}</textarea>
                </label>
                <label style="grid-column: 1 / -1;">Lore extendido
                    <textarea id="edit-card-lore">${escapeHtml(loreFor(card))}</textarea>
                </label>
                <label>Likes, separados por coma
                    <textarea id="edit-card-likes">${escapeHtml((card.likes || []).join(', '))}</textarea>
                </label>
                <label>Dislikes, separados por coma
                    <textarea id="edit-card-dislikes">${escapeHtml((card.dislikes || []).join(', '))}</textarea>
                </label>
                <label style="grid-column: 1 / -1;">Tags, separados por coma
                    <input id="edit-card-tags" value="${escapeHtml((card.tags || []).join(', '))}">
                </label>
            </div>
            <div class="actions">
                <button id="save-card-wiki-btn" class="btn primary" type="button">Guardar carta</button>
            </div>
            <p id="card-wiki-message" class="message"></p>
        </div>
    `;
}

function renderCardDetail(): void {
    const card = cards.find(item => item.id === selectedCardId) || filteredCards()[0];
    const detail = $('card-detail');
    if (!card) {
        detail.innerHTML = '<h2>No hay cartas cargadas</h2><p class="meta">El servidor no devolvio catalogo.</p>';
        return;
    }

    const image = card.image && /^(https?:\/\/|\/|data:image\/)/.test(card.image)
        ? `<img class="card-image" src="${card.image}" alt="${escapeHtml(card.name)}">`
        : `<div class="image-placeholder">${escapeHtml(card.image || 'Sin imagen')}</div>`;

    detail.innerHTML = cardReadView(card, image) + cardEditView(card);
    if (canEdit) {
        $('save-card-wiki-btn').addEventListener('click', () => saveCardFromWiki(card.id));
    }
}

function authHeaders(): Record<string, string> {
    return {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
    };
}

async function saveWikiContent(): Promise<void> {
    try {
        const payload: WikiContent = {
            rules: ($<HTMLTextAreaElement>('edit-rules')).value,
            modes: ($<HTMLTextAreaElement>('edit-modes')).value,
            mechanics: ($<HTMLTextAreaElement>('edit-mechanics')).value,
        };
        const data = await apiRequest<{ content: WikiContent }>('/admin/wiki-content', {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        wikiContent = data.content;
        renderWikiContent();
        setMessage('wiki-message', 'Documentacion guardada.');
    } catch (error: any) {
        setMessage('wiki-message', error.message, true);
    }
}

async function saveCardFromWiki(cardId: string): Promise<void> {
    try {
        const payload = {
            name: ($<HTMLInputElement>('edit-card-name')).value,
            image: ($<HTMLInputElement>('edit-card-image')).value,
            description: ($<HTMLTextAreaElement>('edit-card-description')).value,
            extendedLore: ($<HTMLTextAreaElement>('edit-card-lore')).value,
            likes: parseList(($<HTMLTextAreaElement>('edit-card-likes')).value),
            dislikes: parseList(($<HTMLTextAreaElement>('edit-card-dislikes')).value),
            tags: parseList(($<HTMLInputElement>('edit-card-tags')).value),
        };
        const data = await apiRequest<{ card: WikiCard }>(`/admin/cards/${encodeURIComponent(cardId)}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        cards = cards.map(card => card.id === cardId ? { ...card, ...data.card } : card);
        renderCardList();
        setMessage('card-wiki-message', 'Carta guardada.');
    } catch (error: any) {
        setMessage('card-wiki-message', error.message, true);
    }
}

async function detectAdminSession(): Promise<void> {
    if (!adminToken) return;
    try {
        await apiRequest('/admin/wiki-content', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        canEdit = true;
        $('admin-state').textContent = 'Admin: edicion activa';
        $('wiki-admin').hidden = false;
        $('save-wiki-btn').addEventListener('click', saveWikiContent);
    } catch {
        adminToken = '';
        localStorage.removeItem('adminToken');
        canEdit = false;
    }
}

async function loadWikiContent(): Promise<void> {
    const data = await apiRequest<{ content: WikiContent }>('/wiki-content');
    wikiContent = data.content;
    renderWikiContent();
}

async function loadCards(): Promise<void> {
    const detail = $('card-detail');
    detail.innerHTML = '<h2>Cargando cartas...</h2>';

    try {
        const data = await apiRequest<{ cards?: Record<string, WikiCard[]> }>('/cards');
        cards = Object.values(data.cards || {}).flat();
        selectedCardId = cards[0]?.id || '';
        renderFilters();
        renderCardList();
    } catch (error: any) {
        detail.innerHTML = `<h2>No se pudo cargar la Wiki</h2><p class="meta">${escapeHtml(error.message || 'Verifica que la plataforma este corriendo en la misma direccion de red.')}</p>`;
    }
}

['search', 'archetype', 'type'].forEach(id => {
    $(id).addEventListener('input', renderCardList);
    $(id).addEventListener('change', renderCardList);
});

void (async () => {
    await detectAdminSession();
    await Promise.all([loadWikiContent(), loadCards()]);
    renderWikiContent();
})();

export {};
