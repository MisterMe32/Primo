import {
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';

import { chromium } from 'playwright';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const seenItems = new Set();
global.activeSearches =
    global.activeSearches || new Set();
const runningSearches = new Map();
const recentlySent = new Map();
const aiCache = new Map();
const sentDeals = new Set();
let firstRun = true;

// PRODUCT DATABASE
const products = {

    // =========================
    // PS5
    // =========================

    ps5disc: {
        keywords: [
            'ps5 disc',
            'ps5 disc edition',
            'playstation 5 disc',
            'ps5 standard'
        ],
        resale: 420,
        maxBuy: 320,
        minPrice:180,
        type: 'PS5 DISC'
    },

    ps5digital: {
        keywords: [
            'ps5 digital',
            'playstation 5 digital'
        ],
        resale: 340,
        maxBuy: 260,
        minPrice:150,
        type: 'PS5 DIGITAL'
    },

    ps5slim: {
        keywords: [
            'ps5 slim',
            'playstation 5 slim'
        ],
        resale: 430,
        maxBuy: 330,
        minPrice:220,
        type: 'PS5 SLIM'
    },

    ps5pro: {
        keywords: [
            'ps5 pro',
            'playstation 5 pro'
        ],
        resale: 700,
        maxBuy: 560,
        minPrice:350,
        type: 'PS5 PRO'
    },

    // =========================
    // SWITCH
    // =========================

    switcholed: {
        keywords: [
            'switch oled',
            'nintendo switch oled'
        ],
        resale: 240,
        maxBuy: 180,
        minPrice: 120,
        type: 'SWITCH OLED'
    },

    switchlite: {
        keywords: [
            'switch lite',
            'nintendo switch lite'
        ],
        resale: 130,
        maxBuy: 90,
        minPrice: 50,
        type: 'SWITCH LITE'
    },

    switchv1: {
        keywords: [
            'switch v1',
            'nintendo switch v1'
        ],
        resale: 170,
        maxBuy: 120,
        minPrice: 50,
        type: 'SWITCH V1'
    },

    switchv2: {
        keywords: [
            'switch v2',
            'nintendo switch v2'
        ],
        resale: 190,
        maxBuy: 140,
        minPrice: 50,
        type: 'SWITCH V2'
    },

    // =========================
    // IPHONES
    // =========================

    iphone11: {
        keywords: [
            'iphone 11',
            'iphone 11 pro',
            'iphone 11 pro max'
        ],
        resale: 240,
        maxBuy: 170,
        minPrice: 100,
        type: 'IPHONE 11'
    },

    iphone12: {
        keywords: [
            'iphone 12',
            'iphone 12 pro',
            'iphone 12 pro max'
        ],
        resale: 340,
        maxBuy: 250,
        minPrice: 160,
        type: 'IPHONE 12'
    },

    iphone13: {
        keywords: [
            'iphone 13',
            'iphone 13 pro',
            'iphone 13 pro max'
        ],
        resale: 460,
        maxBuy: 350,
        minPrice: 250,
        type: 'IPHONE 13'
    },

    iphone14: {
        keywords: [
            'iphone 14',
            'iphone 14 pro',
            'iphone 14 pro max'
        ],
        resale: 650,
        maxBuy: 500,
        minPrice: 350,
        type: 'IPHONE 14'
    },

    iphone15: {
        keywords: [
            'iphone 15',
            'iphone 15 pro',
            'iphone 15 pro max'
        ],
        resale: 850,
        maxBuy: 680,
        minPrice: 500,
        type: 'IPHONE 15'
    },

    // =========================
    // IPADS
    // =========================

    ipadbasic: {
        keywords: [
            'ipad 9',
            'ipad 10',
            'apple ipad'
        ],
        resale: 300,
        maxBuy: 220,
        minPrice:120,
        type: 'IPAD'
    },

   ipadair: {
        keywords: [
            'ipad air',
            'ipad air m1',
            'ipad air m2'
        ],
        resale: 500,
        maxBuy: 380,
        minPrice:220,
        type: 'IPAD AIR'
    },

    ipadpro: {
        keywords: [
            'ipad pro',
            'ipad pro m1',
            'ipad pro m2'
        ],
        resale: 850,
        maxBuy: 650,
        minPrice:350,
        type: 'IPAD PRO'
    },

    // =========================
    // MACBOOKS
    // =========================

    macbookair: {
        keywords: [
            'macbook air',
            'm1 macbook air',
            'm2 macbook air'
        ],
        resale: 850,
        maxBuy: 650,
        minPrice:450,
        type: 'MACBOOK AIR'
    },

    macbookpro: {
        keywords: [
            'macbook pro',
            'm1 macbook pro',
            'm2 macbook pro'
        ],
        resale: 1400,
        maxBuy: 1100,
        minPrice:700,
        type: 'MACBOOK PRO'
    },

    // =========================
    // STEAM DECK
    // =========================

    steamdecklcd: {
        keywords: [
            'steam deck 256',
            'steam deck 512'
        ],
        resale: 380,
        maxBuy: 280,
        minPrice:180,
        type: 'STEAM DECK LCD'
    },

    steamdeckoled: {
        keywords: [
            'steam deck oled'
        ],
        resale: 550,
        maxBuy: 430,
        minPrice:300,
        type: 'STEAM DECK OLED'
    },

    // =========================
    // SAMSUNG
    // =========================

    galaxys23: {
        keywords: [
            'galaxy s23',
            's23'
        ],
        resale: 500,
        maxBuy: 380,
        minPrice: 220,
        type: 'S23'
    },

    galaxys23ultra: {
        keywords: [
            'galaxy s23 ultra',
            's23 ultra'
        ],
        resale: 750,
        maxBuy: 600,
        minPrice: 350,
        type: 'S23 ULTRA'
    },

    galaxys24: {
        keywords: [
            'galaxy s24',
            's24'
        ],
        resale: 650,
        maxBuy: 500,
        minPrice: 320,
        type: 'S24'
    },

    galaxys24ultra: {
        keywords: [
            'galaxy s24 ultra',
            's24 ultra'
        ],
        resale: 950,
        maxBuy: 780,
        minPrice: 500,
        type: 'S24 ULTRA'
    }
};
function detectProduct(title) {

    title = title.toLowerCase();

    // ACCESSORY / CASE BLOCK
    if (
        title.includes('case') ||
        title.includes('hoes') ||
        title.includes('hülle') ||
        title.includes('fundas') ||
        title.includes('cover') ||
        title.includes('coque') ||
        title.includes('capa')
    ) {
        return null;
    }

    let bestMatch = null;

    let bestScore = 0;

    for (const product of Object.values(products)) {

        for (const keyword of product.keywords) {

            // EXACT MATCH
            if (title.includes(keyword)) {

                return product;
            }

            // WOORDEN SPLITSEN
            const titleWords =
                title.split(' ');

            const keywordWords =
                keyword.split(' ');

            let matches = 0;

            for (const word of keywordWords) {

                if (
                    titleWords.some(t =>
                        t.includes(word) ||
                        word.includes(t)
                    )
                ) {
                    matches++;
                }
            }

            const score =
                matches /
                keywordWords.length;

            if (score > bestScore) {

                bestScore = score;

                bestMatch = product;
            }
        }
    }

    // FUZZY MATCH THRESHOLD
    if (bestScore >= 1) {

        console.log(
            'FUZZY MATCH:',
            bestMatch.type,
            bestScore
        );

        return bestMatch;
    }

    return null;
}
async function analyzeDealAI({ title, price }) {

    try {

        const prompt = `
Titel: ${title}
Prijs: €${price}

Analyseer deze Vinted listing als professionele reseller.

Geef ALLEEN geldige JSON terug:

{
  "isAccessory": boolean,
  "isScam": boolean,
  "flipScore": number,
  "risk": "low" | "medium" | "high",
  "summary": string
}

BLOCK direct:
- hoesjes
- chargers
- docks
- controllers
- joycons
- empty box
- defect
- for parts
- account only
- doos only
- tablet only
- replacement parts

Alleen COMPLETE werkende apparaten toestaan.
`;

        const completion =
            await openai.chat.completions.create({

                model: 'gpt-4o-mini',

                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],

                temperature: 0.2
            });

        const text =
            completion.choices[0]
                .message.content;

        return JSON.parse(text);

    } catch (err) {

        console.log("AI ERROR:", err);

        return null;
    }
}

export default {

    data: new SlashCommandBuilder()

        .setName('electronics')

        .setDescription(
            'Scan Vinted electronics flips'
        )

        .addIntegerOption(option =>
            option
                .setName('maxprijs')
                .setDescription('Max prijs')
                .setRequired(true)
        ),

    async execute(interaction) {

        const maxprijs =
            interaction.options.getInteger(
                'maxprijs'
            );

        const searchKey =
            `electronics-${maxprijs}`;

        if (global.activeSearches.has(searchKey)) {

            return interaction.reply(
                '⚠️ Scanner draait al.'
            );
        }

        global.activeSearches.add(searchKey);

        await interaction.reply(
            `🔎 AI Electronics scanner gestart onder €${maxprijs}`
        );

        const browser =
            await chromium.launch({

                executablePath:
                    '/usr/bin/chromium-browser',

                headless: true,

                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });

          if (!global.activeBrowsers) {
    global.activeBrowsers = new Map();
}

global.activeBrowsers.set(
    searchKey,
    browser
);

        const page =
            await browser.newPage();

            page.setDefaultTimeout(30000);

        if (!global.activeIntervals) {

            global.activeIntervals =
                new Map();
        }

        const interval =
            setInterval(async () => {

if (page.isClosed()) {

    console.log(
        "PAGE CLOSED"
    );

    clearInterval(interval);

    global.activeSearches.delete(searchKey);

    return;
}


                console.log(
                    "INTERVAL RUNNING:",
                    searchKey
                );

                if (
                    runningSearches.get(
                        searchKey
                    )
                ) {
                    return;
                }

                runningSearches.set(
                    searchKey,
                    true
                );

                try {

                    const searchTerms = [

    // PLAYSTATION
    'ps5 console',
    'ps5 disc',
    'ps5 slim',
    'ps5 digital',    

    // SWITCH
    'nintendo switch',
    'switch oled',
    'switch lite',

    // IPHONE
    'iphone 11',
    'iphone 12',
    'iphone 13',
    'iphone 14',
    'iphone 15',

    // IPAD
    'ipad',
    'ipad air',
    'ipad pro',

    // SAMSUNG
    's23 ultra',
    's24 ultra',
    'galaxy s23',
    'galaxy s24',

    // STEAM DECK
    'steam deck',
    'steamdeck',

    // MACBOOK
    'macbook',
    'macbook air',
    'macbook pro'
];

                    for (const term of searchTerms) {


                        const url =
`https://www.vinted.nl/catalog?search_text=${encodeURIComponent(term)}&order=newest_first`;

                        await page.setExtraHTTPHeaders({

                            'Accept-Language':
                                'en-US,en;q=0.9'
                        });

                        await page.goto(url, {

                            waitUntil:
                                'domcontentloaded',

                            timeout: 60000
                        });

                      const randomDelay =
    Math.floor(
        Math.random() * 2500
    ) + 2000;



if (
    page.isClosed()
) {

    console.log(
        "PAGE CLOSED STOP"
    );

    clearInterval(interval);

    activeSearches.delete(searchKey);

    return;
}

if (!page.isClosed()) {

    await page.waitForTimeout(
        randomDelay
    );

}

                     const items =
    await page.$$eval(

        '[data-testid="grid-item"]',

        cards => {

            return cards.map(card => {

                const title =
                    card.querySelector('img')?.alt ||

                    card.querySelector(
                        '[data-testid="item-box-title"]'
                    )?.innerText ||

                    '';

                const price =
                    card.querySelector(
                        '[data-testid="item-box-price"]'
                    )?.innerText ||

                    card.innerText ||

                    '';

                const link =
                    card.querySelector('a')?.href ||

                    '';

                const image =
                    card.querySelector('img')?.src ||

                    '';

                const time =
                    card.querySelector('time')
                        ?.getAttribute('datetime') || '';

                return {

                    title,
                    price,
                    link,
                    image,
                    time
                };
            });
        }
    );
                        console.log(
                            `${term}:`,
                            items.length
                        );

for (const item of items) {

    console.log(
        "CHECKING ITEM:",
        item.title
    );

                            const title =
                                item.title.toLowerCase();

                            if (
                                seenItems.has(item.link)
                            ) {
                                continue;
                            }

                            if (firstRun) {

                                seenItems.add(item.link);

                                continue;
                            }

                          seenItems.add(item.link);

console.log("NEW FILTER SYSTEM ACTIVE");
// ALLEEN GOEDE PRODUCT TYPES TOESTAAN

// HARD BLOCKS
const hardBlocked = [

    // ACCESSORIES
    'controller',
    'dualsense',
    'dualshock',
    'joycon',
    'headset',
    'headphones',
    'charger',
    'dock',
    'adapter',
    'cable',
    'kabel',
    'remote',
    'microphone',
    'mic',
    'camera',
    'monitor',
    'wheel',
    'thrustmaster',

    // GAMES
    'fifa',
    'fc24',
    'fc25',
    'call of duty',
    'cod',
    'gta',
    'fortnite',
    'minecraft',
    'spiderman',
    'god of war',
    'elden ring',
    'gran turismo',
    'game',
    'games',

    // RANDOM SHIT
    'lego',
    'funko',
    'amiibo',
    'steelbook',
    'disc only',
    'empty box',
    'replacement parts',
    'for parts',
    'icloud locked',
    'account only',
    'tablet only',
    'cover',
    'case',
    'skin',
    'faceplate',
'cd',
'steel case',
'collector',
'mouse',
'keyboard',
'stand',
'fan',
'trigger',
'repair',
'reparatie',
'broken',
'kapot',
'read description',
'description',
'lees beschrijving',
'ssd',
'nvme',
'memory card',
'memoria',
'ps vita',
'vita',
'blu ray',
'bluray',
'dvd',
'fan',
'cooler',
'cooling',
'ventilador',
'enclosure',
'box only',
'doos only',
'faceplate',
'shell',
'housing',
'parts only',
'console stand',
'vertical stand',
'cooling stand'
];

// BLOCK ALS 1 MATCHT
if (
    hardBlocked.some(word =>
        title.includes(word)
    )
) {

    console.log(
        "HARD BLOCKED:",
        title
    );

    continue;
}
console.log(
    "REACHED PRODUCT DETECTION"
);
const product =
    detectProduct(title);
    console.log(
    "DETECTED PRODUCT:",
    product?.type
);

                            if (!product) {

                                console.log(
                                    "PRODUCT NOT FOUND"
                                );

                                continue;
                            }

                     const matches =
    item.price.match(/\d+,\d+/g);

const price =
    matches && matches.length > 0
        ? parseFloat(
            matches[0].replace(',', '.')
        )
        : 0;


                            if (
                                !price ||
                                isNaN(price)
                            ) {
                                continue;
                            }

                         if (price > maxprijs) {

    console.log(
        "FAILED MAXPRIJS CHECK"
    );

    console.log(
        "SKIPPED MAX PRICE:",
        price
    );

    continue;
}

if (
    price <
    product.minPrice
) {

    console.log(
        "FAILED MINPRICE CHECK"
    ); 

    console.log(
        "PRICE TOO LOW"
    );

    continue;
}

                            if (
    price >
    product.maxBuy + 40
) {

    console.log(
        "FAILED MAXBUY CHECK"
    ); 

                                console.log(
                                    "PRICE TOO HIGH"
                                );

                                continue;
                            }
const baseEstimatedValue =
    product.resale;

const rawProfit =
    baseEstimatedValue - price;

if (rawProfit < 40) {

    console.log(
        "FAILED PROFIT CHECK"
    );

    console.log(
        "RAW PROFIT TOO LOW"
    );

    continue;
}

const suspiciousWords = [

    'read description',
    'beschrijving',
    'description',
    'tablet only',
    'console only',
    'see description',
    'zonder',
    'only',
    'defect',
    'kapot'
];

const needsAI =
    suspiciousWords.some(word =>
        title.includes(word)
    );


                            

                           const cacheKey =
    `${title}-${price}`;

    let ai = {

    isAccessory: false,
    isScam: false,
    flipScore: 85,
    risk: 'low',
    summary: 'Auto approved'
};

if (needsAI) {

console.log(
                                "START AI ANALYZE"
                            );

    ai =
        aiCache.get(cacheKey);

    if (!ai) {

    ai = await Promise.race([

        analyzeDealAI({
            title: item.title,
            price
        }),

        new Promise(resolve =>
            setTimeout(
                () => resolve(null),
                10000
            )
        )
    ]);

    if (ai) {

        aiCache.set(
            cacheKey,
            ai
        );
            }
    }
}

                            console.log(
                                "AI RESULT:",
                                ai
                            );
if (!ai) {

    console.log(
        "AI FAILED"
    );

    continue;
}
                            if (ai.isAccessory) {

                                console.log(
                                    "BLOCKED ACCESSORY"
                                );

                                continue;
                            }

                            if (ai.isScam) {

                                console.log(
                                    "BLOCKED SCAM"
                                );

                                continue;
                            }

                           let estimatedValue =
    baseEstimatedValue;

                            let aiScore =
                                ai.flipScore || 70;

                            let aiRisk =
                                ai.risk || 'medium';

                            let aiSummary =
                                ai.summary ||
                                'AI analyse';

                           const estimatedFees =
    price * 0.12 + 7;

const profit =
    estimatedValue -
    price -
    estimatedFees;

    console.log(
    "FINAL PROFIT:",
    profit
);
    const isHotDeal =
    profit >= 120;
                            

                          if (profit < 50) {

    console.log(
        "FAILED MIN PROFIT"
    );

    continue;
}



const uniqueKey =
item.link;

if (
    sentDeals.has(uniqueKey)
) {

    console.log(
        "DUPLICATE BLOCKED"
    );

    continue;
}

sentDeals.add(uniqueKey);

setTimeout(() => {

    sentDeals.delete(uniqueKey);

}, 1000 * 60 * 15);
                            console.log(
                                "REACHED EMBED"
                            );

                            const embed =
                                new EmbedBuilder()

                                   .setTitle(
    isHotDeal
        ? `🚨 HOT DEAL ${product.type}`
        : `🔥 ${product.type}`
)
                                    .setURL(item.link)

                                    .setColor(
                                        0x00AE86
                                    )

                                    .addFields(

                                        {
                                            name:
                                                '💰 Prijs',

                                            value:
                                               `€${price.toFixed(2)}`,

                                            inline: true
                                        },

                                        {
                                            name:
                                                '📈 Winst',

                                            value:
                                              `€${profit.toFixed(2)}`,

                                            inline: true
                                        },

                                        {
                                            name:
                                                '🤖 AI Score',

                                            value:
                                                `${aiScore}/100`,

                                            inline: true
                                        },

                                        {
                                            name:
                                                '⚠️ Risk',

                                            value:
                                                aiRisk,

                                            inline: true
                                        },

                                        {
                                            name:
                                                '🧠 Analyse',

                                            value:
                                                aiSummary
                                        }
                                    )

                                    .setFooter({

                                        text:
                                            'Primo AI Electronics'
                                    })

                                    .setTimestamp();

                            if (item.image) {

                                embed.setThumbnail(
                                    item.image
                                );
                            }

                            console.log(
                                "SENDING ITEM"
                            );

                            const channel =
                                interaction.channel;

                           const now = Date.now();

const lastSent =
   recentlySent.get(item.link);
if (recentlySent.size > 5000) {

    const oldestKey =
        recentlySent.keys().next().value;

    recentlySent.delete(oldestKey);
}

if (seenItems.size > 10000) {

    const oldestSeen =
        seenItems.values().next().value;

    seenItems.delete(oldestSeen);
}
if (
    lastSent &&
    now - lastSent < 3600000
) {

    console.log(
        "RECENTLY SENT:",
        item.title
    );

    continue;
}

recentlySent.set(
    item.link,
    now
);
console.log(
    "DISCORD ALERT SENT"
);

await channel.send({

    content:
`🚨 AI VINTED DEAL <@638981298555322368>`,

    embeds: [embed]
});
                        }
                    }

                    firstRun = false;

                } catch (err) {

                   console.log(
    "SCAN ERROR:",
    err.message
);

                } finally {

                    runningSearches.set(
                        searchKey,
                        false
                    );
                }

            }, 45000);

        global.activeIntervals.set(
            searchKey,
            interval
        );
    }
};