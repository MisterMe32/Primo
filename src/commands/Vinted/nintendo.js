import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { chromium } from 'playwright';
global.activeBrowsers = global.activeBrowsers || new Map();
const seenItems = new Set();
const activeSearches = new Set();
const activeIntervals = new Map();
const runningSearches = new Map();


global.activeSearches = activeSearches;
global.activeIntervals = activeIntervals;
export default {
    data: new SlashCommandBuilder()
        .setName('vinted3')
        .setDescription('Zoek op Vinted deals')
        .addStringOption(option =>
            option
                .setName('zoekterm')
                .setDescription('Bijv: nike hoodie')
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
        await interaction.reply(`🔎 Zoeken naar ${zoekterm} onder €${maxprijs}`);

const url = `https://www.vinted.nl/api/v2/catalog/items?page=1&per_page=20&search_text=${encodeURIComponent(zoekterm)}&price_to=${maxprijs}&order=newest_first`;     
        let firstRun = true;
        global.vintedInterval =
    setInterval(async () => {
        if (runningSearches.get(searchKey)) return;
runningSearches.set(searchKey, true);

            try {
const browser = await chromium.launch({
    headless: true,
 executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
global.activeBrowsers.set(searchKey, browser);
                
const page = await browser.newPage();
await page.goto('https://www.vinted.nl', {
    waitUntil: 'domcontentloaded'
});
await page.setExtraHTTPHeaders({
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json'
});

const json = await page.evaluate(async (url) => {
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        }
    });

    return await response.json();
}, url);

await browser.close();

const items = json.items || [];
console.log("Aantal items gevonden:", items.length);
            if (firstRun) {
    for (const item of items) {
        const title = item.title.toLowerCase();

const blockedWords = [
  'hoes',
  'case',
  'repair',
  'broken',
  'defect',
  'onderdeel',
  'cover',
  'ps5',
  'playstation',
  'hd camera'
];

if (blockedWords.some(word => text.includes(word))) {

   console.log("SUSPICIOUS LISTING -> AI CHECK");

   const aiResult = await aiCheck(title, description);

   console.log("AI RESULT:", aiResult);

   if (aiResult === "ACCESSORY_ONLY") {
      console.log("BLOCKED ACCESSORY");
      return;
   }

   console.log("AI APPROVED");
}
        seenItems.add(item.id);
    }

    firstRun = false;
    return;
}
const deals = {
  'new 3ds xl': {
    maxBuy: 120,
    resale: 220
  },

  'new 3ds': {
    maxBuy: 100,
    resale: 180
  },

  '2ds xl': {
    maxBuy: 80,
    resale: 160
  },

  '3ds xl': {
    maxBuy: 70,
    resale: 130
  },

  '3ds': {
    maxBuy: 40,
    resale: 80
  }
};
const broadKeywords = [
  '3ds',
  '2ds',
  '3ds xl',
  '2ds xl',
  'new 3ds',
  'new 3ds xl',
  'nintendo 3ds'
];
const badModels = [
  'hoes',
  'case',
  'oplader',
  'charger',
  'stylus',
  'kapot',
  'defect',
  'onderdelen'
];
for (const item of items) {
    
    const title = item.title.toLowerCase();
const gameIndicators = [
  'pokemon',
  'pikachu',
  'zelda',
  'mario',
  'luigi',
  'kirby',
  'lego',
  'yo-kai',
  'yokai',
  'inazuma',
  'disney',
  'animal crossing',
  'minecraft',
  'fifa',
  'skylanders'
];

if (gameIndicators.some(word => title.includes(word))) {
  continue;
}
    
    const consoleKeywords = [
  '3ds xl',
  'new 3ds xl',
  '2ds xl'
];

const hasConsoleKeyword = consoleKeywords.some(keyword =>
  title.includes(keyword)
);

if (!hasConsoleKeyword) {
  continue;
}
    const isBadModel = badModels.some(word =>
    title.includes(word)
);

if (isBadModel) {
    continue;
}
const price = Number(item.price.amount);
const isBroadMatch = broadKeywords.some(keyword =>
    title.includes(keyword)
);
const matchedDeal = Object.entries(deals).find(
([keyword, data]) =>
    title.includes(keyword) && price <= data.maxBuy
);
if (!matchedDeal && !(isBroadMatch && price <= 80)) {
    continue;
}

const estimatedValue = matchedDeal
    ? matchedDeal[1].resale
    : price + 80;
const profit = estimatedValue - price;
let matchType = '🎮 Broad Nintendo Match';

if (matchedDeal) {
  matchType = `🎯 Exact ${matchedDeal[0].toUpperCase()} Match`;
}
    let dealRating = '🟢 GOEDE DEAL';

if (profit >= 100) {
    dealRating = '🔥 INSANE DEAL';
} else if (profit >= 50) {
    dealRating = '🟡 HEEL GOEDE DEAL';
}
if (profit < 25) {
  continue;
}
if (!matchedDeal) {
  continue;
}
const blockedWords = [
  'hoes',
  'case',
  'repair',
  'broken',
  'defect',
  'onderdeel',
  'cover',
  'for parts',
  'works not',
  'werkt niet',
  'zonder oplader',
  'empty box',
  'doos',
  'only box',
  'manual',
  'instructie',
  'sticker',
  'shell',
  'behuizing',
  'charger',
  'oplader',
  'stylus',
  'screen protector',
  'zonder batterij',
'battery cover',
'no charger',
'screen crack',
'crack',
'water damage',
'game',
'games',
'pokemon',
'zelda',
'mario',
'luigi',
'inazuma',
'yo kai',
'yokai',
'cartridge',
'cassette',
'étui',
'etui',
'pouch',
'bag',
'opbergtas',
'console box',
'box only',
'stylus only',
'custodia',
'rangement',
'travel case',
'travel',
'storage',
'opslag',
'opberg',
'map',
'wallet',
'porte',
'carry case',
'carrying case',
'mario kart',
'super mario',
'pokemon',
'zelda',
'spiele',
'jeu',
'jeux',
'game',
'games',
'accessoire',
'accessoires',
'accessories',
'lego',
'pokemon',
'carte',
'card',
'cards',
'lot',
'bundle',
'pack',
'kit'
];

if (blockedWords.some(word => title.includes(word))) {
  continue;
}

    if (seenItems.has(item.id)) continue;

    seenItems.add(item.id);
const timestamp = item.photo?.high_resolution?.timestamp;

if (!timestamp) continue;

const itemAge = Math.floor((Date.now() - (timestamp * 1000)) / 1000 / 60);

if (itemAge > 5) {
    continue;
}
   const embed = new EmbedBuilder()
  .setTitle(`${dealRating} • ${item.title}`)
    .setURL(`https://www.vinted.nl/items/${item.id}`)
    .setColor(0x00AE86)
    .addFields(
        {
            name: '💶 Prijs',
         value: `€${item.price.amount}`,
            inline: true
        },
        {
  name: '📈 Potentiële winst',
  value: `€${profit}`,
  inline: true
},
{
  name: '🎯 Match Type',
  value: matchType,
  inline: false
},
        {
            name: '📦 Merk',
            value: item.brand_title || 'Onbekend',
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
let pushMessage;

if (profit >= 100) {
  pushMessage = `🚨 INSANE DEAL • ${item.title} • €${price} → ~€${estimatedValue}`;
} else if (profit >=50) {
  pushMessage = `🔥 GOEDE DEAL • ${item.title} • €${price} → ~€${estimatedValue}`;
} else {
  pushMessage = `🟡 CHECK HANDMATIG • ${item.title} • €${price}`;
}
               
await interaction.channel.send({
content: `${pushMessage} <@638981298555322368>`,
  embeds: [embed]
});
                }
firstRun = false;
            } catch (err) {
    console.log(err);
} finally {
    runningSearches.set(searchKey, false);
}
        }, 15000);
        activeIntervals.set(searchKey, interval);
    }
};
