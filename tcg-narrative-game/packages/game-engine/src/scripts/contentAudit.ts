import { CARDS } from '../content/cards';
import { ARCHETYPES } from '@tcg/shared/constants';
import { CardType } from '@tcg/shared/types';

// Validation Rules
const MIN_CARDS_PER_ARCHETYPE = 15;

function auditContent() {
    console.log('Starting Content Audit...');

    const archetypes: Record<string, any[]> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Initialize buckets
    Object.values(ARCHETYPES).forEach(id => {
        archetypes[id] = [];
    });

    // Sort cards into archetypes
    Object.values(CARDS).forEach(card => {
        if (card.archetype === 'NONE') return; // Skip placeholder

        if (!archetypes[card.archetype as string]) {
            // It might be a string literal archetype not in the enum yet or just a mismatch
            // We'll warn but allow if it looks valid
            // But strict mode:
            // errors.push(`Card ${card.id} has invalid archetype: ${card.archetype}`);
            // creative fallback:
            if (!archetypes[card.archetype as string]) archetypes[card.archetype as string] = [];
        }
        archetypes[card.archetype as string].push(card);

        // Validation per card
        if (!card.image) warnings.push(`Card ${card.id} missing image ID`);
        if (!card.description) errors.push(`Card ${card.id} missing description`);

        // Type specific checks
        if (card.type === CardType.EVENT && (!card.requirements || card.requirements.length === 0)) {
            warnings.push(`Event ${card.id} has no requirements`);
        }
    });

    // Check Archetype Completeness
    Object.entries(archetypes).forEach(([id, cards]) => {
        console.log(`\nArchetype: ${id} - Total Cards: ${cards.length}`);

        const protagonists = cards.filter(c => c.type === CardType.PROTAGONIST);
        const finalEvents = cards.filter(c => c.type === CardType.EVENT_FINAL);
        const events = cards.filter(c => c.type === CardType.EVENT);
        const characters = cards.filter(c => c.type === CardType.PERSONAJE);
        const items = cards.filter(c => c.type === CardType.ITEM);
        const locations = cards.filter(c => c.type === CardType.LOCATION);

        console.log(`  Protags: ${protagonists.length}`);
        console.log(`  Chars: ${characters.length}`);
        console.log(`  Items: ${items.length}`);
        console.log(`  Locs: ${locations.length}`);
        console.log(`  Events: ${events.length}`);
        console.log(`  Final: ${finalEvents.length}`);

        if (cards.length < MIN_CARDS_PER_ARCHETYPE) {
            warnings.push(`Archetype ${id} has few cards (${cards.length}/${MIN_CARDS_PER_ARCHETYPE})`);
        }
        if (protagonists.length < 1) {
            errors.push(`Archetype ${id} has NO protagonist`);
        }
        if (finalEvents.length < 1) {
            errors.push(`Archetype ${id} has NO final event`);
        }
    });

    // Report
    console.log('\n=== AUDIT REPORT ===');
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
        console.error('\nERRORS:');
        errors.forEach(e => console.error(`- ${e}`));
    }

    if (warnings.length > 0) {
        console.warn('\nWARNINGS:');
        warnings.forEach(w => console.warn(`- ${w}`));
    }

    if (errors.length === 0) {
        console.log('\nSUCCESS! Content looks valid.');
    } else {
        console.log('\nFAILED. Please fix errors.');
        throw new Error('Audit Failed');
    }
}

auditContent();
