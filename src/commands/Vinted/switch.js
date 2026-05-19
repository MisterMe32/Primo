import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { chromium } from 'playwright';

const seenItems = new Set();
const activeSearches = new Set();
const activeIntervals = new Map();
const runningSearches = new Map();

let browser;

global.activeSearches = activeSearches;
global.activeIntervals = activeIntervals;

export default {
    data: new SlashCommandBuilder()
        .setName('switch')
        .setDescription('Zoek Nintendo Switch deals')
        .addStringOption(option =>
            option
                .setName('zoekterm')
                .setDescription('Bijv: nintendo switch')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('maxprijs')
                .setDescription('Max prijs')
                .setRequired(true)
        ),

    async execute(interaction) {

        const zoekterm = interaction.options.getString('zoekterm');
        const maxprijs = interaction.options.getInteger('maxprijs');

        const searchKey = `${zoekterm.trim().toLowerCase()}-${maxprijs}`;

        if (activeSearches.has(searchKey)) {
            return interaction.reply("⚠️ Deze search draait al.");
        }

        activeSearches.add(searchKey);

        await interaction.reply(`🎮 Zoeken naar ${zoekterm} onder €${maxprijs}`);

        const url = `https://www.vinted.nl/api/v2/catalog/items?page=1&per_page=20&search_text=${encodeURIComponent(zoekterm)}&price_to=${maxprijs}&order=newest_first`;

        let firstRun = true;

        const interval = setInterval(async () => {

            if (runningSearches.get(searchKey)) return;
            runningSearches.set(searchKey, true);

            try {

                if (!browser) {
                    browser = await chromium.launch({
                        headless: true,
                        executablePath: '/usr/bin/chromium-browser',
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                }

                const page = await browser.newPage();

                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8'
                });

                await page.goto('https://www.vinted.nl', {
                    waitUntil: 'networkidle'
                });

                await page.goto(url, {
                    waitUntil: 'networkidle'
                });

                const text = await page.evaluate(() => document.body.innerText);

                await page.close();

                const json = JSON.parse(text);

                const items = json.items || [];

                console.log("Aantal items gevonden:", items.length);

                if (firstRun) {
                    for (const item of items) {
                        seenItems.add(item.id);
                    }

                    firstRun = false;
                    return;
                }

                const deals = {

                    'switch lite': {
                        maxBuy: 60,
                        resale: 100
                    },

                    'switch oled': {
                        maxBuy: 160,
                        resale: 260
                    },

                    'nintendo switch': {
                        maxBuy: 90,
                        resale: 120
                    },

                    'switch v2': {
                        maxBuy: 90,
                        resale: 120
                    }
                };

                const consoleKeywords = [
                    'nintendo switch',
                    'switch lite',
                    'switch oled',
                    'switch v2'
                ];
const blockedWords = [
  'hoes',
  'case',
  'etui',
  'controller',
  'joycon',
  'joy-con',
  'dock',
  'oplader',
  'charger',
  'game',
  'games',
  'pokemon',
  'mario',
  'zelda',
  'fifa',
  'fortnite',
  'minecraft',
  'cartridge',
  'cassette',
  'cover',
  'repair',
  'broken',
  'defect',
  'onderdeel',
  'for parts',
  'works not',
  'werkt niet',
  'accessoire',
  'accessoires',
  'bundle',
  'set',
  'kit',
  'cronos',
  'tekken',
  'switch 2 game',
  'only game',
  'spel',
  'spellen',
  'adapter',
  'grip',
  'protect',
  'screenprotector',
  'skin',
  'sticker',
  'houder',
  'headset',
  'tas',
  'bag'
];

                for (const item of items) {

                    const title = item.title.toLowerCase();

                    const hasConsoleWords =
    title.includes('console') ||
    title.includes('oled') ||
    title.includes('lite') ||
    title.includes('v2') ||
    title.includes('tablet');

if (!hasConsoleWords) {
    continue;
}

                    const hasConsoleKeyword = consoleKeywords.some(keyword =>
                        title.includes(keyword)
                    );

                    if (!hasConsoleKeyword) {
                        continue;
                    }

                    if (blockedWords.some(word => title.includes(word))) {
                        continue;
                    }

                    const price = Number(item.price.amount);

                    const matchedDeal = Object.entries(deals).find(
                        ([keyword, data]) =>
                            title.includes(keyword) && price <= data.maxBuy
                    );

                    if (!matchedDeal) {
                        continue;
                    }

                    const estimatedValue = matchedDeal[1].resale;

                    const profit = estimatedValue - price;

                    if (profit < 50) {
                        continue;
                    }

                    if (seenItems.has(item.id)) continue;

                    seenItems.add(item.id);

                    const timestamp = item.photo?.high_resolution?.timestamp;

                    if (!timestamp) continue;

                    const itemAge = Math.floor((Date.now() - (timestamp * 1000)) / 1000 / 60);

                    if (itemAge > 3) {
                        continue;
                    }

                    let dealRating = '🟢 GOEDE DEAL';

                    if (profit >= 120) {
                        dealRating = '🔥 INSANE DEAL';
                    } else if (profit >= 80) {
                        dealRating = '🟡 HEEL GOEDE DEAL';
                    }

                    const embed = new EmbedBuilder()
                        .setTitle(`${dealRating} • ${item.title}`)
                        .setURL(`https://www.vinted.nl/items/${item.id}`)
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
                                name: '💰 Resale',
                                value: `~€${estimatedValue}`,
                                inline: true
                            },
                            {
                                name: '⏱️ Geplaatst',
                                value: `${itemAge} min geleden`,
                                inline: true
                            }
                        )
                        .setFooter({
                            text: 'Primo Flip Finder'
                        })
                        .setTimestamp();

                    if (item.photo?.url) {
                        embed.setImage(item.photo.url);
                    }

                    await interaction.channel.send({
                        content: `🎮 SWITCH DEAL <@638981298555322368>`,
                        embeds: [embed]
                    });
                }

            } catch (err) {
                console.log(err);

            } finally {
                runningSearches.set(searchKey, false);
            }

        }, 15000);

        activeIntervals.set(searchKey, interval);
    }
};
