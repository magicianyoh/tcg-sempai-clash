import { CardData, CardEffect, CardRequirement, CardType, EffectType } from '@tcg/shared/types';
import { ARCHETYPES } from '@tcg/shared/constants';

type Resource = 'SP' | 'FP';
type Strategy = 'rush' | 'engine' | 'bond' | 'control';
type Named = [slug: string, name: string, description: string];
type ExtraMaterial = { kind: 'support' | 'item' | 'location'; card: Named };
type Hero = {
    slug: string;
    name: string;
    description: string;
    strategy: Strategy;
    resource: Resource;
    support: Named;
    item: Named;
    location: Named;
    normalEvents: Named[];
    climax: Named;
    plotTwist: Named;
    extraMaterials?: ExtraMaterial[];
    quickEvents?: Named[];
    eventMaterials?: string[][];
    eventMaterialCounts?: number[];
    climaxMaterials?: string[];
    routeId?: string;
    routeLabel?: string;
    protagonistSlug?: string;
    generateAvatar?: boolean;
    eventStoryBonus?: number;
    eventSelfFillerDelta?: number;
    eventOpponentFillerBonus?: number;
};
type Plan = {
    id: string;
    prefix: string;
    theme: string;
    sharedCharacters: Named[];
    sharedItems: Named[];
    heroes: Hero[];
};

export const CARDS: Record<string, CardData> = {};

const plans: Plan[] = [
    {
        id: ARCHETYPES.MECHA,
        prefix: 'mecha',
        theme: 'pilots, machines and decisive launches',
        sharedCharacters: [['chief-engineer', 'Chief Engineer Sora', 'Keeps damaged frames moving.'], ['bridge-officer', 'Bridge Officer Nao', 'Reads the battlefield before impact.']],
        sharedItems: [['reserve-reactor', 'Reserve Reactor', 'A dangerous source of output.'], ['targeting-array', 'Targeting Array', 'Turns telemetry into a clean shot.']],
        heroes: [
            { slug: 'brave-gai', name: 'Brave Engine Gai', strategy: 'bond', resource: 'SP', description: 'A super robot commander who wins through courage and combination.', support: ['lion-partner', 'Lion Partner Galeon', 'A mechanical lion that answers his shout.'], item: ['brave-key', 'Brave Key', 'Ignites the combination program.'], location: ['combination-hangar', 'Combination Hangar', 'Launch rails align five machines.'], extraMaterials: [{ kind: 'item', card: ['goldion-core', 'Goldion Core', 'Condenses every engine output for the finishing strike.'] }, { kind: 'location', card: ['final-launch-rail', 'Final Launch Rail', 'Aligns the united machine with its final target.'] }], normalEvents: [['brave-launch', 'Brave Launch', 'Gai calls the team into formation.'], ['hell-combination', 'Hell Combination', 'All engines unite in a single frame.'], ['protect-the-city', 'Protect the City', 'The machine stands between civilians and ruin.'], ['courage-overload', 'Courage Overload', 'The team overloads its shields to create one final opening.']], climax: ['golden-hammer', 'Golden Hammer Finale', 'Courage becomes an unavoidable final strike.'], climaxMaterials: ['goldion-core', 'final-launch-rail'], plotTwist: ['cracked-courage', 'Cracked Courage', 'A final overload exposes the cost of heroism.'] },
            { slug: 'vector-arlen', name: 'Vector Pilot Arlen', strategy: 'engine', resource: 'SP', description: 'A real robot ace who spends resources with military precision.', support: ['spotter-lio', 'Spotter Lio', 'Feeds corrected trajectories to Arlen.'], item: ['beam-carbine', 'Beam Carbine', 'A reliable rifle for measured sorties.'], location: ['colony-front', 'Colony Front', 'Every shot risks the station behind it.'], normalEvents: [['sortie-order', 'Sortie Order', 'Arlen launches under strict command.'], ['ace-intercept', 'Ace Intercept', 'A rival unit tests every maneuver.'], ['supply-line', 'Supply Line Gambit', 'The battle turns on fuel and ammunition.'], ['colony-shield', 'Colony Shield', 'Arlen chooses what the war protects.']], climax: ['last-vector', 'Last Vector Assault', 'One calculated route ends the campaign.'], plotTwist: ['hidden-mines', 'Hidden Minefield', 'The perfect route hides a final trap.'] },
            { slug: 'unit09-shin', name: 'Unit-09 Shin', strategy: 'control', resource: 'FP', description: 'A reluctant pilot who turns psychological pressure into power.', support: ['operator-mari', 'Operator Mari', 'Keeps Shin connected when words fail.'], item: ['sync-plugs', 'Sync Plugs', 'They improve control and deepen the pain.'], location: ['sealed-cage', 'Sealed Cage', 'A launch bay built like a prison.'], normalEvents: [['forced-entry', 'Forced Entry', 'Shin is ordered into the machine.'], ['silent-angel', 'Silent Angel Attack', 'A shape in the sky refuses explanation.'], ['sync-collapse', 'Sync Collapse', 'The cockpit becomes an argument with the self.'], ['berserk-frame', 'Berserk Frame', 'The unit acts beyond command.'], ['empty-theater', 'Empty Theater', 'Shin must choose whether others are real.']], climax: ['world-refusal', 'World Refusal', 'He rejects the painless ending.'], plotTwist: ['closed-heart', 'Closed Heart', 'Isolation pulls at the final choice.'] },
            { slug: 'kaiju-mina', name: 'Kaiju Breaker Mina', strategy: 'rush', resource: 'FP', description: 'A rescue pilot who weaponizes collateral pressure against kaiju.', support: ['evac-lead', 'Evac Lead Jun', 'Clears civilians before Mina fires.'], item: ['pile-bunker', 'Pile Bunker', 'A close-range answer for giant armor.'], location: ['floodwall-city', 'Floodwall City', 'A district designed to survive impact.'], normalEvents: [['alarm-siren', 'Kaiju Alarm', 'Sirens force Mina into motion.'], ['street-intercept', 'Street Intercept', 'The fight crosses inhabited blocks.'], ['breach-response', 'Breach Response', 'A wall falls and a new route opens.'], ['alpha-kaiju', 'Alpha Kaiju Rising', 'The source of the swarm emerges.']], climax: ['breaker-salvo', 'Breaker Salvo', 'Mina stakes the skyline on one volley.'], plotTwist: ['second-roar', 'Second Roar', 'The fallen monster moves once more.'] },
            {
                slug: 'revenge-leon',
                name: 'Vengeance Pilot Leon',
                strategy: 'control',
                resource: 'SP',
                description: 'The son of a fallen colonel pursues the unknown frame that killed his father.',
                support: ['intel-rhea', 'Intel Officer Rhea', 'Decrypts battlefield transmissions that should not exist.'],
                item: ['colonel-tag', 'Colonel Voss Dog Tag', 'A keepsake carrying a corrupted combat record.'],
                location: ['frontier-depot', 'Frontier Resource Depot', 'Both armies bleed for its fuel cells.'],
                extraMaterials: [
                    { kind: 'item', card: ['alien-transponder', 'Alien Transponder', 'A signal proving the war is being guided from within.'] },
                    { kind: 'support', card: ['rival-commander', 'Commander Selene', 'An enemy ace who accepts a human truce.'] },
                    { kind: 'location', card: ['orbital-rift', 'Orbital Rift', 'Invasion craft descend behind both banners.'] },
                ],
                normalEvents: [['ashes-sortie', 'Sortie Through Ashes', 'Leon takes his father s unfinished assignment.'], ['masked-frame', 'The Masked Frame', 'The killer unit appears without a faction mark.'], ['resource-siege', 'Siege of the Depot', 'A territorial battle exhausts both armies.'], ['signal-beneath', 'Signal Beneath the War', 'Rhea exposes nonhuman command codes.'], ['human-ceasefire', 'Human Ceasefire', 'Enemy pilots turn their guns away from one another.'], ['invasion-front', 'Invasion Front', 'The masked machine returns among the invaders.']],
                climax: ['earthbound-alliance', 'Earthbound Alliance', 'Leon leads united human frames against the infiltrators and his father s killer.'],
                plotTwist: ['father-record', 'Father s Final Recording', 'A hidden command reveals why the colonel entered that battle.'],
                quickEvents: [['decrypt-beacon', 'Decrypt Unknown Beacon', 'Discard a failed reading to find the next recorded battle.']],
            },
        ],
    },
    {
        id: ARCHETYPES.SHONEN,
        prefix: 'shonen',
        theme: 'training, rivals and impossible resolve',
        sharedCharacters: [['old-master', 'Old Master Gen', 'Turns defeat into a lesson.'], ['arena-medic', 'Arena Medic Yui', 'Keeps the cast fighting.']],
        sharedItems: [['training-weights', 'Training Weights', 'A painful route to growth.'], ['promise-band', 'Promise Band', 'A vow worn in battle.']],
        heroes: [
            { slug: 'dragon-ryu', name: 'Ryu Dragon Flame', strategy: 'rush', resource: 'SP', description: 'A reckless striker whose rival pushes his fire higher.', support: ['spark-kaito', 'Spark Kaito', 'Best friend and first defender.'], item: ['dragon-gauntlet', 'Dragon Gauntlet', 'Turns momentum into flame.'], location: ['street-ring', 'Street Ring', 'Where pride first draws a crowd.'], extraMaterials: [{ kind: 'item', card: ['comet-bracer', 'Comet Bracer', 'Focuses Ryu s mastered flame without burning his promise.'] }, { kind: 'location', card: ['final-skyline', 'Final Skyline Ring', 'The decisive duel rises above the city.'] }], normalEvents: [['first-challenge', 'First Challenge', 'Ryu accepts a fight he should avoid.'], ['rival-ignition', 'Rival Ignition', 'His rival forces a hotter technique.'], ['valley-training', 'Valley Training Breakthrough', 'Ryu earns control before demanding victory.'], ['skyline-duel', 'Skyline Duel', 'The city watches a final exchange.']], climax: ['dragon-comet', 'Dragon Comet Finish', 'All fire falls as a single blow.'], climaxMaterials: ['comet-bracer', 'final-skyline'], plotTwist: ['rival-stands', 'Rival Still Stands', 'The defeated rival rises for one answer.'] },
            { slug: 'kenji-forms', name: 'Kenji Thousand Forms', strategy: 'engine', resource: 'SP', description: 'A disciplined martial artist building a perfect sequence.', support: ['scribe-mika', 'Scribe Mika', 'Records every stance and opening.'], item: ['iron-beads', 'Iron Prayer Beads', 'Focus given physical weight.'], location: ['mountain-dojo', 'Mountain Dojo', 'Repetition becomes ritual.'], extraMaterials: [{ kind: 'item', card: ['final-scroll', 'Final Kata Scroll', 'Combines every corrected stance into a readable sequence.'] }, { kind: 'location', card: ['silent-courtyard', 'Silent Courtyard', 'No audience remains between Kenji and perfection.'] }], normalEvents: [['dawn-drill', 'Dawn Drill', 'Kenji begins before anyone wakes.'], ['master-trial', 'Master Trial', 'A teacher attacks his weak form.'], ['broken-stance', 'Broken Stance', 'Failure reveals the missing motion.'], ['temple-bracket', 'Temple Bracket', 'The tournament tests his entire style.']], climax: ['perfect-kata', 'Perfect Kata', 'A thousand forms resolve into one.'], climaxMaterials: ['final-scroll', 'silent-courtyard'], plotTwist: ['unreadable-style', 'Unreadable Style', 'An opponent abandons all known technique.'] },
            { slug: 'nakama-hiro', name: 'Hiro Nakama Captain', strategy: 'bond', resource: 'SP', description: 'A captain who scales through allies and shared promises.', support: ['mascot-poko', 'Mascot Poko', 'The small heart of the team.'], item: ['team-banner', 'Team Banner', 'Everyone signed the same vow.'], location: ['camp-ground', 'Training Camp', 'Friendship is tested away from home.'], extraMaterials: [{ kind: 'item', card: ['constellation-banner', 'Constellation Banner', 'Every teammate adds a mark before the final charge.'] }, { kind: 'support', card: ['final-lineup', 'Final Lineup', 'The full team takes positions around Hiro.'] }], normalEvents: [['team-oath', 'Team Oath', 'Nobody fights alone again.'], ['rookie-rescue', 'Rookie Rescue', 'Hiro gives up the lead to save someone.'], ['camp-training', 'Camp Training', 'Every weakness gets a partner.'], ['broken-reunion', 'Broken Team Reunion', 'Old anger yields to purpose.'], ['all-in-charge', 'All-In Charge', 'Every teammate takes a position.']], climax: ['constellation-hit', 'Nakama Constellation', 'Their promises strike together.'], climaxMaterials: ['constellation-banner', 'final-lineup'], plotTwist: ['friendship-doubt', 'Friendship Doubt', 'A secret asks whether trust was deserved.'] },
            { slug: 'spirit-aya', name: 'Aya Spirit Strategist', strategy: 'control', resource: 'FP', description: 'A tactician who accepts setbacks to arrange a reversal.', support: ['fox-mentor', 'Fox Mentor Rin', 'Smiles whenever a trap closes.'], item: ['sealed-talisman', 'Sealed Talisman', 'Stores a curse for the correct beat.'], location: ['spirit-gate', 'Spirit Gate', 'A threshold where bargains matter.'], extraMaterials: [{ kind: 'item', card: ['verdict-seal', 'Verdict Seal', 'Closes every escape clause in Aya s final contract.'] }, { kind: 'support', card: ['ninth-tail-witness', 'Ninth Tail Witness', 'Confirms that the demon accepted Aya s terms.'] }], normalEvents: [['curse-mark', 'Curse Mark', 'Aya takes a burden willingly.'], ['feint-ritual', 'Feint Ritual', 'The opponent attacks an illusion.'], ['counter-seal', 'Counter Seal', 'The stored pain returns as leverage.'], ['demon-parley', 'Demon Parley', 'Aya bargains with the last threat.']], climax: ['nine-tail-verdict', 'Nine-Tail Verdict', 'Every plan closes on one seal.'], climaxMaterials: ['verdict-seal', 'ninth-tail-witness'], plotTwist: ['broken-contract', 'Broken Contract', 'The bargain rewrites its price.'] },
            {
                slug: 'roads-aric',
                name: 'Roadbound Aric',
                strategy: 'bond',
                resource: 'SP',
                description: 'A young adventurer crosses hostile territories seeking the demon who ruined his home.',
                support: ['mapmaker-lyra', 'Mapmaker Lyra', 'Marks every friend and every grave along the road.'],
                item: ['fathers-hilt', 'Broken Father s Hilt', 'The only clue Aric carries from childhood.'],
                location: ['border-road', 'Border Road', 'The first path beyond the burned village.'],
                extraMaterials: [
                    { kind: 'support', card: ['stone-guardian', 'Stone Guardian Bor', 'An old defender who teaches Aric endurance.'] },
                    { kind: 'location', card: ['demon-pass', 'Demon King s Pass', 'A road where allied banners finally converge.'] },
                    { kind: 'item', card: ['blood-sigil', 'Bloodline Sigil', 'Proof that the enemy shares Aric s lineage.'] },
                ],
                normalEvents: [['first-mile', 'The First Mile', 'Aric leaves grief behind and accepts the road.'], ['allied-camp', 'Allied Campfire', 'Strangers become a party around one flame.'], ['territory-trials', 'Trials of Three Territories', 'Each frontier forces a different sacrifice.'], ['father-shadow', 'The Demon s Shadow', 'A familiar stance reveals an impossible connection.'], ['bloodline-truth', 'Bloodline Truth', 'Aric learns the demon king is his father.'], ['gate-march', 'March on the Black Gate', 'Every ally he met marches beside him.']],
                climax: ['last-son-strike', 'Last Son Strike', 'Aric defeats his father without surrendering the bonds that made him stronger.'],
                plotTwist: ['demon-inheritance', 'Demon Inheritance', 'The fallen king offers Aric the throne and its power.'],
                quickEvents: [['roadside-rumor', 'Roadside Rumor', 'A discarded lead points the party to the next territory.']],
            },
        ],
    },
    {
        id: ARCHETYPES.SHOJO,
        prefix: 'shojo',
        theme: 'emotion, romance and visible magic',
        sharedCharacters: [['best-friend', 'Best Friend Emi', 'Reads feelings before words.'], ['class-rival', 'Class Rival Rika', 'Makes every emotion public.']],
        sharedItems: [['ribbon-charm', 'Ribbon Charm', 'Keeps one honest promise.'], ['star-compact', 'Star Compact', 'Reflects a hidden truth.']],
        heroes: [
            {
                slug: 'mage-luna',
                name: 'Card Mage Luna',
                strategy: 'engine',
                resource: 'SP',
                description: 'A magical heroine who captures runaway feelings as cards.',
                support: ['seal-familiar', 'Seal Familiar Pipi', 'Finds magic before Luna can.'],
                item: ['capture-wand', 'Capture Wand', 'Seals a spell with a flourish.'],
                location: ['moon-school', 'Moonlit School', 'Ordinary hallways conceal magic.'],
                extraMaterials: [
                    { kind: 'item', card: ['bloom-seal', 'Bloom Seal Key', 'A final seal holding the feelings Luna already saved.'] },
                    { kind: 'support', card: ['true-heart-sakura', 'True Heart Sakura', 'Her honest wish opens the last captured heart.'] },
                ],
                normalEvents: [['first-transform', 'First Transformation', 'A ribbon becomes a uniform.'], ['runaway-heart', 'Runaway Heart Card', 'Emotion escapes into the city.'], ['moon-capture', 'Moon Capture', 'Luna learns restraint.'], ['secret-reveal', 'Secret Reveal', 'Her double life becomes visible.']],
                eventMaterials: [['capture-wand'], ['seal-familiar', 'moon-school'], ['ribbon-charm', 'best-friend'], ['star-compact', 'class-rival']],
                eventMaterialCounts: [1, 2, 2, 2],
                climax: ['eternal-bloom', 'Eternal Card Bloom', 'Every sealed heart blooms together.'],
                climaxMaterials: ['bloom-seal', 'true-heart-sakura'],
                plotTwist: ['unsealed-sorrow', 'Unsealed Sorrow', 'One feeling refuses a happy ending.'],
            },
            {
                slug: 'diary-mio',
                name: 'Ordinary Diary Mio',
                strategy: 'bond',
                resource: 'SP',
                description: 'A direct romance heroine powered by honest friends.',
                support: ['wingwoman-saki', 'Wingwoman Saki', 'Pushes Mio to speak first.'],
                item: ['heart-diary', 'Heart Diary', 'Pages full of unsent sentences.'],
                location: ['rainy-crossing', 'Rainy Crossing', 'One umbrella changes everything.'],
                extraMaterials: [
                    { kind: 'item', card: ['answered-letter', 'Answered Letter', 'A reply written only after every misunderstanding is faced.'] },
                    { kind: 'location', card: ['sunrise-rooftop', 'Sunrise Rooftop', 'Where Mio finally reads the last page aloud.'] },
                ],
                normalEvents: [['shared-umbrella', 'Shared Umbrella', 'A small kindness becomes a rumor.'], ['first-date', 'First Date', 'Mio risks being understood.'], ['missed-message', 'Missed Message', 'A silence tests whether she will keep trusting.'], ['confession-rain', 'Confession in Rain', 'She stops hiding in narration.']],
                eventMaterials: [['heart-diary'], ['wingwoman-saki', 'rainy-crossing'], ['ribbon-charm', 'best-friend'], ['star-compact', 'class-rival']],
                eventMaterialCounts: [1, 2, 2, 2],
                climax: ['answer-at-dawn', 'Answer at Dawn', 'The final page receives an answer.'],
                climaxMaterials: ['answered-letter', 'sunrise-rooftop'],
                plotTwist: ['lost-page', 'Lost Diary Page', 'A missing truth interrupts the confession.'],
            },
            {
                slug: 'princess-sera',
                name: 'Lost Princess Sera',
                strategy: 'control',
                resource: 'FP',
                description: 'A forgotten heir uncovering a dangerous kingdom.',
                support: ['guard-toma', 'Royal Guard Toma', 'Recognizes the crest before Sera does.'],
                item: ['moon-tiara', 'Moon Tiara', 'Evidence that also paints a target.'],
                location: ['masked-palace', 'Masked Palace', 'Every ballroom guest has an agenda.'],
                extraMaterials: [
                    { kind: 'item', card: ['oath-scroll', 'Oath Scroll', 'The court records what Sera promises before coronation.'] },
                    { kind: 'support', card: ['gate-witness', 'Gate Witness Elen', 'She saw who opened the palace for the exiled heir.'] },
                    { kind: 'item', card: ['royal-seal', 'Royal Silver Seal', 'Authority returned only after the oath is tested.'] },
                    { kind: 'location', card: ['silver-throne', 'Silver Throne Hall', 'The realm gathers to hear its true heir.'] },
                ],
                normalEvents: [['palace-dream', 'Palace Dream', 'Sera remembers a throne.'], ['hidden-crest', 'Hidden Crest', 'The court sees her proof.'], ['masquerade-threat', 'Masquerade Threat', 'An assassin tests her resolve.'], ['exile-return', 'Return from Exile', 'Allies open the gates.'], ['coronation-oath', 'Coronation Oath', 'She names what she will protect.']],
                eventMaterials: [['moon-tiara'], ['guard-toma', 'masked-palace'], ['ribbon-charm', 'class-rival'], ['star-compact', 'best-friend'], ['oath-scroll', 'gate-witness']],
                eventMaterialCounts: [1, 2, 2, 2, 2],
                climax: ['silver-kingdom', 'Silver Kingdom Return', 'Her truth reaches the entire realm.'],
                climaxMaterials: ['royal-seal', 'silver-throne'],
                plotTwist: ['false-heir', 'False Heir', 'A rival presents an impossible bloodline.'],
            },
            {
                slug: 'idol-hikari',
                name: 'Idol Heart Hikari',
                strategy: 'rush',
                resource: 'FP',
                eventStoryBonus: 2,
                eventSelfFillerDelta: -2,
                description: 'An idol heroine converting public pressure into a dazzling lead.',
                support: ['manager-koh', 'Manager Koh', 'Counts every heartbeat and deadline.'],
                item: ['stage-mic', 'Stage Microphone', 'Turns a whisper into a stadium moment.'],
                location: ['festival-stage', 'Festival Stage', 'Spotlights expose every hesitation.'],
                extraMaterials: [
                    { kind: 'item', card: ['encore-setlist', 'Encore Setlist', 'A song order rewritten after the scandal.'] },
                    { kind: 'location', card: ['starlight-platform', 'Starlight Platform', 'A final stage with nowhere left to hide.'] },
                ],
                normalEvents: [['audition-call', 'Audition Call', 'Hikari steps into public view.'], ['viral-song', 'Viral Song', 'Her feelings become everyone s chorus.'], ['scandal-night', 'Scandal Night', 'Fame demands a response.'], ['encore-promise', 'Encore Promise', 'She sings without a mask.']],
                eventMaterials: [['stage-mic'], ['manager-koh', 'festival-stage'], ['ribbon-charm', 'class-rival'], ['star-compact', 'best-friend']],
                eventMaterialCounts: [1, 2, 2, 2],
                climax: ['starlight-confession', 'Starlight Confession', 'The whole crowd hears the truth.'],
                climaxMaterials: ['encore-setlist', 'starlight-platform'],
                plotTwist: ['blackout-stage', 'Blackout Stage', 'Silence arrives at the decisive note.'],
            },
            {
                slug: 'loop-ren',
                name: 'Loopbound Ren',
                strategy: 'bond',
                resource: 'SP',
                description: 'A reincarnated soul relives the same life until love offers a route home.',
                support: ['haru-memory', 'Haru of Every Spring', 'The one face Ren recognizes in every lifetime.'],
                item: ['cracked-watch', 'Cracked Loop Watch', 'Its hands reset whenever Ren dies.'],
                location: ['station-platform', 'Last Train Platform', 'A meeting point unchanged across lives.'],
                extraMaterials: [
                    { kind: 'item', card: ['letter-many-lives', 'Letter Across Lives', 'A confession carried through resets.'] },
                    { kind: 'location', card: ['return-door', 'Door of Return', 'A threshold opening only after honest farewell.'] },
                ],
                normalEvents: [['first-reset', 'First Reset', 'Ren wakes after death in the same morning.'], ['recognition', 'The Face That Remains', 'Haru remembers a feeling she should not know.'], ['lives-in-love', 'Lives Spent in Love', 'Ren stops treating affection as a failed timeline.'], ['last-loop', 'The Last Loop', 'A final death offers a path beyond repetition.'], ['farewell-promise', 'Farewell Promise', 'Ren chooses truth before the door opens.']],
                climax: ['worldward-return', 'Return Beyond the World', 'Love releases Ren from reincarnation and leads back home.'],
                plotTwist: ['one-more-life', 'One More Life', 'Haru asks for one more lifetime together.'],
                quickEvents: [['remember-tomorrow', 'Remember Tomorrow', 'Ren abandons one possibility to recover the next moment.']],
            },
            {
                slug: 'wildlight-nao',
                name: 'Wildlight Nao',
                strategy: 'engine',
                resource: 'SP',
                description: 'A magical girl without powers gathers the wild energy consuming her city.',
                support: ['botanist-yori', 'Botanist Yori', 'Recognizes monsters as frightened lifeforms.'],
                item: ['restoration-wand', 'Restoration Wand', 'Absorbs unstable magic and restores ordinary life.'],
                location: ['storm-park', 'Stormglass Park', 'Plants and animals twist under runaway light.'],
                extraMaterials: [
                    { kind: 'support', card: ['friend-mayu', 'Mayu in the Shelter', 'Nao s friend refuses to abandon the city.'] },
                    { kind: 'item', card: ['world-seed', 'World Seed', 'Holds more wild force than a body should endure.'] },
                    { kind: 'item', card: ['city-core', 'City Light Core', 'The restored district lends Nao one controlled spark.'] },
                    { kind: 'location', card: ['sunbreak-sanctuary', 'Sunbreak Sanctuary', 'Survivors gather beyond the last wild surge.'] },
                    { kind: 'item', card: ['radiance-vessel', 'Radiance Vessel', 'A vessel able to receive the world s excess light.'] },
                    { kind: 'location', card: ['restored-horizon', 'Restored Horizon', 'A peaceful skyline waiting beyond the storm.'] },
                ],
                normalEvents: [['powerless-call', 'Powerless Call', 'Nao faces the first monster without transforming.'], ['wand-awakening', 'Wand Awakening', 'The lost wand restores a corrupted creature.'], ['garden-rescue', 'Garden Rescue', 'Nao saves her friends as the storm spreads.'], ['beast-to-bloom', 'Beast to Bloom', 'Absorbed power returns monsters to plants and animals.'], ['world-surge', 'World Surge', 'All wild energy converges on the city.']],
                eventMaterials: [['restoration-wand'], ['botanist-yori', 'storm-park'], ['friend-mayu', 'ribbon-charm'], ['world-seed', 'star-compact'], ['city-core', 'sunbreak-sanctuary']],
                eventMaterialCounts: [1, 2, 2, 2, 2],
                climax: ['pure-radiance', 'Pure Radiance', 'Nao becomes living energy to absorb the world s uncontrolled force.'],
                climaxMaterials: ['radiance-vessel', 'restored-horizon'],
                plotTwist: ['last-petal', 'Last Petal', 'One remaining creature refuses to let her vanish.'],
                quickEvents: [['wand-trace', 'Wand Energy Trace', 'Nao spends a fragment of magic to locate the next surge.']],
            },
        ],
    },
    {
        id: ARCHETYPES.ISEKAI,
        prefix: 'isekai',
        theme: 'foreign worlds, bargains and improbable power',
        sharedCharacters: [['guild-clerk', 'Guild Clerk Mina', 'Turns quests into survival.'], ['dragon-ally', 'Ancient Dragon Rook', 'An ally too large to ignore.']],
        sharedItems: [['world-map', 'Incomplete World Map', 'Shows paths, not consequences.'], ['mana-potion', 'Mana Potion', 'One more spell at a price.']],
        heroes: [
            { slug: 'cheat-kai', name: 'Cheat Hero Kai', strategy: 'rush', resource: 'SP', eventSelfFillerDelta: 2, description: 'An overpowered summon trying to clear the world quickly.', support: ['tutor-fia', 'Spell Tutor Fia', 'Explains rules Kai ignores.'], item: ['cheat-window', 'Cheat Window', 'An interface no one else sees.'], location: ['starter-village', 'Starter Village', 'A tutorial worth saving.'], normalEvents: [['summon-circle', 'Summoning Circle', 'Kai arrives with unfair numbers.'], ['skill-unlock', 'Cheat Skill Unlock', 'The world system yields.'], ['castle-rush', 'Castle Rush', 'He skips the expected journey.']], climax: ['demon-speedrun', 'Demon Lord Speedrun', 'Kai challenges the ending early.'], plotTwist: ['patch-note', 'Emergency Patch Note', 'The world finally balances him.'] },
            { slug: 'slime-rimu', name: 'Slime Founder Rimu', strategy: 'engine', resource: 'SP', description: 'A small monster building a nation through alliances.', support: ['minister-garo', 'Minister Garo', 'Organizes a growing village.'], item: ['nation-charter', 'Nation Charter', 'Names duties before borders.'], location: ['monster-capital', 'Monster Capital', 'A settlement becomes a promise.'], extraMaterials: [{ kind: 'item', card: ['unity-charter', 'Unity Charter', 'Every allied tribe signs the nation into being.'] }, { kind: 'location', card: ['summit-capital', 'Summit Capital Hall', 'The new nation gathers beneath one banner.'] }], normalEvents: [['cave-rebirth', 'Cave Rebirth', 'Rimu wakes without a human body.'], ['tribe-name', 'Name the Tribe', 'Names become power and duty.'], ['trade-pact', 'Trade Pact', 'Peace earns resources.'], ['border-war', 'Border War', 'A nation must defend itself.'], ['summit-call', 'Summit Call', 'Every faction arrives at one table.']], climax: ['one-banner', 'Nation Under One Banner', 'Rimu makes coexistence unavoidable.'], climaxMaterials: ['unity-charter', 'summit-capital'], plotTwist: ['ancient-claim', 'Ancient Claim', 'An older ruler demands the land.'] },
            { slug: 'villainess-ema', name: 'Farming Villainess Ema', strategy: 'control', resource: 'FP', description: 'A doomed noble farming her way out of war.', support: ['field-knight', 'Field Knight Orin', 'Guards harvests and secrets.'], item: ['rice-ledger', 'Rice Ledger', 'Production rewritten as strategy.'], location: ['peace-fields', 'Peace Fields', 'Crops grow where armies expected battle.'], extraMaterials: [{ kind: 'item', card: ['peace-ledger', 'Peace Harvest Ledger', 'Records enough food to make war economically absurd.'] }, { kind: 'location', card: ['shared-feast', 'Shared Feast Hall', 'Enemy banners lower around the same harvest table.'] }], normalEvents: [['bad-end-memory', 'Bad End Memory', 'Ema sees her execution.'], ['first-harvest', 'First Harvest', 'Food changes political math.'], ['tax-revolt', 'Tax Revolt', 'The nobles demand their old route.'], ['peace-feast', 'Peace Feast', 'Enemies share the same table.']], climax: ['harvest-ending', 'Harvest Route Ending', 'Ema replaces tragedy with abundance.'], climaxMaterials: ['peace-ledger', 'shared-feast'], plotTwist: ['blight-season', 'Blight Season', 'One rotten crop threatens the peace.'] },
            { slug: 'artisan-nia', name: 'Summoned Artisan Nia', strategy: 'engine', resource: 'FP', description: 'A crafter recovering broken relics into impossible tools.', support: ['salvager-pep', 'Salvager Pep', 'Finds treasure in discarded scenes.'], item: ['portable-forge', 'Portable Forge', 'Repairs what the story abandons.'], location: ['ruin-market', 'Ruin Market', 'Lost objects find new owners.'], extraMaterials: [{ kind: 'item', card: ['gate-blueprint', 'Masterwork Blueprint', 'Translates salvaged relics into a stable final design.'] }, { kind: 'location', card: ['anvil-gate', 'Anvil Gate Workshop', 'Nia assembles the portal without sacrificing its craft.'] }], normalEvents: [['workshop-fall', 'Workshop Fall', 'Nia lands among broken artifacts.'], ['relic-repair', 'Relic Repair', 'A discarded tool returns useful.'], ['guild-contract', 'Guild Contract', 'Craft earns political weight.'], ['world-anvil', 'World Anvil', 'The final material is revealed.']], climax: ['masterwork-gate', 'Masterwork Gate', 'Her creation opens a way home.'], climaxMaterials: ['gate-blueprint', 'anvil-gate'], plotTwist: ['shattered-blueprint', 'Shattered Blueprint', 'A lost fragment changes the design.'] },
            {
                slug: 'vending-hako',
                name: 'Vending Shogun Hako',
                strategy: 'engine',
                resource: 'SP',
                description: 'A reincarnated vending machine earns loyalty in ancient Japan one offering at a time.',
                support: ['ronin-chiyo', 'Ronin Chiyo', 'Carries Hako through provinces and speaks for the machine.'],
                item: ['coin-slot', 'Sacred Coin Slot', 'Accepts offerings and dispenses impossible provisions.'],
                location: ['roadside-shrine', 'Roadside Shrine Stall', 'Villagers first mistake Hako for a minor god.'],
                extraMaterials: [
                    { kind: 'item', card: ['tea-can', 'Warm Tea Can', 'A diplomatic gift no daimyo can reproduce.'] },
                    { kind: 'support', card: ['merchant-kiku', 'Merchant Kiku', 'Turns miraculous goods into political influence.'] },
                    { kind: 'location', card: ['castle-court', 'Castle Court', 'The final market is also a battlefield.'] },
                ],
                normalEvents: [['fallen-machine', 'Fallen Machine at the Shrine', 'Hako wakes without limbs in a war-torn province.'], ['ronin-pact', 'Ronin Pact', 'Chiyo learns what each glowing button provides.'], ['tea-diplomacy', 'Tea Can Diplomacy', 'Refreshments halt a feud long enough to bargain.'], ['merchant-revolt', 'Merchant Revolt', 'Hako funds commoners against a starving lord.'], ['castle-siege', 'Siege by Supply', 'An army follows the machine that never runs dry.'], ['throne-offering', 'Offering at the Throne', 'The capital accepts Hako as more than an object.']],
                climax: ['steel-shogunate', 'Steel Shogunate', 'A vending machine becomes shogun by feeding a country before ruling it.'],
                plotTwist: ['empty-stock', 'Out of Stock', 'The decisive offering jams inside Hako s old mechanism.'],
                quickEvents: [['restock-offering', 'Restock Offering', 'Hako spends a coin reserve to dispense the next turning point.']],
            },
            {
                slug: 'refused-yuna',
                name: 'Refused Reincarnation Yuna',
                strategy: 'control',
                resource: 'SP',
                description: 'A girl repeatedly offers her life for reincarnation, while gatekeepers fear what she would become.',
                support: ['gatekeeper-noa', 'Gatekeeper Noa', 'Guides other souls across while denying Yuna passage.'],
                item: ['offering-thread', 'Offering Thread', 'Marks every life Yuna tried to trade.'],
                location: ['crossroads-office', 'Crossroads Office', 'A waiting room between tragic worlds.'],
                extraMaterials: [
                    { kind: 'support', card: ['saved-soul', 'Saved Soul Emi', 'A stranger reincarnated because Yuna intervened.'] },
                    { kind: 'location', card: ['sealed-gate', 'Sealed Reincarnation Gate', 'The door barred specifically against Yuna.'] },
                    { kind: 'item', card: ['ruin-permit', 'Forbidden Reincarnation Permit', 'A stamped permission Noa hoped would never be issued.'] },
                    { kind: 'location', card: ['ruined-horizon', 'Ruined New Horizon', 'The world that awaits Yuna beyond the gate.'] },
                ],
                normalEvents: [['first-offer', 'First Offering', 'Yuna offers her future so a dying child can cross.'], ['denial-stamp', 'Denial Stamp', 'The gatekeepers reject only her application.'], ['borrowed-fates', 'Borrowed Fates', 'She meets lives changed by her sacrifices.'], ['danger-file', 'The Danger File', 'Noa reveals why the gate fears her soul.'], ['open-at-last', 'The Gate Opens at Last', 'Yuna smiles when the prohibition breaks.']],
                climax: ['beautiful-ruin', 'Reincarnation of Ruin', 'Yuna reaches another world, implying she came only to destroy it.'],
                climaxMaterials: ['ruin-permit', 'ruined-horizon'],
                plotTwist: ['one-soul-plea', 'One Soul Pleads', 'A saved life asks Yuna to choose creation instead.'],
                quickEvents: [['crossroads-petition', 'Crossroads Petition', 'Yuna discards another denied request to force her file forward.']],
            },
            {
                slug: 'bartender-zatos',
                name: 'Forbidden Bartender Zatos',
                strategy: 'engine',
                resource: 'SP',
                eventStoryBonus: 2,
                eventOpponentFillerBonus: 2,
                description: 'Zatos spreads forbidden taverns through Dragant, the city of the dead and occupied Brassfang.',
                routeId: 'last-call',
                routeLabel: 'Ruta Ultima Ronda',
                support: ['persley', 'P.E.R.S.L.E.Y', 'A bioalchemical android companion who guards Zatos, gathers energy crystals and contains a hidden Berserk presence.'],
                item: ['traveling-tap', 'Forbidden Traveling Tap', 'A portable bar rig outlawed by imperial decree.'],
                location: ['dragant-bar', 'The Molten Scale Bar', 'A tavern for dragons disguised as people.'],
                extraMaterials: [
                    { kind: 'support', card: ['tower-medium', 'Tower Medium Shiki', 'A medium whose illusion grants the dead one last ordinary night.'] },
                    { kind: 'item', card: ['farewell-glass', 'Farewell Glass', 'A cup reserved for spirits who accept their final truth.'] },
                    { kind: 'item', card: ['remorse-ledger', 'Ledger of Last Remorse', 'Records the final truths confessed before each spirit fades.'] },
                    { kind: 'support', card: ['orc-brewer', 'Brassfang Brewer', 'An orc artisan who hides rebel plans beneath the foam of each cask.'] },
                    { kind: 'item', card: ['regent-weapon', 'Captured Regent Weapon', 'A seized bioalchemical weapon proving how the Empire rules Brassfang.'] },
                    { kind: 'item', card: ['rebellion-barrel', 'Rebellion Barrel', 'A cask rolled into the street as the signal for uprising.'] },
                    { kind: 'item', card: ['valkania-map', 'Contraband Map of Valkania', 'Tavern routes expose hidden passages into the imperial capital.'] },
                    { kind: 'location', card: ['valkania-underbar', 'Valkania Underbar', 'A concealed counter beneath the capital where proof reaches its final patron.'] },
                    { kind: 'location', card: ['last-call-tower', 'Last Call Tower', 'A bar where remorseful dead drink once before fading.'] },
                    { kind: 'location', card: ['brassfang-city', 'Brassfang', 'A former orc trading city subdued by a bioalchemical regent.'] },
                ],
                normalEvents: [['dragant-license', 'Dragant: Fireproof License', 'Zatos convinces dragon nobles that ale can be treasure.'], ['dragant-cellar', 'Dragant: Cellar of Hoards', 'A second round turns territorial hoarding into alliance.'], ['shiki-illusion', 'Nameless Kingdom: Shiki s Illusion', 'The new tavern reveals patrons who are already dead.'], ['last-remorse', 'Nameless Kingdom: Last Remorse', 'Every ghost receives one final drink and truth.'], ['brassfang-bar', 'Brassfang: Bar Against the Regent', 'Orcs and beastfolk gather where resistance can speak.'], ['broken-tavern', 'Brassfang: The Broken Tavern', 'Clients destroy the bar while overthrowing the imperial weapon.']],
                climax: ['valkania-capital', 'Last Call in Valkania', 'Zatos reaches the capital seeking the truth of Emperor Ard Mahl.'],
                plotTwist: ['imperial-prohibition', 'Imperial Prohibition', 'Ard Mahl declares every tavern a weapon of rebellion.'],
                quickEvents: [['tab-rumor', 'A Rumor on the Tab', 'Discard an unpaid debt to learn where the next bar must open.']],
                eventMaterials: [
                    ['traveling-tap'],
                    ['persley', 'dragant-bar'],
                    ['tower-medium', 'last-call-tower'],
                    ['farewell-glass', 'remorse-ledger'],
                    ['brassfang-city', 'orc-brewer'],
                    ['regent-weapon', 'rebellion-barrel'],
                ],
                eventMaterialCounts: [1, 2, 2, 2, 2, 2],
                climaxMaterials: ['valkania-map', 'valkania-underbar'],
            },
            {
                slug: 'bartender-zatos-rainwood',
                name: 'Forbidden Bartender Zatos',
                strategy: 'engine',
                resource: 'SP',
                eventStoryBonus: 2,
                eventOpponentFillerBonus: 2,
                description: 'Zatos follows bioalchemical secrets from a survivor s orb through Rainwood and into Valkania.',
                protagonistSlug: 'bartender-zatos',
                generateAvatar: false,
                routeId: 'rainwood',
                routeLabel: 'Ruta Rainwood',
                support: ['persley', 'P.E.R.S.L.E.Y', 'Zatos s energetic companion gathers crystals to hold back the Berserk presence within her.'],
                item: ['energy-crystals', 'Energy Crystals', 'Charged fragments that keep P.E.R.S.L.E.Y. stable and reveal imperial extraction.'],
                location: ['crystal-quarry', 'Hidden Crystal Quarry', 'An imperial extraction site feeding the same energy that sustains P.E.R.S.L.E.Y.'],
                extraMaterials: [
                    { kind: 'support', card: ['medium', 'Medium', 'The only survivor of her village. Her mysterious crystal orb crosses planes and summons spirits.'] },
                    { kind: 'support', card: ['caballero-w', 'Caballero W', 'A massive knight in dark modern glasses who calls his absurd two-handed wind blade Claire.'] },
                    { kind: 'support', card: ['noland', 'Noland', 'A bearded guardian of the rain-soaked forest who knows bioalchemy and throws a gigantic axe like an apple.'] },
                    { kind: 'item', card: ['spirit-orb', 'Transcendent Crystal Orb', 'Medium uses the orb to reach beyond reality and invite the dead to speak.'] },
                    { kind: 'item', card: ['claire', 'Claire, Wind Greatsword', 'Caballero W named a blade heavy enough to split an imperial gate.'] },
                    { kind: 'item', card: ['imperial-seal', 'Seal of Ard Mahl', 'An imperial authority mark that treats taverns and bioalchemy as contraband.'] },
                    { kind: 'item', card: ['berserk-core', 'Berserk Core Seal', 'A fragile limiter separating P.E.R.S.L.E.Y. from the presence within.'] },
                    { kind: 'item', card: ['rainwood-axe', 'Noland s Rain Axe', 'A massive alchemical axe entrusted only when the forest chooses an ally.'] },
                    { kind: 'item', card: ['rainwood-valkania-map', 'Rainwood Map to Valkania', 'Noland marks a concealed route from the forest to the imperial capital.'] },
                    { kind: 'item', card: ['ard-mahl-dossier', 'Dossier of Ard Mahl', 'Evidence connecting the emperor to forbidden bioalchemy.'] },
                    { kind: 'location', card: ['rainwood-lodge', 'Rainwood Lodge', 'Noland protects an ancestral secret beneath a forest where rain never stops.'] },
                    { kind: 'location', card: ['capital-cellar', 'Capital Underbar', 'A final illegal bar opened beneath Valkania s palace.'] },
                    { kind: 'support', card: ['throneguard', 'Disillusioned Throneguard', 'A palace sentinel who recognizes Ard Mahl s lies in the bartender s evidence.'] },
                ],
                normalEvents: [['orb-survivor', 'The Medium and the Orb', 'A village survivor lets the tavern hear spirits whose warning points toward the Empire.'], ['berserk-presence', 'P.E.R.S.L.E.Y.: The Other Presence', 'Crystal hunger threatens to awaken the being buried inside Zatos s companion.'], ['claire-road', 'Claire Opens the Imperial Road', 'Caballero W cuts through Ard Mahl s pursuit and leads Zatos into the rain forest.'], ['rainwood-oath', 'Rainwood: Noland s Oath', 'Noland reveals the forest secret and the bioalchemical origin of P.E.R.S.L.E.Y. before the capital.']],
                climax: ['truth-on-tap', 'Truth on Tap in Valkania', 'Zatos opens a forbidden final bar beneath the palace and exposes Ard Mahl s bioalchemical empire.'],
                plotTwist: ['berserk-last-call', 'Berserk Last Call', 'The force inside P.E.R.S.L.E.Y. offers imperial power in exchange for freedom.'],
                quickEvents: [['crystal-rumor', 'A Crystal on the Tab', 'Discard a false lead to locate the next bioalchemical clue.']],
                eventMaterials: [
                    ['medium'],
                    ['energy-crystals', 'berserk-core'],
                    ['caballero-w', 'claire'],
                    ['noland', 'rainwood-lodge', 'rainwood-axe'],
                ],
                eventMaterialCounts: [1, 2, 2, 3],
                climaxMaterials: ['rainwood-valkania-map', 'ard-mahl-dossier', 'capital-cellar', 'throneguard'],
            },
        ],
    },
];

const QUICK_EVENT_SET: Named[] = [
    ['commercial-break', 'Commercial Break', 'Interrupts momentum long enough to regroup.'],
    ['training-montage', 'Training Montage', 'Condenses effort into visible growth.'],
    ['misunderstanding', 'Misunderstanding', 'Noise spreads through any story.'],
    ['recap', 'Recap Episode', 'Repeats context while buying options.'],
    ['rival-cut-in', 'Rival Cut-In', 'An opponent claims the frame.'],
    ['last-save', 'Last Minute Save', 'Someone returns exactly on cue.'],
    ['genre-shift', 'Genre Shift', 'The narrative changes its rules.'],
    ['plot-armor', 'Plot Armor', 'The story refuses an early defeat.'],
    ['resolution-key', 'Resolution Key', 'A final symbolic piece for a Climax.'],
    ['reversal-cut', 'Reversal Cut', 'A hidden setup for the final response.'],
];

function fx(type: EffectType, value: number, target: 'SELF' | 'OPPONENT', description: string, extra: Partial<CardEffect> = {}): CardEffect {
    return { type, value, target, description, ...extra };
}

function add(card: CardData): void {
    CARDS[card.id] = card;
}

function line(prefix: string, hero: string): string {
    return `${prefix}-hero-${hero}`;
}

function strategyEffects(strategy: Strategy, stage = 0): CardEffect[] {
    if (strategy === 'rush') return [fx(EffectType.STORY, 2 + Math.min(stage, 3), 'SELF', `Gain +${2 + Math.min(stage, 3)} SP when an Event is completed.`)];
    if (strategy === 'engine') return stage > 1
        ? [fx(EffectType.STORY, 2, 'SELF', 'Gain +2 SP when an Event is completed.'), fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card when an Event is completed.')]
        : [fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card when an Event is completed.')];
    if (strategy === 'bond') return [fx(EffectType.STORY, 3, 'SELF', 'Gain +3 SP when the scene advances.')];
    return [fx(EffectType.FILLER, -2 - Math.min(stage, 2), 'SELF', `Reduce your FP by ${2 + Math.min(stage, 2)} when an Event is completed.`)];
}

function eventEffects(strategy: Strategy, step: number): CardEffect[] {
    const story = 3 + step;
    const effects = [fx(EffectType.STORY, story, 'SELF', `Gain +${story} SP when this Event resolves.`)];
    if (strategy === 'rush') effects.push(fx(EffectType.FILLER, 1 + (step > 1 ? 1 : 0), 'OPPONENT', 'Give the rival FP from the pressure of this arc.'));
    if (strategy === 'engine' && step % 2 === 1) effects.push(fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card when this Event resolves.'));
    if (strategy === 'control' && step >= 1) effects.push(fx(EffectType.BLOCK_RANDOM_HAND_CARD_NEXT_TURN, 1, 'OPPONENT', 'Silence one random rival hand card next turn.', { turns: 1 }));
    return effects;
}

function heroEventEffects(hero: Hero): CardEffect[] {
    const effects: CardEffect[] = [];
    if (hero.eventStoryBonus) {
        effects.push(fx(EffectType.STORY, hero.eventStoryBonus, 'SELF', `Gain +${hero.eventStoryBonus} SP from this route identity.`));
    }
    if (hero.eventSelfFillerDelta) {
        const value = hero.eventSelfFillerDelta;
        const description = value > 0
            ? `Gain +${value} FP by accelerating your own arc.`
            : `Reduce your FP by ${Math.abs(value)} by turning pressure into progress.`;
        effects.push(fx(EffectType.FILLER, value, 'SELF', description));
    }
    if (hero.eventOpponentFillerBonus) {
        effects.push(fx(EffectType.FILLER, hero.eventOpponentFillerBonus, 'OPPONENT', `Give the rival +${hero.eventOpponentFillerBonus} FP from this route pressure.`));
    }
    return effects;
}

function materialEffect(kind: 'support' | 'item' | 'location', strategy: Strategy): CardEffect[] {
    if (kind === 'support') return strategy === 'control'
        ? [fx(EffectType.FILLER, -2, 'SELF', 'Reduce your FP by 2 when the Event using this card resolves.')]
        : [fx(EffectType.STORY, 2, 'SELF', 'Gain +2 SP when the Event using this card resolves.')];
    if (kind === 'item') return strategy === 'engine'
        ? [fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card and gain tempo when the Event using this card resolves.')]
        : [fx(EffectType.STORY, 2, 'SELF', 'Gain +2 SP when the Event using this card resolves.')];
    return [fx(EffectType.FILLER, -2, 'SELF', 'Reduce your FP by 2 when the Event using this Location resolves.')];
}

function eventResourceRequirement(resource: Resource, step: number): CardRequirement {
    const storyThresholds = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];
    const fillerThresholds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const thresholds = resource === 'SP' ? storyThresholds : fillerThresholds;
    const value = thresholds[Math.min(step, thresholds.length - 1)];
    return resource === 'SP'
        ? { type: 'STORY_MIN', value, description: `Requires ${value} SP.` }
        : { type: 'FILLER_MIN', value, description: `Requires ${value} FP.` };
}

function progressiveMaterialCount(step: number, totalNormalEvents: number): number {
    void totalNormalEvents;
    if (step === 0) return 1;
    return 2;
}

function routeMaterialRequirement(
    materialIds: string[],
    step: number,
    totalNormalEvents: number,
    customIds?: string[],
    customCount?: number,
): CardRequirement {
    const value = customCount ?? progressiveMaterialCount(step, totalNormalEvents);
    const eligibleIds = customIds?.length ? customIds : step === 0 ? materialIds.slice(0, 1) : materialIds;
    return {
        type: 'CARD_ON_BOARD',
        cardIds: eligibleIds,
        value,
        description: `Requires ${value} valid route material(s) in the current arc.`,
    };
}

for (const plan of plans) {
    const sharedCharacterIds = plan.sharedCharacters.map(card => `${plan.prefix}-shared-char-${card[0]}`);
    const sharedItemIds = plan.sharedItems.map(card => `${plan.prefix}-shared-item-${card[0]}`);

    plan.sharedCharacters.forEach(([slug, name, description], index) => add({
        id: `${plan.prefix}-shared-char-${slug}`,
        name,
        type: CardType.PERSONAJE,
        cost: 1 + index,
        costResource: 'SP',
        description,
        backstory: `${name} appears across multiple routes of ${plan.theme}.`,
        effects: [fx(EffectType.STORY, 2 + index, 'SELF', `Gain +${2 + index} SP when the Event using this card resolves.`)],
        archetype: plan.id,
        image: `${plan.prefix}-shared-char-${slug}`,
        affinity: { compatibleWith: [] },
        likesData: { likes: [], dislikes: [] },
        maxCopies: 3,
        tags: [`shared:${plan.prefix}`],
    }));
    plan.sharedItems.forEach(([slug, name, description], index) => add({
        id: `${plan.prefix}-shared-item-${slug}`,
        name,
        type: CardType.ITEM,
        cost: 1 + index,
        costResource: 'SP',
        description,
        backstory: `${name} can support any protagonist of this archetype.`,
        effects: index === 0 ? [fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card when the Event using this card resolves.')] : [fx(EffectType.STORY, 3, 'SELF', 'Gain +3 SP when the Event using this card resolves.')],
        archetype: plan.id,
        image: `${plan.prefix}-shared-item-${slug}`,
        maxCopies: 3,
        tags: [`shared:${plan.prefix}`],
    }));

    for (const [slug, name, description] of QUICK_EVENT_SET) {
        const tokenId = `${plan.prefix}-token-${slug}`;
        const requirements: CardRequirement[] = [];
        let cost = 1;
        let costResource: Resource = 'SP';
        let effects: CardEffect[];
        switch (slug) {
            case 'commercial-break':
                effects = [fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card immediately.')];
                break;
            case 'training-montage':
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 1, description: 'Requires 1 completed Event.' });
                effects = plan.id === ARCHETYPES.MECHA
                    ? [fx(EffectType.STORY, 2, 'SELF', 'Gain +2 SP immediately.'), fx(EffectType.SEARCH_CARD_TYPE, 1, 'SELF', 'Search 1 Item from your deck.', { cardType: CardType.ITEM })]
                    : [fx(EffectType.STORY, 2, 'SELF', 'Gain +2 SP immediately.'), fx(EffectType.DRAW, 1, 'SELF', 'Draw 1 card immediately.')];
                cost = 2;
                break;
            case 'misunderstanding':
                if (plan.id === ARCHETYPES.ISEKAI) {
                    requirements.push({ type: 'EVENT_COUNT_MIN', value: 1, description: 'Requires 1 completed Event.' });
                    cost = 2;
                }
                effects = plan.id === ARCHETYPES.ISEKAI
                    ? [fx(EffectType.INVOKE_CARD_TO_OPPONENT_HAND, 1, 'OPPONENT', "Add Demon Lord Gouki to the rival's hand.", { cardId: 'isekai-external-demon-lord-gouki' })]
                    : [fx(EffectType.FILLER, 2, 'OPPONENT', 'Give the rival +2 FP immediately.')];
                break;
            case 'recap':
                requirements.push({ type: 'DISCARD_FROM_HAND', value: 1, description: 'Discard 1 card from your hand as an additional cost.' });
                effects = [fx(EffectType.SEARCH_CARD_TYPE, 1, 'SELF', 'Discard 1 card: search 1 normal Event from your deck and add it to your hand.', { cardType: CardType.EVENT })];
                break;
            case 'rival-cut-in':
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 1, description: 'Requires 1 completed Event.' });
                effects = [fx(EffectType.BLOCK_RANDOM_HAND_CARD_NEXT_TURN, 1, 'OPPONENT', 'Silence one random rival hand card during their next turn.', { turns: 1 })];
                break;
            case 'last-save':
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 1, description: 'Requires 1 completed Event.' });
                requirements.push({ type: 'DISCARD_FROM_HAND', value: 2, description: 'Discard 2 cards from your hand as an additional cost.' });
                effects = [fx(EffectType.RECOVER_FROM_CEMETERY, 1, 'SELF', 'Discard 2 cards: recover the last card from your Cemetery to your hand.')];
                costResource = 'FP';
                break;
            case 'genre-shift':
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 1, description: 'Requires 1 completed Event.' });
                effects = [fx(EffectType.NEXT_EVENT_REDUCE_REQUIREMENT, 1, 'SELF', 'Your next Event ignores one requirement.', { turns: 2 })];
                break;
            case 'plot-armor':
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 2, description: 'Requires 2 completed Events.' });
                effects = [fx(EffectType.PROTECT_PROTAGONIST, 1, 'SELF', 'Protect your Protagonist from the next silence effect.', { turns: 2 }), fx(EffectType.STORY, 3, 'SELF', 'Gain +3 SP immediately.')];
                costResource = 'FP';
                cost = 2;
                break;
            case 'resolution-key':
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 2, description: 'Requires 2 completed Events.' });
                effects = [fx(EffectType.SEARCH_CLIMAX, 1, 'SELF', 'Search your Climax Event and add it to your hand.')];
                cost = 2;
                break;
            default:
                requirements.push({ type: 'EVENT_COUNT_MIN', value: 2, description: 'Requires 2 completed Events.' });
                effects = plan.id === ARCHETYPES.MECHA
                    ? [fx(EffectType.BLOCK_CARD_TYPE, 1, 'OPPONENT', 'Prevent the rival from playing Items next turn.', { turns: 1, cardType: CardType.ITEM })]
                    : plan.id === ARCHETYPES.SHOJO
                        ? [fx(EffectType.BLOCK_CARD_TYPE, 1, 'OPPONENT', 'Prevent the rival from playing Characters next turn.', { turns: 1, cardType: CardType.PERSONAJE })]
                        : [fx(EffectType.SILENCE_PROTAGONIST_NEXT_EVENT, 1, 'OPPONENT', "Silence the rival Protagonist's effects on their next Event.", { turns: 2 })];
                cost = 2;
                costResource = 'FP';
                break;
        }
        add({
            id: tokenId,
            name,
            type: CardType.QUICK_EVENT,
            cost,
            costResource,
            description: `${description} It resolves immediately when played.`,
            backstory: `${name} is a fast intervention within ${plan.theme}.`,
            requirements,
            effects,
            archetype: plan.id,
            image: tokenId,
            maxCopies: 2,
            tags: [`shared:${plan.prefix}`, 'quick-event'],
        });
    }

    plan.heroes.forEach((hero, heroIndex) => {
        const protagonistId = line(plan.prefix, hero.protagonistSlug || hero.slug);
        const routeId = hero.routeId || hero.slug;
        const routeTags = [`route:${routeId}`, ...(hero.routeLabel ? [`route-label:${hero.routeLabel}`] : [])];
        const supportId = `${protagonistId}-support-${hero.support[0]}`;
        const itemId = `${protagonistId}-item-${hero.item[0]}`;
        const locationId = `${protagonistId}-loc-${hero.location[0]}`;
        const normalCount = hero.normalEvents.length;
        const totalForms = normalCount + 1;
        const climaxMaterialSlugs = new Set(hero.climaxMaterials || []);
        const normalExtraMaterialIds = (hero.extraMaterials || [])
            .filter(({ card }) => !climaxMaterialSlugs.has(card[0]))
            .map(({ kind, card }) =>
                `${protagonistId}-${kind === 'location' ? 'loc' : kind}-${card[0]}`
            );
        const materialIdBySlug = new Map<string, string>([
            [hero.item[0], itemId],
            [hero.support[0], supportId],
            [hero.location[0], locationId],
            ...plan.sharedItems.map(([slug]) => [slug, `${plan.prefix}-shared-item-${slug}`] as [string, string]),
            ...plan.sharedCharacters.map(([slug]) => [slug, `${plan.prefix}-shared-char-${slug}`] as [string, string]),
            ...(hero.extraMaterials || []).map(({ kind, card }) => [
                card[0],
                `${protagonistId}-${kind === 'location' ? 'loc' : kind}-${card[0]}`,
            ] as [string, string]),
        ]);
        const materialIds = [
            itemId,
            supportId,
            locationId,
            ...normalExtraMaterialIds,
            ...sharedItemIds,
            ...sharedCharacterIds,
        ];

        for (let form = 0; hero.generateAvatar !== false && form < totalForms; form++) {
            const formId = form === 0 ? protagonistId : `${protagonistId}-form-${form + 1}`;
            add({
                id: formId,
                name: form === 0 ? hero.name : `${hero.name} - Arco ${form + 1}`,
                type: CardType.PROTAGONIST,
                cost: 0,
                costResource: hero.resource,
                description: hero.description,
                backstory: `${hero.name} follows a ${hero.strategy} route through ${plan.theme}.`,
                effects: hero.resource === 'FP'
                    ? [fx(EffectType.FILLER, hero.strategy === 'control' ? 4 : 3, 'SELF', `Gain +${hero.strategy === 'control' ? 4 : 3} FP when an Event is completed to fuel this strategy.`), ...strategyEffects(hero.strategy, form)]
                    : strategyEffects(hero.strategy, form),
                entryEffects: form === 0
                    ? [fx(hero.resource === 'SP' ? EffectType.STORY : EffectType.FILLER, hero.resource === 'SP' ? 4 : hero.strategy === 'control' ? 6 : 5, 'SELF', hero.resource === 'SP' ? 'Start the story with +4 SP.' : `Start under pressure with +${hero.strategy === 'control' ? 6 : 5} usable FP.`)]
                    : [],
                archetype: plan.id,
                image: formId,
                maxCopies: 0,
                affinity: { compatibleWith: [supportId, sharedCharacterIds[heroIndex % sharedCharacterIds.length]] },
                likesData: { likes: [supportId, itemId, locationId], dislikes: [sharedCharacterIds[(heroIndex + 1) % sharedCharacterIds.length]] },
                tags: [`line:${protagonistId}`, `form:${form}`, `strategy:${hero.strategy}`, 'avatar-only'],
                protagonistId,
                formIndex: form,
                totalForms,
            });
        }

        if (hero.generateAvatar !== false) {
            add({
                id: supportId,
                name: hero.support[1],
                type: CardType.PERSONAJE,
                cost: hero.resource === 'FP' ? 1 : 1,
                costResource: hero.resource,
                description: hero.support[2],
                backstory: `${hero.support[1]} belongs to the route of ${hero.name}.`,
                effects: materialEffect('support', hero.strategy),
                archetype: plan.id,
                image: supportId,
                affinity: { compatibleWith: [protagonistId] },
                likesData: {
                    likes: [itemId, locationId, ...(hero.slug.startsWith('bartender-zatos') ? [protagonistId] : [])],
                    dislikes: [],
                },
                tags: [`line:${protagonistId}`],
                protagonistId,
                maxCopies: 3,
            });
        }
        add({
            id: itemId,
            name: hero.item[1],
            type: CardType.ITEM,
            cost: 1,
            costResource: hero.resource,
            description: hero.item[2],
            backstory: `${hero.item[1]} is a key material in ${hero.name} s route.`,
            effects: materialEffect('item', hero.strategy),
            archetype: plan.id,
            image: itemId,
            tags: [`line:${protagonistId}`, ...routeTags],
            protagonistId,
            maxCopies: normalCount >= 4 ? 3 : 2,
        });
        add({
            id: locationId,
            name: hero.location[1],
            type: CardType.LOCATION,
            cost: hero.resource === 'FP' ? 2 : 2,
            costResource: hero.resource,
            description: hero.location[2],
            backstory: `${hero.location[1]} anchors a decisive scene for ${hero.name}.`,
            effects: materialEffect('location', hero.strategy),
            archetype: plan.id,
            image: locationId,
            tags: [`line:${protagonistId}`, ...routeTags],
            protagonistId,
        maxCopies: 3,
        });
        (hero.extraMaterials || []).forEach(({ kind, card: [slug, name, description] }) => {
            const materialId = `${protagonistId}-${kind === 'location' ? 'loc' : kind}-${slug}`;
            const type = kind === 'support' ? CardType.PERSONAJE : kind === 'item' ? CardType.ITEM : CardType.LOCATION;
            add({
                id: materialId,
                name,
                type,
                cost: kind === 'item' ? 2 : 3,
                costResource: hero.resource,
                description,
                backstory: `${name} marks a later turning point in the route of ${hero.name}.`,
                effects: materialEffect(kind, hero.strategy),
                archetype: plan.id,
                image: materialId,
                ...(kind === 'support' ? {
                    affinity: { compatibleWith: [protagonistId] },
                    likesData: { likes: [itemId, locationId], dislikes: [] },
                } : {}),
                tags: [`line:${protagonistId}`, ...routeTags, ...(climaxMaterialSlugs.has(slug) ? ['climax-only'] : [])],
                protagonistId,
                maxCopies: 3,
            });
        });
        (hero.quickEvents || []).forEach(([slug, name, description]) => {
            const quickId = `${protagonistId}-quick-${slug}`;
            add({
                id: quickId,
                name,
                type: CardType.QUICK_EVENT,
                cost: 1,
                costResource: hero.resource,
                description: `${description} It resolves immediately when played.`,
                backstory: `${name} keeps the route of ${hero.name} moving without skipping its narrative order.`,
                requirements: [
                    { type: 'DISCARD_FROM_HAND', value: 1, description: 'Discard 1 card from your hand as an additional cost.' },
                ],
                effects: [
                    fx(EffectType.SEARCH_CARD_TYPE, 1, 'SELF', 'Search 1 normal Event from this route in your deck and add it to your hand.', { cardType: CardType.EVENT }),
                ],
                archetype: plan.id,
                image: quickId,
                maxCopies: 2,
                tags: [`line:${protagonistId}`, ...routeTags, 'quick-event'],
                protagonistId,
            });
        });

        let previousEvent: string | undefined;
        hero.normalEvents.forEach(([slug, name, description], step) => {
            const eventId = `${protagonistId}-event-${slug}`;
            const customMaterialIds = hero.eventMaterials?.[step]
                ?.map(materialSlug => materialIdBySlug.get(materialSlug))
                .filter((id): id is string => Boolean(id));
            const requirements: CardRequirement[] = [
                routeMaterialRequirement(materialIds, step, normalCount, customMaterialIds, hero.eventMaterialCounts?.[step]),
                eventResourceRequirement(hero.resource, step),
            ];
            add({
                id: eventId,
                name,
                type: CardType.EVENT,
                cost: Math.min(5, 1 + step),
                costResource: hero.resource,
                description,
                backstory: `${description} In ${hero.name}'s route, this moment redefines the next arc.`,
                eventPrerequisites: previousEvent ? [previousEvent] : [],
                requirements,
                effects: [...eventEffects(hero.strategy, step), ...heroEventEffects(hero)],
                archetype: plan.id,
                image: eventId,
                maxCopies: 1,
                tags: [`line:${protagonistId}`, ...routeTags, `order:${String(step + 1).padStart(2, '0')}`],
                protagonistId,
            });
            previousEvent = eventId;
        });

        const climaxId = `${protagonistId}-climax-${hero.climax[0]}`;
        const climaxMaterialIds = hero.climaxMaterials
            ?.map(materialSlug => materialIdBySlug.get(materialSlug))
            .filter((id): id is string => Boolean(id)) || materialIds;
        const climaxBaseRequirements: CardRequirement[] = [
            { type: 'CARD_ON_BOARD', cardIds: climaxMaterialIds, value: 2, description: 'Requires 2 valid route materials in the Climax arc.' },
            eventResourceRequirement(hero.resource, normalCount),
        ];
        const climaxX4Requirements: CardRequirement[] = [
            { type: 'CARD_ON_BOARD', cardIds: climaxMaterialIds, value: 3, description: 'Requires 3 valid route materials in the Climax arc.' },
            eventResourceRequirement(hero.resource, normalCount + 1),
        ];
        const climaxX10Requirements: CardRequirement[] = [
            { type: 'CARD_ON_BOARD', cardIds: climaxMaterialIds, value: 4, description: 'Requires all 4 slots filled with valid route materials.' },
            eventResourceRequirement(hero.resource, normalCount + 3),
        ];
        add({
            id: climaxId,
            name: hero.climax[1],
            type: CardType.CLIMAX_EVENT,
            cost: hero.resource === 'FP' ? 3 : 5,
            costResource: hero.resource,
            description: hero.climax[2],
            backstory: `${hero.climax[1]} is the Climax Event of ${hero.name}.`,
            eventPrerequisites: previousEvent ? [previousEvent] : [],
            requirements: climaxBaseRequirements,
            climaxTiers: [
                { multiplier: 2, requirements: climaxBaseRequirements },
                { multiplier: 4, requirements: climaxX4Requirements },
                { multiplier: 10, requirements: climaxX10Requirements },
            ],
            effects: [fx(EffectType.STORY, 8, 'SELF', 'Gain +8 SP multiplied by the Climax tier.'), fx(EffectType.FILLER, -2, 'SELF', 'Reduce your FP by 2 multiplied by the Climax tier.')],
            archetype: plan.id,
            image: climaxId,
            maxCopies: 1,
            tags: [`line:${protagonistId}`, ...routeTags, 'climax'],
            protagonistId,
        });

        const plotId = `${protagonistId}-plot-${hero.plotTwist[0]}`;
        const plotEffects = hero.strategy === 'control'
            ? [fx(EffectType.MODIFY_CLIMAX_LEVEL, 2, 'OPPONENT', "Reduce the rival Climax by two tiers."), fx(EffectType.FILLER, -3, 'SELF', 'Reduce your FP by 3.')]
            : hero.strategy === 'rush'
                ? [fx(EffectType.MODIFY_CLIMAX_LEVEL, 1, 'OPPONENT', "Reduce the rival Climax by one tier."), fx(EffectType.STORY, 5, 'SELF', 'Gain +5 SP during the response.')]
                : [fx(EffectType.MODIFY_CLIMAX_LEVEL, 1, 'OPPONENT', "Reduce the rival Climax by one tier."), fx(EffectType.FILLER, 4, 'OPPONENT', 'Give the rival +4 FP.')];
        add({
            id: plotId,
            name: hero.plotTwist[1],
            type: CardType.PLOT_TWIST_EVENT,
            cost: 0,
            costResource: hero.resource,
            description: hero.plotTwist[2],
            backstory: `${hero.plotTwist[1]} is the last comeback chance of ${hero.name}.`,
            requirements: [
                { type: 'CARD_ON_BOARD', cardIds: climaxMaterialIds, value: 2, description: 'Requires 2 valid route materials during the response.' },
                eventResourceRequirement(hero.resource, Math.max(1, normalCount - 2)),
            ],
            effects: plotEffects,
            archetype: plan.id,
            image: plotId,
            maxCopies: 0,
            tags: [`line:${protagonistId}`, ...routeTags, 'plot-twist', 'response-only'],
            protagonistId,
        });
    });
}

add({
    id: 'isekai-external-demon-lord-gouki',
    name: 'Demon Lord Gouki',
    type: CardType.PERSONAJE,
    cost: 0,
    costResource: 'SP',
    description: 'A demon beyond dimensions who enjoys unsettling beings from other worlds.',
    backstory: 'Gouki appears uninvited, occupies someone else s hand, and demands the spotlight.',
    effects: [fx(
        EffectType.HAND_RANDOM_FILLER_THEN_DISCARD,
        3,
        'SELF',
        'While this card stays in your hand, gain 1 to 3 FP at the start of your turn for 3 turns; then it goes to the Cemetery.',
        { turns: 3 },
    )],
    archetype: ARCHETYPES.ISEKAI,
    image: 'isekai-external-demon-lord-gouki',
    maxCopies: 0,
    affinity: { compatibleWith: [] },
    likesData: { likes: [], dislikes: [] },
    tags: ['external-only', 'demon-lord'],
});
