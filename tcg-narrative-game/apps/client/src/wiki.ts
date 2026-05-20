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

const API_URL = 'http://localhost:3000';
let cards: WikiCard[] = [];
let selectedCardId = '';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

    detail.innerHTML = `
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

async function loadCards(): Promise<void> {
    const detail = $('card-detail');
    detail.innerHTML = '<h2>Cargando cartas...</h2>';

    try {
        const response = await fetch(`${API_URL}/cards`);
        const data = await response.json() as { cards?: Record<string, WikiCard[]> };
        cards = Object.values(data.cards || {}).flat();
        selectedCardId = cards[0]?.id || '';
        renderFilters();
        renderCardList();
    } catch (error) {
        detail.innerHTML = '<h2>No se pudo cargar la Wiki</h2><p class="meta">Verifica que el servidor este corriendo en http://localhost:3000.</p>';
    }
}

['search', 'archetype', 'type'].forEach(id => {
    $(id).addEventListener('input', renderCardList);
    $(id).addEventListener('change', renderCardList);
});

void loadCards();

export {};
