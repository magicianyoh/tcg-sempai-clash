type AdminCard = {
    id: string;
    name: string;
    type: string;
    archetype: string;
    cost: number;
    costResource?: 'SP' | 'FP';
    description: string;
    desc?: string;
    extendedLore?: string;
    endingTitle?: string;
    endingLore?: string;
    endingImage?: string;
    endingSound?: string;
    image?: string;
    sound?: string;
    maxCopies?: number;
    requirements?: unknown[];
    effects?: unknown[];
    likes?: string[];
    dislikes?: string[];
    tags?: string[];
    protagonistId?: string;
};
type AdminEffect = {
    type: string;
    target?: 'SELF' | 'OPPONENT';
    value?: number;
    cardType?: string;
    cardId?: string;
    turns?: number;
    description?: string;
};
const DECK_SIZE = 20;

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
type PrebuiltDeck = {
    id: string;
    name: string;
    archetypeId: string;
    protagonistId: string;
    protagonistName: string;
    description: string;
    cards: string[];
    customized?: boolean;
};
type PrebuiltDeckSettings = {
    enabled: boolean;
    archetypes: Record<string, boolean>;
    deckOverrides?: Record<string, string[]>;
};
type HomeNewsItem = {
    id: string;
    title: string;
    body: string;
    dateLabel: string;
    image?: string;
    linkUrl?: string;
    linkLabel?: string;
    featured?: boolean;
    createdAt: number;
    updatedAt: number;
};
type CardAuditIssue = {
    severity: 'error' | 'warning';
    cardId: string;
    cardName: string;
    field: string;
    message: string;
};
type CardAuditReport = {
    summary: {
        cards: number;
        errors: number;
        warnings: number;
        incomplete: number;
        brokenReferences: number;
        invalidEffects: number;
    };
    issues: CardAuditIssue[];
};
type CsvValidationIssue = {
    severity: 'error' | 'warning';
    line: number;
    field: string;
    message: string;
};
type CsvValidationReport = {
    valid: boolean;
    count: number;
    errors: CsvValidationIssue[];
    warnings: CsvValidationIssue[];
};

const API_URL = String((import.meta as any).env?.VITE_API_URL || window.location.origin).replace(/\/$/, '');

let token = localStorage.getItem('adminToken') || '';
let cards: AdminCard[] = [];
let users: AdminUser[] = [];
let mediaAssets: MediaAsset[] = [];
let prebuiltDecks: PrebuiltDeck[] = [];
let prebuiltSettings: PrebuiltDeckSettings = { enabled: true, archetypes: {} };
let homeNews: HomeNewsItem[] = [];
let selectedCardId = '';
let selectedPrebuiltDeckId = '';
let selectedNewsId = '';
let prebuiltDeckDraft: string[] = [];
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
        const error = new Error(data.error || `HTTP ${response.status}`);
        Object.assign(error, data);
        throw error;
    }
    return data as T;
}

function setMessage(id: string, message: string, error = false) {
    const el = $(id);
    el.textContent = message;
    el.classList.toggle('error', error);
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

function downloadText(filename: string, text: string, mimeType = 'text/csv;charset=utf-8') {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
    await Promise.all([loadCards(), loadUsers(), loadSettings(), loadMedia(), loadPrebuiltDeckSettings(), loadHomeNews()]);
    await runCardAudit(false);
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
    $('type-filter').innerHTML = '<option value="">Todas</option>' + types.map(type => `<option value="${type}">${displayCardType(type)}</option>`).join('');
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
            <span class="meta">${displayCardType(card.type)} / ${card.archetype} / ${card.id}</span>
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

function displayCardType(type: string): string {
    return type === 'QUICK_EVENT' || type === 'TOKEN' ? 'Quick Event' : type.replace(/_/g, ' ');
}

function renderSelectedCard() {
    const card = cards.find(item => item.id === selectedCardId);
    if (!card) return;
    const supportsLikes = isCharacterLikeType(card.type || '');

    ($<HTMLInputElement>('card-id')).value = card.id;
    ($<HTMLInputElement>('card-name')).value = card.name || '';
    ($<HTMLSelectElement>('card-type')).value = card.type || '';
    ($<HTMLInputElement>('card-archetype')).value = card.archetype || '';
    ($<HTMLInputElement>('card-cost')).value = String(card.cost ?? 0);
    ($<HTMLSelectElement>('card-cost-resource')).value = card.costResource || 'SP';
    ($<HTMLInputElement>('card-image')).value = card.image || '';
    ($<HTMLInputElement>('card-sound')).value = card.sound || '';
    ($<HTMLInputElement>('card-ending-title')).value = card.endingTitle || '';
    ($<HTMLInputElement>('card-ending-image')).value = card.endingImage || '';
    ($<HTMLInputElement>('card-ending-sound')).value = card.endingSound || '';
    ($<HTMLInputElement>('card-max')).value = card.maxCopies ? String(card.maxCopies) : '';
    ($<HTMLTextAreaElement>('card-description')).value = card.description || card.desc || '';
    ($<HTMLTextAreaElement>('card-extended-lore')).value = card.extendedLore || '';
    ($<HTMLTextAreaElement>('card-ending-lore')).value = card.endingLore || '';
    ($<HTMLElement>('card-likes-label')).style.display = supportsLikes ? '' : 'none';
    ($<HTMLElement>('card-dislikes-label')).style.display = supportsLikes ? '' : 'none';
    ($<HTMLTextAreaElement>('card-likes')).value = supportsLikes ? (card.likes || []).join(', ') : '';
    ($<HTMLTextAreaElement>('card-dislikes')).value = supportsLikes ? (card.dislikes || []).join(', ') : '';
    ($<HTMLTextAreaElement>('card-requirements')).value = formatRequirementsText(card.requirements || []);
    ($<HTMLTextAreaElement>('card-effects')).value = JSON.stringify(card.effects || [], null, 2);
    renderEffectList();
}

function isCharacterLikeType(type: string): boolean {
    return ['PROTAGONIST', 'PERSONAJE', 'CHARACTER', 'UNIT'].includes(type);
}

function parseCsvList(value: string): string[] {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

function parseEffectsFromEditor(): AdminEffect[] {
    try {
        const parsed = JSON.parse(($<HTMLTextAreaElement>('card-effects')).value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function cardName(id: string): string {
    return cards.find(card => card.id === id)?.name || id;
}

function parseRequirementsText(value: string): unknown[] {
    const raw = value.trim();
    if (!raw) return [];
    if (raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    return raw
        .split(/[\n,]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => {
            const story = item.match(/^SP\s*>=\s*(\d+)$/i);
            if (story) return { type: 'STORY_MIN', value: Number(story[1]), description: `Requiere ${story[1]} SP.` };
            const filler = item.match(/^FP\s*<=\s*(\d+)$/i);
            if (filler) return { type: 'FILLER_MAX', value: Number(filler[1]), description: `FP maximo ${filler[1]}.` };
            const fillerMinimum = item.match(/^FP\s*>=\s*(\d+)$/i);
            if (fillerMinimum) return { type: 'FILLER_MIN', value: Number(fillerMinimum[1]), description: `Requiere ${fillerMinimum[1]} FP.` };
            const eventCount = item.match(/^EVENTOS\s*>=\s*(\d+)$/i);
            if (eventCount) return { type: 'EVENT_COUNT_MIN', value: Number(eventCount[1]), description: `Requiere haber completado ${eventCount[1]} Evento(s).` };
            const historicalCardType = item.match(/^ARCO_PREVIO\s+(PERSONAJE|ITEM|LOCATION|QUICK_EVENT)$/i);
            if (historicalCardType) return { type: 'CARD_IN_COMPLETED_ARC', cardType: historicalCardType[1].toUpperCase(), value: 1, description: `Requiere ${historicalCardType[1]} en un arco previo.` };
            const discard = item.match(/^DESCARTAR\s+(\d+)$/i);
            if (discard) return { type: 'DISCARD_FROM_HAND', value: Number(discard[1]), description: `Descarta ${discard[1]} carta(s) de la mano.` };
            const boardCards = item.match(/^CAMPO\s+(\d+)\s*:\s*(.+)$/i);
            if (boardCards) {
                const cardIds = boardCards[2].split(/\s*\|\s*/).filter(Boolean);
                return {
                    type: 'CARD_ON_BOARD',
                    cardIds,
                    value: Number(boardCards[1]),
                    description: `Requiere ${boardCards[1]} material(es) valido(s) de la ruta en el arco actual.`,
                };
            }
            return { type: 'CARD_ON_BOARD', cardIds: [item], value: 1, description: `Requiere ${cardName(item)} en campo.` };
        });
}

function formatRequirementsText(requirements: unknown[] = []): string {
    return requirements.map((requirement: any) => {
        if (requirement?.type === 'STORY_MIN') return `SP>=${requirement.value || 0}`;
        if (requirement?.type === 'FILLER_MAX') return `FP<=${requirement.value || 0}`;
        if (requirement?.type === 'FILLER_MIN') return `FP>=${requirement.value || 0}`;
        if (requirement?.type === 'EVENT_COUNT_MIN') return `EVENTOS>=${requirement.value || 1}`;
        if (requirement?.type === 'CARD_IN_COMPLETED_ARC' && requirement.cardType) return `ARCO_PREVIO ${requirement.cardType}`;
        if (requirement?.type === 'DISCARD_FROM_HAND') return `DESCARTAR ${requirement.value || 1}`;
        if (requirement?.type === 'CARD_ON_BOARD' && Array.isArray(requirement.cardIds)) return `CAMPO ${requirement.value || 1}: ${requirement.cardIds.join(' | ')}`;
        return JSON.stringify(requirement);
    }).join('\n');
}

function writeEffectsToEditor(effects: AdminEffect[]) {
    ($<HTMLTextAreaElement>('card-effects')).value = JSON.stringify(effects, null, 2);
    renderEffectList();
}

function renderEffectList() {
    const effects = parseEffectsFromEditor();
    $('effect-list').innerHTML = effects.map((effect, index) => `
        <div class="row">
            <strong>${displayCardType(effect.type)}</strong>
            <span class="meta">${effect.target || 'SELF'}${effect.value !== undefined ? ` / valor ${effect.value}` : ''}${effect.cardType ? ` / tipo ${displayCardType(effect.cardType)}` : ''}${effect.cardId ? ` / carta ${effect.cardId}` : ''}${effect.turns ? ` / ${effect.turns} turno(s)` : ''}</span>
            <span class="meta">${effect.description || ''}</span>
            <button class="btn danger" data-remove-effect="${index}" type="button">Quitar</button>
        </div>
    `).join('');

    document.querySelectorAll<HTMLButtonElement>('[data-remove-effect]').forEach(button => {
        button.addEventListener('click', () => {
            const index = Number(button.dataset.removeEffect);
            const next = parseEffectsFromEditor();
            next.splice(index, 1);
            writeEffectsToEditor(next);
        });
    });
}

function addEffectFromControls() {
    const effect: AdminEffect = {
        type: ($<HTMLSelectElement>('effect-type')).value,
        target: ($<HTMLSelectElement>('effect-target')).value as 'SELF' | 'OPPONENT',
    };
    const value = ($<HTMLInputElement>('effect-value')).value;
    const cardType = ($<HTMLSelectElement>('effect-card-type')).value;
    const cardId = ($<HTMLInputElement>('effect-card-id')).value.trim();
    const turns = ($<HTMLInputElement>('effect-turns')).value;
    const description = ($<HTMLInputElement>('effect-description')).value.trim();

    if (value !== '') effect.value = Number(value);
    if (cardType) effect.cardType = cardType;
    if (cardId) effect.cardId = cardId;
    if (turns !== '') effect.turns = Number(turns);
    if (description) effect.description = description;

    writeEffectsToEditor([...parseEffectsFromEditor(), effect]);
}

function selectedCard(): AdminCard | undefined {
    return cards.find(card => card.id === selectedCardId);
}

function setupCardReferenceAutocomplete(textareaId: string) {
    const textarea = $<HTMLTextAreaElement | HTMLInputElement>(textareaId);
    const menu = $('card-suggestions');

    textarea.addEventListener('input', () => {
        const beforeCursor = textarea.value.slice(0, textarea.selectionStart || 0);
        if (!beforeCursor.endsWith(':')) {
            menu.classList.remove('open');
            return;
        }

        const card = selectedCard();
        const options = cards
            .filter(item => item.archetype === card?.archetype && item.id !== card?.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 16);

        const rect = textarea.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${Math.min(window.innerHeight - 230, rect.bottom + 6)}px`;
        menu.innerHTML = options.map(option => `
            <button type="button" data-card-ref="${option.id}">
                <strong>${option.name}</strong><br>
                <span class="meta">${option.type} / ${option.id}</span>
            </button>
        `).join('');
        menu.classList.add('open');

        menu.querySelectorAll<HTMLButtonElement>('[data-card-ref]').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.dataset.cardRef || '';
                const start = textarea.selectionStart || textarea.value.length;
                textarea.value = textarea.value.slice(0, start - 1) + id + ', ' + textarea.value.slice(start);
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + id.length + 1;
                menu.classList.remove('open');
            });
        });
    });

    textarea.addEventListener('blur', () => {
        setTimeout(() => menu.classList.remove('open'), 160);
    });
}

async function saveCard() {
    const id = ($<HTMLInputElement>('card-id')).value;
    if (!id) return;

    try {
        const requirements = parseRequirementsText(($<HTMLTextAreaElement>('card-requirements')).value);
        const effects = JSON.parse(($<HTMLTextAreaElement>('card-effects')).value || '[]');
        const maxCopiesValue = ($<HTMLInputElement>('card-max')).value;
        const cardType = ($<HTMLSelectElement>('card-type')).value;
        const supportsLikes = isCharacterLikeType(cardType);

        const data = await request<{ card: AdminCard }>(`/admin/cards/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({
                name: ($<HTMLInputElement>('card-name')).value,
                type: cardType,
                archetype: ($<HTMLInputElement>('card-archetype')).value,
                cost: Number(($<HTMLInputElement>('card-cost')).value || 0),
                costResource: ($<HTMLSelectElement>('card-cost-resource')).value as 'SP' | 'FP',
                image: ($<HTMLInputElement>('card-image')).value,
                sound: ($<HTMLInputElement>('card-sound')).value,
                endingTitle: ($<HTMLInputElement>('card-ending-title')).value,
                endingImage: ($<HTMLInputElement>('card-ending-image')).value,
                endingSound: ($<HTMLInputElement>('card-ending-sound')).value,
                maxCopies: maxCopiesValue ? Number(maxCopiesValue) : undefined,
                description: ($<HTMLTextAreaElement>('card-description')).value,
                extendedLore: ($<HTMLTextAreaElement>('card-extended-lore')).value,
                endingLore: ($<HTMLTextAreaElement>('card-ending-lore')).value,
                likes: supportsLikes ? parseCsvList(($<HTMLTextAreaElement>('card-likes')).value) : [],
                dislikes: supportsLikes ? parseCsvList(($<HTMLTextAreaElement>('card-dislikes')).value) : [],
                requirements,
                effects,
            }),
        });

        cards = cards.map(card => card.id === id ? data.card : card);
        renderCards();
        renderSelectedCard();
        setMessage('card-message', 'Carta guardada.');
        await runCardAudit(false);
    } catch (error: any) {
        setMessage('card-message', error.message, true);
    }
}

function renderCsvValidation(validation: CsvValidationReport) {
    const box = $('csv-validation');
    box.classList.toggle('error', !validation.valid);
    const issues = [...validation.errors, ...validation.warnings].slice(0, 40);
    const status = validation.valid
        ? `CSV valido: ${validation.count} fila(s) listas para importar.`
        : `CSV con ${validation.errors.length} error(es) y ${validation.warnings.length} advertencia(s).`;
    box.innerHTML = `
        <strong>${status}</strong>
        ${issues.length ? `<ul>${issues.map(issue => `<li>Linea ${issue.line} / ${issue.field}: ${issue.message}</li>`).join('')}</ul>` : ''}
    `;
}

async function validateCsvImport(): Promise<CsvValidationReport | null> {
    try {
        const csv = ($<HTMLTextAreaElement>('csv-text')).value;
        const kind = ($<HTMLSelectElement>('csv-kind')).value;
        const data = await request<{ validation: CsvValidationReport }>('/admin/cards/validate-import', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ csv, kind }),
        });
        renderCsvValidation(data.validation);
        setMessage('import-message', data.validation.valid ? 'Validacion correcta.' : 'Validacion con errores.', !data.validation.valid);
        return data.validation;
    } catch (error: any) {
        setMessage('import-message', error.message, true);
        return null;
    }
}

async function importCsv() {
    try {
        const validation = await validateCsvImport();
        if (!validation?.valid) return;
        const csv = ($<HTMLTextAreaElement>('csv-text')).value;
        const data = await request<{ count: number; audit?: CardAuditReport }>('/admin/cards/import', {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ csv, kind: ($<HTMLSelectElement>('csv-kind')).value }),
        });
        setMessage('import-message', `${data.count} fila(s) importadas.`);
        await Promise.all([loadCards(), loadPrebuiltDeckSettings()]);
        if (data.audit) renderAudit(data.audit);
    } catch (error: any) {
        if (error.validation) renderCsvValidation(error.validation);
        setMessage('import-message', error.message, true);
    }
}

async function downloadCsvTemplate(kind: 'cards' | 'archetypes', blank = false) {
    try {
        const suffix = blank ? '?blank=true' : '';
        const data = await request<{ filename: string; csv: string }>(`/admin/csv/templates/${kind}${suffix}`, { headers: authHeaders() });
        downloadText(data.filename, data.csv);
        setMessage('import-message', 'Plantilla exportada.');
    } catch (error: any) {
        setMessage('import-message', error.message, true);
    }
}

async function runCardAudit(showMessage = true) {
    try {
        const data = await request<{ audit: CardAuditReport }>('/admin/cards/audit', { headers: authHeaders() });
        renderAudit(data.audit);
        if (showMessage) setMessage('audit-message', 'Auditoria actualizada.');
    } catch (error: any) {
        if (showMessage) setMessage('audit-message', error.message, true);
    }
}

function renderAudit(audit: CardAuditReport) {
    const summary = audit.summary;
    $('audit-summary').innerHTML = [
        ['Cartas', summary.cards],
        ['Errores', summary.errors],
        ['Advertencias', summary.warnings],
        ['Incompletas', summary.incomplete],
        ['Refs rotas', summary.brokenReferences],
        ['FX invalidos', summary.invalidEffects],
    ].map(([label, value]) => `
        <div class="audit-stat">
            <strong>${value}</strong>
            <span class="meta">${label}</span>
        </div>
    `).join('');

    const issues = audit.issues.slice(0, 120);
    $('audit-list').innerHTML = issues.length
        ? issues.map(issue => `
            <button class="row audit-issue ${issue.severity}" data-audit-card="${issue.cardId}" type="button">
                <strong>${issue.severity.toUpperCase()} / ${issue.cardName}</strong>
                <span class="meta">${issue.field} / ${issue.cardId}</span>
                <span>${issue.message}</span>
            </button>
        `).join('')
        : '<div class="row"><strong>Catalogo sin problemas bloqueantes.</strong><span class="meta">No hay errores ni advertencias visibles.</span></div>';

    document.querySelectorAll<HTMLButtonElement>('[data-audit-card]').forEach(button => {
        button.addEventListener('click', () => {
            selectedCardId = button.dataset.auditCard || selectedCardId;
            document.querySelector<HTMLButtonElement>('.tab[data-tab="cards"]')?.click();
            renderCards();
            renderSelectedCard();
        });
    });
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

async function loadHomeNews() {
    const data = await request<{ news: HomeNewsItem[] }>('/admin/home-news', { headers: authHeaders() });
    homeNews = data.news || [];
    selectedNewsId ||= homeNews[0]?.id || '';
    renderHomeNewsList();
    renderSelectedNews();
}

function clearNewsForm() {
    selectedNewsId = '';
    ($<HTMLInputElement>('news-id')).value = '';
    ($<HTMLInputElement>('news-title-input')).value = '';
    ($<HTMLInputElement>('news-date-label')).value = '';
    ($<HTMLInputElement>('news-featured')).checked = false;
    ($<HTMLTextAreaElement>('news-body')).value = '';
    renderHomeNewsList();
}

function renderHomeNewsList() {
    $('news-list').innerHTML = homeNews.map(item => `
        <button class="row ${item.id === selectedNewsId ? 'active' : ''}" data-news-id="${item.id}" type="button">
            <strong>${escapeHtml(item.title)}${item.featured ? ' (featured)' : ''}</strong>
            <span class="meta">${escapeHtml(item.dateLabel)} / ${escapeHtml(item.id)}</span>
        </button>
    `).join('') || '<p class="meta">No news items yet.</p>';

    document.querySelectorAll<HTMLButtonElement>('[data-news-id]').forEach(button => {
        button.addEventListener('click', () => {
            selectedNewsId = button.dataset.newsId || '';
            renderHomeNewsList();
            renderSelectedNews();
        });
    });
}

function renderSelectedNews() {
    const item = homeNews.find(news => news.id === selectedNewsId);
    if (!item) {
        clearNewsForm();
        return;
    }
    ($<HTMLInputElement>('news-id')).value = item.id;
    ($<HTMLInputElement>('news-title-input')).value = item.title || '';
    ($<HTMLInputElement>('news-date-label')).value = item.dateLabel || '';
    ($<HTMLInputElement>('news-featured')).checked = Boolean(item.featured);
    ($<HTMLTextAreaElement>('news-body')).value = item.body || '';
}

function insertIntoTextarea(textareaId: string, value: string, selectOffset = value.length): void {
    const textarea = $<HTMLTextAreaElement>(textareaId);
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    textarea.value = `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`;
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + selectOffset;
}

function wrapTextareaSelection(textareaId: string, prefix: string, suffix: string, fallback: string): void {
    const textarea = $<HTMLTextAreaElement>(textareaId);
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const selected = textarea.value.slice(start, end) || fallback;
    textarea.value = `${textarea.value.slice(0, start)}${prefix}${selected}${suffix}${textarea.value.slice(end)}`;
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + selected.length;
}

function formatNewsBody(action: string): void {
    if (action === 'bold') return wrapTextareaSelection('news-body', '**', '**', 'bold text');
    if (action === 'italic') return wrapTextareaSelection('news-body', '*', '*', 'italic text');
    if (action === 'underline') return wrapTextareaSelection('news-body', '__', '__', 'underlined text');
    if (action === 'bullet') return insertIntoTextarea('news-body', '\n- First point\n- Second point\n');
    if (action === 'numbered') return insertIntoTextarea('news-body', '\n1. First point\n2. Second point\n');
    if (action === 'link') {
        const label = prompt('Link text') || 'link text';
        const url = prompt('URL') || 'https://';
        return insertIntoTextarea('news-body', `[${label}](${url})`);
    }
    if (action === 'image') {
        openMediaModal('news-body-image', 'image');
    }
}

async function saveHomeNews() {
    const payload = {
        title: ($<HTMLInputElement>('news-title-input')).value,
        body: ($<HTMLTextAreaElement>('news-body')).value,
        dateLabel: ($<HTMLInputElement>('news-date-label')).value,
        featured: ($<HTMLInputElement>('news-featured')).checked,
    };

    try {
        const path = selectedNewsId ? `/admin/home-news/${encodeURIComponent(selectedNewsId)}` : '/admin/home-news';
        const method = selectedNewsId ? 'PUT' : 'POST';
        const data = await request<{ newsItem: HomeNewsItem }>(path, {
            method,
            headers: jsonHeaders(),
            body: JSON.stringify(payload),
        });
        selectedNewsId = data.newsItem.id;
        setMessage('news-message', 'News item saved.');
        await loadHomeNews();
    } catch (error: any) {
        setMessage('news-message', error.message, true);
    }
}

async function deleteHomeNews() {
    if (!selectedNewsId || !confirm('Delete this news item?')) return;
    try {
        await request(`/admin/home-news/${encodeURIComponent(selectedNewsId)}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        selectedNewsId = '';
        setMessage('news-message', 'News item deleted.');
        await loadHomeNews();
    } catch (error: any) {
        setMessage('news-message', error.message, true);
    }
}

async function loadPrebuiltDeckSettings() {
    const data = await request<{ settings: PrebuiltDeckSettings; decks: PrebuiltDeck[] }>('/admin/prebuilt-decks/settings', { headers: authHeaders() });
    prebuiltSettings = data.settings || { enabled: true, archetypes: {}, deckOverrides: {} };
    prebuiltDecks = data.decks || [];
    selectedPrebuiltDeckId ||= prebuiltDecks[0]?.id || '';
    const selected = prebuiltDecks.find(deck => deck.id === selectedPrebuiltDeckId) || prebuiltDecks[0];
    selectedPrebuiltDeckId = selected?.id || '';
    prebuiltDeckDraft = selected ? [...selected.cards] : [];
    renderPrebuiltDeckSettings();
}

function renderPrebuiltDeckSettings() {
    ($<HTMLInputElement>('prebuilt-enabled')).checked = prebuiltSettings.enabled !== false;

    const archetypes = Array.from(new Set(prebuiltDecks.map(deck => deck.archetypeId))).sort();
    $('prebuilt-archetypes').innerHTML = archetypes.map(archetype => {
        const enabled = prebuiltSettings.archetypes[archetype] !== false;
        const count = prebuiltDecks.filter(deck => deck.archetypeId === archetype).length;
        return `
            <label class="switch-row">
                <div>
                    <strong>${archetype}</strong>
                    <div class="meta">${count} plantilla(s) por protagonista</div>
                </div>
                <input class="prebuilt-archetype-toggle" data-archetype="${archetype}" type="checkbox" ${enabled ? 'checked' : ''}>
            </label>
        `;
    }).join('');

    $('prebuilt-preview').innerHTML = prebuiltDecks.map(deck => `
        <button class="row ${deck.id === selectedPrebuiltDeckId ? 'active' : ''}" data-edit-prebuilt="${deck.id}" type="button">
            <strong>${deck.name}${deck.customized ? ' (editado)' : ''}</strong>
            <span class="meta">${deck.archetypeId} / ${deck.cards.length} cartas / protagonista: ${deck.protagonistName}</span>
            <span class="meta">${deck.description}</span>
        </button>
    `).join('');

    $('prebuilt-editor-select').innerHTML = prebuiltDecks.map(deck => `
        <option value="${deck.id}" ${deck.id === selectedPrebuiltDeckId ? 'selected' : ''}>${deck.name}${deck.customized ? ' (editado)' : ''}</option>
    `).join('');

    document.querySelectorAll<HTMLButtonElement>('[data-edit-prebuilt]').forEach(button => {
        button.addEventListener('click', () => selectPrebuiltDeck(button.dataset.editPrebuilt || ''));
    });
    renderPrebuiltDeckEditor();
}

async function savePrebuiltDeckSettings() {
    const archetypes: Record<string, boolean> = {};
    document.querySelectorAll<HTMLInputElement>('.prebuilt-archetype-toggle').forEach(input => {
        const archetype = input.dataset.archetype;
        if (archetype) archetypes[archetype] = input.checked;
    });

    try {
        const data = await request<{ settings: PrebuiltDeckSettings }>('/admin/prebuilt-decks/settings', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({
                enabled: ($<HTMLInputElement>('prebuilt-enabled')).checked,
                archetypes,
                deckOverrides: prebuiltSettings.deckOverrides || {},
            }),
        });
        prebuiltSettings = data.settings;
        setMessage('prebuilt-message', 'Decks pre-armados guardados.');
        renderPrebuiltDeckSettings();
    } catch (error: any) {
        setMessage('prebuilt-message', error.message, true);
    }
}

function selectPrebuiltDeck(deckId: string) {
    const deck = prebuiltDecks.find(item => item.id === deckId);
    if (!deck) return;
    selectedPrebuiltDeckId = deck.id;
    prebuiltDeckDraft = [...deck.cards];
    renderPrebuiltDeckSettings();
}

function selectedPrebuiltDeck(): PrebuiltDeck | undefined {
    return prebuiltDecks.find(deck => deck.id === selectedPrebuiltDeckId);
}

function cardById(id: string): AdminCard | undefined {
    return cards.find(card => card.id === id);
}

function addCardToPrebuiltDraft(cardId: string) {
    const card = cardById(cardId);
    const deck = selectedPrebuiltDeck();
    if (!card || !deck || card.archetype !== deck.archetypeId) return;
    const count = prebuiltDeckDraft.filter(id => id === cardId).length;
    const max = card.maxCopies ?? 3;
    if (prebuiltDeckDraft.length >= DECK_SIZE || count >= max) return;
    prebuiltDeckDraft.push(cardId);
    renderPrebuiltDeckEditor();
}

function eligiblePrebuiltCards(): AdminCard[] {
    const deck = selectedPrebuiltDeck();
    if (!deck) return [];
    return cards
        .filter(card => card.archetype === deck.archetypeId)
        .filter(card => !['PROTAGONIST', 'PLOT_TWIST_EVENT'].includes(card.type))
        .filter(card => !card.tags?.includes('avatar-only') && !card.tags?.includes('response-only'))
        .filter(card => !card.tags?.includes('climax-only') || card.protagonistId === deck.protagonistId)
        .filter(card => !card.protagonistId || card.protagonistId === deck.protagonistId)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function findPrebuiltCardToken(token: string): AdminCard | undefined {
    const normalized = token.trim().toLowerCase();
    if (!normalized) return undefined;
    return eligiblePrebuiltCards().find(card =>
        card.id.toLowerCase() === normalized || card.name.toLowerCase() === normalized
    );
}

function addTypedCardsToPrebuiltDraft() {
    const input = $<HTMLTextAreaElement>('prebuilt-add-card-input');
    if (prebuiltDeckDraft.length >= DECK_SIZE) {
        setMessage('prebuilt-message', 'Deck already has 20 cards.');
        return;
    }

    const tokens = input.value
        .split(/[\n,]+/)
        .map(value => value.trim())
        .filter(Boolean);
    let added = 0;
    for (const token of tokens) {
        if (prebuiltDeckDraft.length >= DECK_SIZE) break;
        const card = findPrebuiltCardToken(token);
        if (!card) continue;
        const count = prebuiltDeckDraft.filter(id => id === card.id).length;
        const max = card.maxCopies ?? 3;
        if (count >= max) continue;
        prebuiltDeckDraft.push(card.id);
        added++;
    }

    input.value = '';
    renderPrebuiltDeckEditor();
    setMessage('prebuilt-message', added ? `${added} card(s) added.` : 'No valid card was added.', !added);
}

function setupPrebuiltAddAutocomplete() {
    const textarea = $<HTMLTextAreaElement>('prebuilt-add-card-input');
    const menu = $('card-suggestions');

    textarea.addEventListener('input', () => {
        const beforeCursor = textarea.value.slice(0, textarea.selectionStart || 0);
        if (!beforeCursor.endsWith(':')) {
            menu.classList.remove('open');
            return;
        }

        const options = eligiblePrebuiltCards().slice(0, 20);
        const rect = textarea.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${Math.min(window.innerHeight - 230, rect.bottom + 6)}px`;
        menu.innerHTML = options.map(option => `
            <button type="button" data-prebuilt-card-ref="${option.id}">
                <strong>${option.name}</strong><br>
                <span class="meta">${displayCardType(option.type)} / ${option.id}</span>
            </button>
        `).join('');
        menu.classList.add('open');

        menu.querySelectorAll<HTMLButtonElement>('[data-prebuilt-card-ref]').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.dataset.prebuiltCardRef || '';
                const start = textarea.selectionStart || textarea.value.length;
                textarea.value = textarea.value.slice(0, start - 1) + id + ', ' + textarea.value.slice(start);
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + id.length + 1;
                menu.classList.remove('open');
            });
        });
    });

    textarea.addEventListener('blur', () => {
        setTimeout(() => menu.classList.remove('open'), 160);
    });
}

function setPrebuiltDraftCount(cardId: string, count: number) {
    const card = cardById(cardId);
    if (!card) return;
    const max = card.maxCopies ?? 3;
    const safeCount = Math.max(0, Math.min(max, count));
    const withoutCard = prebuiltDeckDraft.filter(id => id !== cardId);
    prebuiltDeckDraft = [...withoutCard, ...Array.from({ length: safeCount }, () => cardId)].slice(0, DECK_SIZE);
    renderPrebuiltDeckEditor();
}

function removeCardFromPrebuiltDraft(index: number) {
    prebuiltDeckDraft.splice(index, 1);
    renderPrebuiltDeckEditor();
}

function renderPrebuiltDeckEditor() {
    const deck = selectedPrebuiltDeck();
    if (!deck) {
        $('prebuilt-deck-list').innerHTML = '';
        $('prebuilt-deck-count').textContent = `0/${DECK_SIZE}`;
        return;
    }

    const grouped = new Map<string, number[]>();
    prebuiltDeckDraft.forEach((id, index) => {
        if (!grouped.has(id)) grouped.set(id, []);
        grouped.get(id)?.push(index);
    });
    $('prebuilt-deck-count').textContent = `${prebuiltDeckDraft.length}/${DECK_SIZE}`;
    $('prebuilt-deck-list').innerHTML = Array.from(grouped.entries()).map(([id, indices]) => {
        const card = cardById(id);
        const lastIndex = indices[indices.length - 1];
        return `
            <div class="row deck-edit-card">
                <div>
                    <strong>${indices.length}x ${escapeHtml(card?.name || id)}</strong>
                    <span class="meta">${displayCardType(card?.type || '')} / ${id}</span>
                </div>
                <div class="actions" style="margin-top:0;">
                    <button class="btn" data-prebuilt-minus="${id}" type="button">-</button>
                    <input data-prebuilt-count="${id}" type="number" min="0" max="${card?.maxCopies ?? 3}" value="${indices.length}" style="width:70px; text-align:center;">
                    <button class="btn" data-prebuilt-plus="${id}" type="button">+</button>
                </div>
                <button class="btn danger" data-remove-prebuilt-index="${lastIndex}" type="button">Quitar</button>
            </div>
        `;
    }).join('');

    document.querySelectorAll<HTMLButtonElement>('[data-remove-prebuilt-index]').forEach(button => {
        button.addEventListener('click', () => removeCardFromPrebuiltDraft(Number(button.dataset.removePrebuiltIndex)));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-prebuilt-minus]').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.prebuiltMinus || '';
            setPrebuiltDraftCount(id, prebuiltDeckDraft.filter(cardId => cardId === id).length - 1);
        });
    });
    document.querySelectorAll<HTMLButtonElement>('[data-prebuilt-plus]').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.prebuiltPlus || '';
            setPrebuiltDraftCount(id, prebuiltDeckDraft.filter(cardId => cardId === id).length + 1);
        });
    });
    document.querySelectorAll<HTMLInputElement>('[data-prebuilt-count]').forEach(input => {
        input.addEventListener('change', () => setPrebuiltDraftCount(input.dataset.prebuiltCount || '', Number(input.value || 0)));
    });
}

async function saveSelectedPrebuiltDeck() {
    if (!selectedPrebuiltDeckId) return;
    try {
        const nextOverrides = {
            ...(prebuiltSettings.deckOverrides || {}),
            [selectedPrebuiltDeckId]: [...prebuiltDeckDraft],
        };
        const data = await request<{ settings: PrebuiltDeckSettings }>('/admin/prebuilt-decks/settings', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({ ...prebuiltSettings, deckOverrides: nextOverrides }),
        });
        prebuiltSettings = data.settings;
        setMessage('prebuilt-message', 'Deck pre-armado actualizado.');
        await loadPrebuiltDeckSettings();
    } catch (error: any) {
        setMessage('prebuilt-message', error.message, true);
    }
}

async function resetSelectedPrebuiltDeck() {
    if (!selectedPrebuiltDeckId) return;
    try {
        const nextOverrides = { ...(prebuiltSettings.deckOverrides || {}) };
        delete nextOverrides[selectedPrebuiltDeckId];
        const data = await request<{ settings: PrebuiltDeckSettings }>('/admin/prebuilt-decks/settings', {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify({ ...prebuiltSettings, deckOverrides: nextOverrides }),
        });
        prebuiltSettings = data.settings;
        setMessage('prebuilt-message', 'Deck restaurado al auto-generado.');
        await loadPrebuiltDeckSettings();
    } catch (error: any) {
        setMessage('prebuilt-message', error.message, true);
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
            if (pendingMediaTarget === 'news-body-image') {
                insertIntoTextarea('news-body', `\n![${asset.name}](${asset.dataUrl})\n`);
                $('media-modal').classList.remove('open');
                pendingMediaTarget = '';
                return;
            }
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
    $('add-effect-btn').addEventListener('click', addEffectFromControls);
    $('card-effects').addEventListener('input', renderEffectList);
    setupCardReferenceAutocomplete('card-likes');
    setupCardReferenceAutocomplete('card-dislikes');
    setupCardReferenceAutocomplete('card-requirements');
    setupCardReferenceAutocomplete('effect-card-id');
    setupPrebuiltAddAutocomplete();
    $('import-btn').addEventListener('click', importCsv);
    $('validate-import-btn').addEventListener('click', validateCsvImport);
    $('download-card-template-btn').addEventListener('click', () => downloadCsvTemplate('cards'));
    $('download-blank-card-template-btn').addEventListener('click', () => downloadCsvTemplate('cards', true));
    $('download-archetype-template-btn').addEventListener('click', () => downloadCsvTemplate('archetypes'));
    $('run-audit-btn').addEventListener('click', () => runCardAudit(true));
    $('create-user-btn').addEventListener('click', createUser);
    $('new-news-btn').addEventListener('click', clearNewsForm);
    $('save-news-btn').addEventListener('click', saveHomeNews);
    $('delete-news-btn').addEventListener('click', deleteHomeNews);
    document.querySelectorAll<HTMLButtonElement>('[data-news-format]').forEach(button => {
        button.addEventListener('click', () => formatNewsBody(button.dataset.newsFormat || ''));
    });
    $('save-prebuilt-btn').addEventListener('click', savePrebuiltDeckSettings);
    $('save-prebuilt-deck-btn').addEventListener('click', saveSelectedPrebuiltDeck);
    $('reset-prebuilt-deck-btn').addEventListener('click', resetSelectedPrebuiltDeck);
    $('prebuilt-add-card-btn').addEventListener('click', addTypedCardsToPrebuiltDraft);
    $('prebuilt-editor-select').addEventListener('change', () => selectPrebuiltDeck(($<HTMLSelectElement>('prebuilt-editor-select')).value));
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
