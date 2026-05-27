import { CARDS } from '@tcg/game-engine/content/cards';
import { ARCHETYPES, V2_ARCHETYPES } from '@tcg/shared/constants';
import { CardData, CardEffect, CardRequirement, CardType, EffectType } from '@tcg/shared/types';
import { PersistedCardData, store } from '../store/memory.store';

export type MutableCard = CardData & {
    sound?: string;
    likes?: string[];
    dislikes?: string[];
    extendedLore?: string;
};

export type AdminCardRecord = PersistedCardData & {
    desc: string;
    prereqs: string[];
    likes: string[];
    dislikes: string[];
};

export type AuditSeverity = 'error' | 'warning';

export interface CardAuditIssue {
    severity: AuditSeverity;
    cardId: string;
    cardName: string;
    field: string;
    message: string;
}

export interface CardAuditSummary {
    cards: number;
    errors: number;
    warnings: number;
    incomplete: number;
    brokenReferences: number;
    invalidEffects: number;
}

export interface CardAuditReport {
    summary: CardAuditSummary;
    issues: CardAuditIssue[];
}

export interface CsvValidationIssue {
    severity: AuditSeverity;
    line: number;
    field: string;
    message: string;
}

export interface CsvValidationReport {
    valid: boolean;
    count: number;
    errors: CsvValidationIssue[];
    warnings: CsvValidationIssue[];
}

export interface ArchetypeCsvRecord {
    id: string;
    enabled: boolean;
}

type CsvRow = {
    line: number;
    values: Record<string, string>;
};

const VALID_CARD_TYPES = new Set<string>([
    CardType.PROTAGONIST,
    CardType.PERSONAJE,
    CardType.ITEM,
    CardType.LOCATION,
    CardType.TOKEN,
    CardType.QUICK_EVENT,
    CardType.EVENT,
    CardType.CLIMAX_EVENT,
    CardType.PLOT_TWIST_EVENT,
]);
const VALID_EFFECT_TYPES = new Set<string>(Object.values(EffectType));
const VALID_ARCHETYPES = new Set<string>(V2_ARCHETYPES);
const VALID_TARGETS = new Set(['SELF', 'OPPONENT']);
const VALID_REQUIREMENT_TYPES = new Set(['STORY_MIN', 'FILLER_MIN', 'FILLER_MAX', 'CARD_ON_BOARD', 'CARD_IN_COMPLETED_ARC', 'EVENT_COMPLETED', 'EVENT_COUNT_MIN', 'AFFINITY_ACTIVE', 'DISCARD_FROM_HAND']);

function supportsLikes(type: CardType | string): boolean {
    return type === CardType.PROTAGONIST
        || type === CardType.PERSONAJE
        || type === CardType.CHARACTER
        || type === CardType.UNIT;
}

export function applyPersistedCardOverrides(): void {
    for (const card of store.listCardOverrides()) {
        const isBaseCard = Boolean(CARDS[card.id]);
        const isAdminCustomCard = card.tags?.includes('admin-custom') || false;
        if (!isBaseCard && !isAdminCustomCard) {
            store.deleteCardOverride(card.id);
            continue;
        }

        const copy = sanitizeFinalEventEffects(toMutableCard(card));
        CARDS[copy.id] = copy;
    }
}

export function serializeCard(card: MutableCard): AdminCardRecord {
    const canHaveLikes = supportsLikes(card.type);
    const likes = canHaveLikes ? card.likesData?.likes || card.likes || [] : [];
    const dislikes = canHaveLikes ? card.likesData?.dislikes || card.dislikes || [] : [];
    return {
        id: card.id,
        name: card.name,
        type: card.type,
        cost: card.cost,
        costResource: card.costResource || 'SP',
        description: card.description,
        desc: card.description,
        backstory: card.backstory,
        extendedLore: card.extendedLore || card.backstory || '',
        eventPrerequisites: card.eventPrerequisites,
        prereqs: card.eventPrerequisites || [],
        requirements: card.requirements || [],
        effects: card.effects || [],
        entryEffects: card.entryEffects || [],
        climaxTiers: card.climaxTiers,
        affinity: canHaveLikes ? card.affinity : undefined,
        likesData: canHaveLikes ? {
            likes,
            dislikes,
        } : undefined,
        likes,
        dislikes,
        archetype: card.archetype,
        image: card.image,
        sound: card.sound || '',
        maxCopies: card.maxCopies,
        tags: card.tags || [],
        protagonistId: card.protagonistId,
        formIndex: card.formIndex,
        totalForms: card.totalForms,
    };
}

export function toPersistedCard(card: MutableCard): PersistedCardData {
    const serialized = serializeCard(card);
    return {
        id: serialized.id,
        name: serialized.name,
        type: serialized.type,
        cost: serialized.cost,
        costResource: serialized.costResource,
        description: serialized.description,
        backstory: serialized.backstory,
        extendedLore: serialized.extendedLore,
        eventPrerequisites: serialized.eventPrerequisites,
        requirements: serialized.requirements,
        effects: serialized.effects,
        entryEffects: serialized.entryEffects,
        climaxTiers: serialized.climaxTiers,
        affinity: serialized.affinity,
        likesData: serialized.likesData,
        likes: serialized.likes,
        dislikes: serialized.dislikes,
        archetype: serialized.archetype,
        image: serialized.image,
        sound: serialized.sound,
        maxCopies: serialized.maxCopies,
        tags: serialized.tags,
        protagonistId: serialized.protagonistId,
        formIndex: serialized.formIndex,
        totalForms: serialized.totalForms,
    };
}

export function applyCardUpdate(id: string, updates: Partial<AdminCardRecord>): AdminCardRecord | undefined {
    const existing = CARDS[id] as MutableCard | undefined;
    if (!existing) return undefined;
    const updated = mergeCard(existing, updates);
    validateCardStrict(updated, allCardIds()).forEach(issue => {
        if (issue.severity === 'error') {
            throw new Error(`${issue.field}: ${issue.message}`);
        }
    });
    CARDS[id] = updated;
    store.upsertCardOverride(toPersistedCard(updated));
    return serializeCard(updated);
}

export function validateCsv(csv: string): CsvValidationReport {
    const parsed = parseCsv(csv);
    const allIds = allCardIds();
    const csvIds = new Set<string>();

    for (const row of parsed.rows) {
        const id = row.values.id?.trim();
        if (id) csvIds.add(id);
    }

    const knownIds = new Set([...allIds, ...csvIds]);
    const issues: CsvValidationIssue[] = [...parsed.errors];

    if (parsed.rows.length === 0) {
        issues.push({ severity: 'error', line: 1, field: 'csv', message: 'El CSV no contiene filas importables.' });
    }

    const seen = new Set<string>();
    for (const row of parsed.rows) {
        const rowIssues = validateCsvRow(row, knownIds);
        issues.push(...rowIssues);
        const id = row.values.id?.trim();
        if (id && seen.has(id)) {
            issues.push({ severity: 'error', line: row.line, field: 'id', message: `ID duplicado en el CSV: ${id}.` });
        }
        if (id) seen.add(id);
    }

    const errors = issues.filter(issue => issue.severity === 'error');
    const warnings = issues.filter(issue => issue.severity === 'warning');
    return {
        valid: errors.length === 0,
        count: parsed.rows.length,
        errors,
        warnings,
    };
}

export function importCsvCards(csv: string): AdminCardRecord[] {
    const validation = validateCsv(csv);
    if (!validation.valid) {
        throw Object.assign(new Error('CSV validation failed'), { validation });
    }

    return parseCsv(csv).rows.map(row => {
        const card = upsertCsvRow(row);
        store.upsertCardOverride(toPersistedCard(card));
        return serializeCard(card);
    });
}

export function exportCardsCsvTemplate(cards: MutableCard[] = Object.values(CARDS) as MutableCard[]): string {
    const headers = ['id', 'name', 'type', 'archetype', 'protagonistId', 'cost', 'costResource', 'description', 'image', 'sound', 'likes', 'dislikes', 'tags', 'prereqs', 'requirements', 'effects', 'maxCopies'];
    const rows = cards.map(card => {
        const serialized = serializeCard(card);
        return [
            serialized.id,
            serialized.name,
            serialized.type,
            serialized.archetype,
            serialized.protagonistId || '',
            String(serialized.cost ?? 0),
            serialized.costResource || 'SP',
            serialized.description || serialized.desc || '',
            serialized.image || '',
            serialized.sound || '',
            (serialized.likes || []).join('|'),
            (serialized.dislikes || []).join('|'),
            (serialized.tags || []).join('|'),
            (serialized.eventPrerequisites || serialized.prereqs || []).join('|'),
            JSON.stringify(serialized.requirements || []),
            JSON.stringify(serialized.effects || []),
            serialized.maxCopies !== undefined ? String(serialized.maxCopies) : '',
        ];
    });
    return toCsv([headers, ...rows]);
}

export function exportCardsCsvBlankTemplate(): string {
    return toCsv([
        ['id', 'name', 'type', 'archetype', 'protagonistId', 'cost', 'costResource', 'description', 'image', 'sound', 'likes', 'dislikes', 'tags', 'prereqs', 'requirements', 'effects', 'maxCopies'],
        [
            'custom-card-id',
            'Nombre de carta',
            CardType.PERSONAJE,
            ARCHETYPES.SHONEN,
            '',
            '1',
            'SP',
            'Descripcion visible',
            'asset-o-url',
            '',
            'card-id-like-1|card-id-like-2',
            'card-id-dislike-1',
            'admin-custom',
            '',
            '[]',
            JSON.stringify([{ type: EffectType.STORY, value: 1, target: 'SELF', description: 'Gana 1 Story.' }]),
            '3',
        ],
    ]);
}

export function validateArchetypeCsv(csv: string): CsvValidationReport {
    const parsed = parseCsv(csv);
    const issues: CsvValidationIssue[] = [...parsed.errors];
    const validIds = new Set(Object.values(ARCHETYPES));
    const seen = new Set<string>();

    if (parsed.rows.length === 0) {
        issues.push({ severity: 'error', line: 1, field: 'csv', message: 'El CSV no contiene arquetipos importables.' });
    }

    for (const row of parsed.rows) {
        const id = row.values.id?.trim();
        if (!id) {
            issues.push({ severity: 'error', line: row.line, field: 'id', message: 'Falta el ID del arquetipo.' });
        } else if (!validIds.has(id as any)) {
            issues.push({ severity: 'error', line: row.line, field: 'id', message: `Arquetipo inexistente en el juego: ${id}.` });
        } else if (seen.has(id)) {
            issues.push({ severity: 'error', line: row.line, field: 'id', message: `Arquetipo duplicado: ${id}.` });
        }
        if (id) seen.add(id);

        const enabled = row.values.enabled?.trim().toLowerCase();
        if (enabled && !['true', 'false', '1', '0', 'yes', 'no', 'si', 'sí'].includes(enabled)) {
            issues.push({ severity: 'error', line: row.line, field: 'enabled', message: 'Usa true/false, 1/0, yes/no o si/no.' });
        }
    }

    const errors = issues.filter(issue => issue.severity === 'error');
    const warnings = issues.filter(issue => issue.severity === 'warning');
    return { valid: errors.length === 0, count: parsed.rows.length, errors, warnings };
}

export function parseArchetypeCsv(csv: string): ArchetypeCsvRecord[] {
    const validation = validateArchetypeCsv(csv);
    if (!validation.valid) {
        throw Object.assign(new Error('CSV validation failed'), { validation });
    }

    return parseCsv(csv).rows.map(row => ({
        id: row.values.id.trim(),
        enabled: parseBoolean(row.values.enabled, true),
    }));
}

export function auditCards(): CardAuditReport {
    const cards = Object.values(CARDS) as MutableCard[];
    const ids = new Set(cards.map(card => card.id));
    const issues = cards.flatMap(card => validateCardForAudit(card, ids));
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.filter(issue => issue.severity === 'warning').length;

    return {
        summary: {
            cards: cards.length,
            errors,
            warnings,
            incomplete: countByField(issues, 'content'),
            brokenReferences: countByField(issues, 'reference'),
            invalidEffects: countByField(issues, 'effects'),
        },
        issues,
    };
}

function toMutableCard(card: PersistedCardData): MutableCard {
    return {
        ...card,
        effects: card.effects || [],
        likesData: card.likesData || {
            likes: card.likes || [],
            dislikes: card.dislikes || [],
        },
    };
}

function allCardIds(): Set<string> {
    return new Set(Object.keys(CARDS));
}

function countByField(issues: CardAuditIssue[], field: string): number {
    return issues.filter(issue => issue.field === field).length;
}

function mergeCard(existing: MutableCard, updates: Partial<AdminCardRecord>): MutableCard {
    const type = (updates.type || existing.type) as CardType;
    const canHaveLikes = supportsLikes(type);
    const likes = canHaveLikes ? updates.likes ?? existing.likesData?.likes ?? existing.likes ?? [] : [];
    const dislikes = canHaveLikes ? updates.dislikes ?? existing.likesData?.dislikes ?? existing.dislikes ?? [] : [];
    const merged: MutableCard = {
        ...existing,
        name: cleanString(updates.name) || existing.name,
        description: cleanString(updates.description ?? updates.desc) || existing.description,
        backstory: updates.backstory ?? existing.backstory,
        extendedLore: updates.extendedLore ?? existing.extendedLore,
        type,
        cost: updates.cost !== undefined ? Number(updates.cost) : existing.cost,
        costResource: updates.costResource !== undefined ? updates.costResource : existing.costResource,
        archetype: cleanString(updates.archetype) || existing.archetype,
        image: updates.image !== undefined ? updates.image : existing.image,
        sound: updates.sound !== undefined ? updates.sound : existing.sound,
        maxCopies: updates.maxCopies !== undefined ? Number(updates.maxCopies) : existing.maxCopies,
        tags: updates.tags ?? existing.tags,
        requirements: updates.requirements !== undefined ? updates.requirements as CardRequirement[] : existing.requirements,
        effects: updates.effects !== undefined ? updates.effects as CardEffect[] : existing.effects,
        entryEffects: updates.entryEffects !== undefined ? updates.entryEffects as CardEffect[] : existing.entryEffects,
        climaxTiers: updates.climaxTiers !== undefined ? updates.climaxTiers : existing.climaxTiers,
        protagonistId: updates.protagonistId !== undefined ? updates.protagonistId : existing.protagonistId,
        formIndex: updates.formIndex !== undefined ? Number(updates.formIndex) : existing.formIndex,
        totalForms: updates.totalForms !== undefined ? Number(updates.totalForms) : existing.totalForms,
        affinity: canHaveLikes ? existing.affinity : undefined,
        likesData: canHaveLikes ? {
            likes,
            dislikes,
        } : undefined,
        likes,
        dislikes,
    };
    sanitizeFinalEventEffects(merged);
    if (!canHaveLikes) {
        delete merged.likesData;
        delete merged.affinity;
        delete merged.likes;
        delete merged.dislikes;
    }
    return merged;
}

function sanitizeFinalEventEffects(card: MutableCard): MutableCard {
    if (card.type === CardType.CLIMAX_EVENT || card.type === CardType.PLOT_TWIST_EVENT) {
        card.effects = (card.effects || []).filter(effect => effect.type !== EffectType.VICTORY && effect.type !== 'VICTORY');
    }
    return card;
}

function upsertCsvRow(row: CsvRow): MutableCard {
    const id = row.values.id.trim();
    const existing = CARDS[id] as MutableCard | undefined;
    const importedTags = row.values.tags ? parseList(row.values.tags) : undefined;
    const card = mergeCard(existing || {
        id,
        name: id,
        type: CardType.PERSONAJE,
        cost: 1,
        description: '',
        effects: [],
        archetype: ARCHETYPES.SHONEN,
        image: id,
    }, {
        name: row.values.name,
        type: row.values.type,
        cost: row.values.cost ? Number(row.values.cost) : undefined,
        costResource: row.values.costResource === 'FP' ? 'FP' : row.values.costResource === 'SP' ? 'SP' : undefined,
        description: row.values.description || row.values.desc,
        backstory: row.values.backstory,
        extendedLore: row.values.extendedLore,
        archetype: row.values.archetype,
        image: row.values.image,
        sound: row.values.sound,
        maxCopies: row.values.maxCopies ? Number(row.values.maxCopies) : undefined,
        tags: existing ? importedTags : Array.from(new Set([...(importedTags || []), 'admin-custom'])),
        protagonistId: row.values.protagonistId || undefined,
        eventPrerequisites: row.values.prereqs ? parseList(row.values.prereqs) : undefined,
        requirements: row.values.requirements ? parseJsonArray(row.values.requirements) as CardRequirement[] : undefined,
        effects: row.values.effects ? parseJsonArray(row.values.effects) as CardEffect[] : undefined,
        likes: row.values.likes ? parseList(row.values.likes) : undefined,
        dislikes: row.values.dislikes ? parseList(row.values.dislikes) : undefined,
    } as Partial<AdminCardRecord>);

    if (row.values.prereqs) {
        card.eventPrerequisites = parseList(row.values.prereqs);
    }

    CARDS[id] = card;
    return card;
}

function parseList(value?: string): string[] {
    return (value || '').split(/[|,]/).map(item => item.trim()).filter(Boolean);
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    const normalized = (value || '').trim().toLowerCase();
    if (!normalized) return fallback;
    return ['true', '1', 'yes', 'si', 'sí'].includes(normalized);
}

function toCsv(rows: unknown[][]): string {
    return rows.map(row => row.map(csvEscape).join(',')).join('\n');
}

function csvEscape(value: unknown): string {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function cleanString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function parseJsonArray(value: string): unknown[] {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('Debe ser un array JSON.');
    return parsed;
}

function parseCsv(csv: string): { rows: CsvRow[]; errors: CsvValidationIssue[] } {
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
    const nonEmpty = lines
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(item => item.line.trim().length > 0);

    if (nonEmpty.length === 0) return { rows: [], errors: [] };

    const headerResult = parseCsvLine(nonEmpty[0].line);
    if (headerResult.error) {
        return { rows: [], errors: [{ severity: 'error', line: nonEmpty[0].number, field: 'csv', message: headerResult.error }] };
    }
    const headers = headerResult.values.map(header => header.trim());
    const rows: CsvRow[] = [];
    const errors: CsvValidationIssue[] = [];

    for (const item of nonEmpty.slice(1)) {
        const result = parseCsvLine(item.line);
        if (result.error) {
            errors.push({ severity: 'error', line: item.number, field: 'csv', message: result.error });
            continue;
        }

        rows.push({
            line: item.number,
            values: headers.reduce<Record<string, string>>((acc, header, index) => {
                acc[header] = result.values[index]?.trim() || '';
                return acc;
            }, {}),
        });
    }

    return { rows, errors };
}

function parseCsvLine(line: string): { values: string[]; error?: string } {
    const values: string[] = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && quoted && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    if (quoted) return { values: [], error: 'Comillas sin cerrar.' };
    values.push(current);
    return { values };
}

function validateCsvRow(row: CsvRow, knownIds: Set<string>): CsvValidationIssue[] {
    const card = row.values;
    const issues: CsvValidationIssue[] = [];
    const add = (severity: AuditSeverity, field: string, message: string) => issues.push({ severity, line: row.line, field, message });

    if (!card.id?.trim()) add('error', 'id', 'Falta el ID de la carta.');
    if (!card.name?.trim()) add('warning', 'name', 'Falta el nombre; se usara el ID si se importa como carta nueva.');
    if (card.type && !VALID_CARD_TYPES.has(card.type)) add('error', 'type', `Categoria invalida: ${card.type}.`);
    if (card.archetype && !VALID_ARCHETYPES.has(card.archetype)) add('error', 'archetype', `Arquetipo invalido: ${card.archetype}.`);
    if (card.cost && !Number.isFinite(Number(card.cost))) add('error', 'cost', 'El costo debe ser numerico.');
    if (card.costResource && !['SP', 'FP'].includes(card.costResource)) add('error', 'costResource', 'El recurso de costo debe ser SP o FP.');
    if (card.maxCopies && !Number.isFinite(Number(card.maxCopies))) add('error', 'maxCopies', 'Max copias debe ser numerico.');
    if (!card.description?.trim() && !card.desc?.trim()) add('warning', 'description', 'Falta descripcion visible.');
    if (!card.image?.trim()) add('warning', 'image', 'Falta imagen o asset id.');

    validateJsonArrayField(row, 'requirements', knownIds, issues);
    validateJsonArrayField(row, 'effects', knownIds, issues);
    validateReferencesFromList(row, 'likes', knownIds, issues);
    validateReferencesFromList(row, 'dislikes', knownIds, issues);
    validateReferencesFromList(row, 'prereqs', knownIds, issues);

    return issues;
}

function validateJsonArrayField(row: CsvRow, field: 'requirements' | 'effects', knownIds: Set<string>, issues: CsvValidationIssue[]): void {
    const value = row.values[field];
    if (!value) return;
    try {
        const parsed = parseJsonArray(value);
        if (field === 'requirements') {
            validateRequirements(parsed, knownIds).forEach(message => issues.push({ severity: 'error', line: row.line, field, message }));
        } else {
            validateEffects(parsed).forEach(message => issues.push({ severity: 'error', line: row.line, field, message }));
        }
    } catch (error: any) {
        issues.push({ severity: 'error', line: row.line, field, message: `JSON invalido: ${error.message}` });
    }
}

function validateReferencesFromList(row: CsvRow, field: string, knownIds: Set<string>, issues: CsvValidationIssue[]): void {
    for (const id of parseList(row.values[field])) {
        if (!knownIds.has(id)) {
            issues.push({ severity: 'error', line: row.line, field, message: `Referencia a carta inexistente: ${id}.` });
        }
    }
}

function validateCardStrict(card: MutableCard, knownIds: Set<string>): CardAuditIssue[] {
    return validateCardForAudit(card, knownIds).filter(issue => issue.severity === 'error');
}

function validateCardForAudit(card: MutableCard, knownIds: Set<string>): CardAuditIssue[] {
    const issues: CardAuditIssue[] = [];
    const add = (severity: AuditSeverity, field: string, message: string) => {
        issues.push({ severity, cardId: card.id, cardName: card.name || card.id, field, message });
    };

    if (!card.name?.trim()) add('warning', 'content', 'Falta nombre.');
    if (!card.description?.trim()) add('warning', 'content', 'Falta descripcion.');
    if (!card.image?.trim()) add('warning', 'content', 'Falta imagen o asset id.');
    if (!VALID_CARD_TYPES.has(card.type)) add('error', 'content', `Categoria invalida: ${card.type}.`);
    if (!VALID_ARCHETYPES.has(String(card.archetype))) add('error', 'content', `Arquetipo invalido: ${card.archetype}.`);
    if (!Number.isFinite(Number(card.cost)) || Number(card.cost) < 0) add('error', 'content', 'Costo invalido.');
    if (!['SP', 'FP'].includes(card.costResource || 'SP')) add('error', 'content', 'Moneda de costo invalida.');
    if (!card.effects?.length) add('warning', 'effects', 'No tiene efectos definidos.');

    for (const message of validateEffects(card.effects || [])) add('error', 'effects', message);
    for (const message of validateRequirements(card.requirements || [], knownIds)) add('error', 'reference', message);
    if ((card.type === CardType.EVENT || card.type === CardType.CLIMAX_EVENT || card.type === CardType.PLOT_TWIST_EVENT) && !hasMaterialRequirement(card.requirements || [])) {
        add('warning', 'reference', 'El evento deberia requerir al menos una carta material en campo.');
    }
    if (card.type === CardType.CLIMAX_EVENT && (!card.climaxTiers || card.climaxTiers.length !== 3)) {
        add('error', 'reference', 'El Climax debe definir niveles x2, x4 y x10.');
    }
    if (card.type === CardType.PLOT_TWIST_EVENT && card.effects.some(effect => effect.type === EffectType.VICTORY || effect.type === 'VICTORY')) {
        add('error', 'effects', 'Un Plot-Twist no puede ganar automaticamente.');
    }
    for (const id of card.eventPrerequisites || []) {
        if (!knownIds.has(id)) add('error', 'reference', `Prerequisito inexistente: ${id}.`);
    }
    for (const id of card.likesData?.likes || []) {
        if (!knownIds.has(id)) add('error', 'reference', `Like apunta a carta inexistente: ${id}.`);
    }
    for (const id of card.likesData?.dislikes || []) {
        if (!knownIds.has(id)) add('error', 'reference', `Dislike apunta a carta inexistente: ${id}.`);
    }
    for (const id of card.affinity?.compatibleWith || []) {
        if (!knownIds.has(id)) add('error', 'reference', `Afinidad apunta a carta inexistente: ${id}.`);
    }

    return issues;
}

function hasMaterialRequirement(requirements: CardRequirement[]): boolean {
    return requirements.some(req =>
        req.type === 'CARD_ON_BOARD'
        && (
            Boolean(req.cardIds?.length)
            || req.cardType === CardType.PROTAGONIST
            || req.cardType === CardType.PERSONAJE
            || req.cardType === CardType.ITEM
            || req.cardType === CardType.LOCATION
            || req.cardType === CardType.QUICK_EVENT
        )
    );
}

function validateEffects(effects: unknown[]): string[] {
    const errors: string[] = [];
    effects.forEach((effect, index) => {
        const item = effect as Partial<CardEffect>;
        if (!item || typeof item !== 'object') {
            errors.push(`Efecto ${index + 1} no es un objeto.`);
            return;
        }
        if (!item.type || !VALID_EFFECT_TYPES.has(String(item.type))) errors.push(`Efecto ${index + 1} tiene tipo invalido: ${String(item.type || '')}.`);
        if (item.target && !VALID_TARGETS.has(item.target)) errors.push(`Efecto ${index + 1} tiene objetivo invalido: ${item.target}.`);
        if (item.cardType && !VALID_CARD_TYPES.has(String(item.cardType))) errors.push(`Efecto ${index + 1} usa categoria invalida: ${String(item.cardType)}.`);
        if (item.value !== undefined && !Number.isFinite(Number(item.value))) errors.push(`Efecto ${index + 1} tiene valor no numerico.`);
        if (item.turns !== undefined && !Number.isFinite(Number(item.turns))) errors.push(`Efecto ${index + 1} tiene turnos no numericos.`);
    });
    return errors;
}

function validateRequirements(requirements: unknown[], knownIds: Set<string>): string[] {
    const errors: string[] = [];
    requirements.forEach((requirement, index) => {
        const item = requirement as Partial<CardRequirement>;
        if (!item || typeof item !== 'object') {
            errors.push(`Requisito ${index + 1} no es un objeto.`);
            return;
        }
        if (!item.type || !VALID_REQUIREMENT_TYPES.has(String(item.type))) errors.push(`Requisito ${index + 1} tiene tipo invalido: ${String(item.type || '')}.`);
        if (item.cardType && !VALID_CARD_TYPES.has(String(item.cardType))) errors.push(`Requisito ${index + 1} usa categoria invalida: ${String(item.cardType)}.`);
        if (item.value !== undefined && !Number.isFinite(Number(item.value))) errors.push(`Requisito ${index + 1} tiene valor no numerico.`);
        for (const id of item.cardIds || []) {
            if (!knownIds.has(id)) errors.push(`Requisito ${index + 1} referencia carta inexistente: ${id}.`);
        }
    });
    return errors;
}
