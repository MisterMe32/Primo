import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';



const seenItems = new Set();
const activeSearches = new Set();
const activeIntervals = new Map();
const runningSearches = new Map();

global.activeSearches = activeSearches;
global.activeIntervals = activeIntervals;

const blockedWords = [

    // losse accessoires
    'controller',
    'joycon grip',
    'joy-con grip',
    'grip',
    'case',
    'hoes',
    'etui',
    'cover',
    'skin',
    'sticker',

    // losse onderdelen
    'dock only',
    'tablet only',
    'screen only',
    'charger',
    'oplader',
    'adapter',

    // defecten
    'defect',
    'kapot',
    'repair',
    'onderdelen',
    'works not',
    'werkt niet',
    'for parts',

    // irrelevante listings
    'gezocht',
    'huur',
    'verhuur',

    // games/accessoires
    'pokemon kaart',
    'amiibo',
    'controller only',
    'joycon only',
    'joy-con only'
];

function calculateEstimatedValue(title) {

    title = title.toLowerCase();

    let estimatedValue = 0;
    let type = 'UNKNOWN';

    // OLED
    if (
        title.includes('oled')
    ) {
        estimatedValue = 290;
        type = 'OLED';
    }

    // LITE
    else if (
        title.includes('lite')
    ) {
        estimatedValue = 135;
        type = 'LITE';
    }

    // V2 / normale switch
    else if (
        title.includes('switch')
    ) {
        estimatedValue = 210;
        type = 'NORMAL';
    }

    // Extra waarde accessoires
    if (
        title.includes('dock')
    ) {
        estimatedValue += 15;
    }

    if (
        title.includes('joycon') ||
        title.includes('joy-con')
    ) {
        estimatedValue += 10;
    }

    if (
        title.includes('mario kart')
    ) {
        estimatedValue += 25;
    }

    if (
        title.includes('pokemon')
    ) {
        estimatedValue += 20;
    }

    if (
        title.includes('zelda')
    ) {
        estimatedValue += 20;
    }

    return {
        estimatedValue,
        type
    };
}

function getMaxBuy(title) {

    title = title.toLowerCase();

    if (title.includes('oled')) {
        return 180;
    }

    if (title.includes('lite')) {
        return 70;
    }

    return 120;
}

export default {

    data: new SlashCommandBuilder()
        .setName('switch2')
        .setDescription('Zoek Nintendo Switch deals op Marktplaats')
        .addIntegerOption(option =>
            option
                .setName('maxprijs')
                .setDescription('Max prijs')
                .setRequired(true)
        ),

    async execute(interaction) {

        const maxprijs = interaction.options.getInteger('maxprijs');

        const searchKey = `switch-${maxprijs}`;

        if (activeSearches.has(searchKey)) {
            return interaction.reply('⚠️ Deze search draait al.');
        }

        activeSearches.add(searchKey);

        await interaction.reply(
            `🎮 Zoeken naar Nintendo Switch deals onder €${maxprijs}`
        );

        let firstRun = true;

        const interval = setInterval(async () => {

            if (runningSearches.get(searchKey)) return;

            runningSearches.set(searchKey, true);

            try {

                const url =
`https://www.marktplaats.nl/lrp/api/search?query=nintendo%20switch&limit=30&offset=0`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    }
                });

                const json = await response.json();

                const items = json.listings || [];

                console.log('Aantal items gevonden:', items.length);

                // Eerste scan skippen
                if (firstRun) {

                    for (const item of items) {
                        seenItems.add(item.itemId);
                    }

                    firstRun = false;
                    return;
                }

                for (const item of items) {

                    const title = item.title?.toLowerCase() || '';

let ageMinutes = 0;

if (item.date) {

    const listingDate =
        new Date(item.date);

    const now = new Date();

    ageMinutes =
        (now - listingDate) / 1000 / 60;
}
                    // blocked words
                    if (
                        blockedWords.some(word =>
                            title.includes(word)
                        )
                    ) {
                        continue;
                    }

                    // controller filter
                    if (
                        title.includes('controller') &&
                        !title.includes('console')
                    ) {
                        continue;
                    }
console.log(item.priceInfo);

let price =
    Number(item.priceInfo?.priceCents / 100);

// fallback voor biedingen
if (!price || isNaN(price)) {

    price =
        Number(item.priceInfo?.bidPriceCents / 100);
}

                    if (!price || price <= 0) {
                        continue;
                    }

                    if (price > maxprijs) {
                        continue;
                    }

                    const maxBuy = getMaxBuy(title);

                    if (price > maxBuy) {
                        continue;
                    }

                    const {
                        estimatedValue,
                        type
                    } = calculateEstimatedValue(title);

                    if (!estimatedValue) {
                        continue;
                    }

                    const profit =
                        estimatedValue - price;

                    const suggestedOffer =
    Math.floor(price * 0.88);

let risk = '🟢 Laag';

if (
    item.sellerInformation?.sellerAccountAgeInDays < 30
) {
    risk = '🔴 Nieuw account';
}

                    // Alleen goede flips
                    if (profit < 50) {
                        continue;
                    }

                    if (seenItems.has(item.itemId)) {
                        continue;
                    }

                    seenItems.add(item.itemId);

                   const isBidding =
    item.priceInfo?.priceType === 'MIN_BID';

let dealRating =
    isBidding
        ? '🔨 BIEDING DEAL'
        : '🟢 GOEDE DEAL';

                    if (profit >= 140) {
                        dealRating = '🔥 INSANE DEAL';
                    }

                    else if (profit >= 90) {
                        dealRating = '🟡 HEEL GOEDE DEAL';
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(
                            `${dealRating} • ${item.title}`
                        )
                       .setURL(`https://www.marktplaats.nl${item.vipUrl}`)
                        .setColor(0x00AE86)
                        .addFields(
                            {
                                name: '💶 Prijs',
                                value: `€${price}`,
                                inline: true
                            },
                            {
                                name: '📈 Potentiële winst',
                                value: `€${profit}`,
                                inline: true
                            },

                    {
    name: '💬 Aanbevolen bod',
    value: `€${suggestedOffer}`,
    inline: true
},
{
    name: '⚠️ Risico',
    value: risk,
    inline: true
},
{
    name: '⏱️ Leeftijd',
    value: `${Math.floor(ageMinutes)} min`,
    inline: true
},
                            {
                                name: '💸 Verwachte verkoop',
                                value: `~€${estimatedValue}`,
                                inline: true
                            },
                            {
                                name: '🎮 Type',
                                value: type,
                                inline: true
                            }
                        )
                        .setFooter({
                            text: 'Primo Switch Finder'
                        })
                        .setTimestamp();

                    if (
                        item.pictures?.[0]?.extraExtraLargeUrl
                    ) {
                        embed.setImage(
                            item.pictures[0]
                                .extraExtraLargeUrl
                        );
                    }

                    await interaction.channel.send({
                        content:
`🎮 SWITCH DEAL <@638981298555322368>`,
                        embeds: [embed]
                    });
                }

            } catch (err) {

                console.log(err);

            } finally {

                runningSearches.set(searchKey, false);
            }

        }, 30000);

        activeIntervals.set(searchKey, interval);
    }
};
