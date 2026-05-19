import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const seenItems = new Set();
const activeSearches = new Set();
const activeIntervals = new Map();
const runningSearches = new Map();

global.activeSearches = activeSearches;
global.activeIntervals = activeIntervals;
const CHANNEL_ID = '1505666543718105102';

const blockedWords = [

    // accessoires
    'controller only',
    'alleen controller',
    'skin',
    'sticker',
    'cover',
    'faceplate',
    'shell',

    // onderdelen
    'disc drive',
    'stand',
    'houder',
    'charger',
    'kabel',
    'hdmi',

    // defect
    'kapot',
    'defect',
    'repair',
    'onderdelen',
    'werkt niet',
    'for parts',

    // nep / scam
    'doos',
    'empty box',
    'box only',

    // irrelevante dingen
    'gezocht',
    'huur',
    'verhuur',

    // games
    'fifa',
    'fc25',
    'call of duty',
    'spiderman',
    'game only'
];

function calculateEstimatedValue(title) {

    title = title.toLowerCase();

    let estimatedValue = 0;
    let type = 'UNKNOWN';

    // PS5 Slim
    if (
        title.includes('slim')
    ) {

        estimatedValue = 390;
        type = 'SLIM';
    }

    // Digital
    else if (
        title.includes('digital')
    ) {

        estimatedValue = 290;
        type = 'DIGITAL';
    }

    // Normale PS5
    else if (
        title.includes('ps5') ||
        title.includes('playstation 5')
    ) {

        estimatedValue = 330;
        type = 'STANDARD';
    }

    // extra controllers
    if (
        title.includes('2 controllers') ||
        title.includes('extra controller')
    ) {
        estimatedValue += 40;
    }

    // games inbegrepen
    if (
        title.includes('games') ||
        title.includes('spelletjes')
    ) {
        estimatedValue += 30;
    }

    return {
        estimatedValue,
        type
    };
}

function getMaxBuy(title) {

    title = title.toLowerCase();

    // slim
    if (title.includes('slim')) {
        return 340;
    }

    // digital
    if (title.includes('digital')) {
        return 260;
    }

    // normale ps5
    return 300;
}
export default {

    data: new SlashCommandBuilder()
        .setName('ps5')
        .setDescription('Zoek PS5 deals op Marktplaats')
        .addIntegerOption(option =>
            option
                .setName('maxprijs')
                .setDescription('Max prijs')
                .setRequired(true)
        ),

    async execute(interaction) {

        const maxprijs = interaction.options.getInteger('maxprijs');

        const searchKey = `ps5-${maxprijs}`;

        if (activeSearches.has(searchKey)) {
            return interaction.reply('⚠️ Deze search draait al.');
        }

        activeSearches.add(searchKey);

       await interaction.reply(
    `🔥 Zoeken naar PS5 deals onder €${maxprijs}`
);

        let firstRun = true;

        const interval = setInterval(async () => {

            if (runningSearches.get(searchKey)) return;

            runningSearches.set(searchKey, true);

            try {

              const url =
`https://www.marktplaats.nl/lrp/api/search?query=ps5&limit=30&offset=0`;

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
const isBidding =
    item.priceInfo?.priceType === 'MIN_BID';
                    
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
                            text: 'Primo Ps5 Finder'
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

                  const channel =
    interaction.client.channels.cache.get(CHANNEL_ID);

await channel.send({
    content:
`🔥 PS5 DEAL <@638981298555322368>`,
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
