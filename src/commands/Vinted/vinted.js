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
        .setName('vinted2')
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

if (blockedWords.some(word => title.includes(word))) {
  continue;
}
        seenItems.add(item.id);
    }

    firstRun = false;
    return;
}
const deals = {

  'cybershot': {
    maxBuy: 45,
    resale: 100
  },

  'dsc-w830': {
    maxBuy: 35,
    resale: 90
  },

  'w830': {
    maxBuy: 35,
    resale: 90
  },

  'dsc-w810': {
    maxBuy: 30,
    resale: 70
  },

  'w810': {
    maxBuy: 30,
    resale: 70
  },

  'dsc-w570': {
    maxBuy: 35,
    resale: 90
  },

  'w570': {
    maxBuy: 35,
    resale: 90
  },

  'dsc-t7': {
    maxBuy: 50,
    resale: 120
  },

  't7': {
    maxBuy: 50,
    resale: 120
  },

  'dsc-t9': {
    maxBuy: 60,
    resale: 140
  },

  't9': {
    maxBuy: 60,
    resale: 140
  },

  'nex-5': {
    maxBuy: 90,
    resale: 190
  },

  'nex 5': {
    maxBuy: 90,
    resale: 190
  },

  'nex-5n': {
    maxBuy: 100,
    resale: 240
  },

  'nex 5n': {
    maxBuy: 100,
    resale: 240
  },

  'a5000': {
    maxBuy: 100,
    resale: 260
  },

  'a5100': {
    maxBuy: 100,
    resale: 320
  }
};
const broadKeywords = [
'sony camera',
'sony handycam',
'handycam',
'camcorder',
'cybershot',
'alpha',
'digitale camera',
'caméscope',
'dsc',
'dslr',
'zv',
'alpha',
'nex',
'mirrorless',
'sony dsc',
'compact camera'
];
const badModels = [
'h300',
'bridge',
'hx300',
'hx400',
'h200',
'dsc h',
'dsc-h'
];
for (const item of items) {
    
    const title = item.title.toLowerCase();
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
let matchType = '🔍 Broad Sony Match';

if (matchedDeal) {
  matchType = `🎯 Exact ${matchedDeal[0].toUpperCase()} Match`;
}
    let dealRating = '🟢 GOEDE DEAL';

if (profit >= 150) {
    dealRating = '🔥 INSANE DEAL';
} else if (profit >= 80) {
    dealRating = '🟡 HEEL GOEDE DEAL';
}
if (profit < 70) {
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
  'ps5',
  'playstation',
  'hd camera'
];

if (blockedWords.some(word => title.includes(word))) {
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

if (profit >= 200) {
  pushMessage = `🚨 INSANE DEAL • ${item.title} • €${price} → ~€${estimatedValue}`;
} else if (profit >= 100) {
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
        }, 30000);
        activeIntervals.set(searchKey, interval);
    }
};
