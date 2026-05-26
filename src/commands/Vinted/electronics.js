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
const activeSearches = new Set();
const runningSearches = new Map();
const recentlySent = new Map();
const aiCache = new Map();
let firstRun = true;

// PRODUCT DATABASE
const products = {

    // PS5
    ps5: {
        keywords: [
            'ps5',
            'ps 5',
            'playstation 5',
            'playstation5',
            'sony ps5',
            'ps5 disc',
            'ps5 digital',
            'ps5 slim',
            'ps5 console',
            'playstation console'
        ],
        resale: 340,
        maxBuy: 260,
        type: 'PS5'
    },

    // NINTENDO SWITCH
    switch: {
        keywords: [
            'switch',
            'nintendo switch',
            'switch oled',
            'switch lite',
            'oled switch',
            'nintendo oled',
            'lite switch',
            'nintendo lite',
            'switch console',
            'switch v1',
            'switch v2',
            'switch bundle'
        ],
        resale: 180,
        maxBuy: 120,
        type: 'NINTENDO SWITCH'
    },

    // IPHONE 13
    iphone13: {
        keywords: [
            'iphone 13',
            '13 pro',
            '13 pro max',
            'iphone13',
            'apple iphone 13',
            '13pm',
            '13pro',
            'iphone 13 pro',
            'iphone 13 pro max'
        ],
        resale: 420,
        maxBuy: 320,
        type: 'IPHONE 13'
    },

    // IPHONE 12
    iphone12: {
        keywords: [
            'iphone 12',
            '12 pro',
            '12 pro max',
            'iphone12',
            'apple iphone 12',
            '12pm',
            '12pro',
            'iphone 12 pro',
            'iphone 12 pro max'
        ],
        resale: 300,
        maxBuy: 220,
        type: 'IPHONE 12'
    },

    // IPHONE 11
    iphone11: {
        keywords: [
            'iphone 11',
            '11 pro',
            '11 pro max',
            'iphone11',
            'apple iphone 11',
            '11pm',
            '11pro',
            'iphone 11 pro',
            'iphone 11 pro max'
        ],
        resale: 220,
        maxBuy: 150,
        type: 'IPHONE 11'
    },

    // IPADS
    ipad: {
        keywords: [
            'ipad',
            'ipad air',
            'ipad pro',
            'ipad mini',
            'ipad 9',
            'ipad 10',
            'ipad m1',
            'ipad m2',
            'apple ipad',
            'ipad bundle'
        ],
        resale: 350,
        maxBuy: 240,
        type: 'IPAD'
    },

    // MACBOOKS
    macbook: {
        keywords: [
            'macbook',
            'macbook air',
            'macbook pro',
            'mac air',
            'mac pro',
            'm1 macbook',
            'm2 macbook',
            'apple macbook',
            'macbook m1',
            'macbook m2'
        ],
        resale: 700,
        maxBuy: 500,
        type: 'MACBOOK'
    },

    // STEAM DECK
    steamdeck: {
        keywords: [
            'steam deck',
            'steamdeck',
            'deck 256',
            'deck 512',
            'steam deck oled'
        ],
        resale: 350,
        maxBuy: 260,
        type: 'STEAM DECK'
    },

    // SAMSUNG
    samsung: {
        keywords: [
            's23',
            's23 ultra',
            's22',
            's22 ultra',
            'galaxy s23',
            'galaxy s22',
            'samsung s23',
            'samsung s22',
            'galaxy',
            'samsung galaxy',
            'galaxy ultra'
        ],
        resale: 400,
        maxBuy: 280,
        type: 'SAMSUNG'
    }
};
function detectProduct(title) {

    title = title.toLowerCase();

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
    if (bestScore >= 0.6) {

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

        if (activeSearches.has(searchKey)) {

            return interaction.reply(
                '⚠️ Scanner draait al.'
            );
        }

        activeSearches.add(searchKey);

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

        const page =
            await browser.newPage();

            page.setDefaultTimeout(30000);

        if (!global.activeIntervals) {

            global.activeIntervals =
                new Map();
        }

        const interval =
            setInterval(async () => {

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

await page.waitForTimeout(
    randomDelay
);

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

                                            '';

                                        const link =
                                            card.querySelector('a')?.href ||

                                            '';

                                        const image =
                                            card.querySelector('img')?.src ||

                                            '';

                                        return {

                                            title,
                                            price,
                                            link,
                                            image
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
// ALLEEN GOEDE PRODUCT TYPES TOESTAAN
const allowedWords = [

    // PS5
    'ps5',
    'playstation 5',
    'ps5 slim',
    'ps5 pro',
    'ps5 digital',
    'ps5 disc',

    // SWITCH
    'switch',
    'switch oled',
    'switch lite',
    'nintendo switch',

    // IPHONE
    'iphone 11',
    'iphone 12',
    'iphone 13',
    'iphone 14',
    'iphone 15',

    // IPAD
    'ipad',
    'ipad pro',
    'ipad air',

    // MACBOOK
    'macbook',
    'macbook air',
    'macbook pro',

    // SAMSUNG
    's23',
    's24',
    'galaxy s23',
    'galaxy s24',

    // STEAMDECK
    'steam deck',
    'steamdeck'
];

// MOET MINSTENS 1 MATCHEN
if (
    !allowedWords.some(word =>
        title.includes(word)
    )
) {

    console.log(
        "NOT ALLOWED:",
        title
    );

    continue;
}

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
    'faceplate'
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

const product =
    detectProduct(title);

                            if (!product) {

                                console.log(
                                    "PRODUCT NOT FOUND"
                                );

                                continue;
                            }

                            const price =
                                Number(

                                    item.price
                                        .replace(/[^\d,]/g, '')
                                        .replace(',', '.')
                                );

                            if (
                                !price ||
                                isNaN(price)
                            ) {
                                continue;
                            }

                           if (price > maxprijs) {

    console.log(
        "SKIPPED MAX PRICE:",
        price
    );

    continue;
}
console.log(
    "MAXBUY:",
    product.maxBuy,
    "PRICE:",
    price
);
                            if (
                                price >
                                product.maxBuy + 40
                            ) {

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
        "RAW PROFIT TOO LOW"
    );

    continue;
}
                            console.log(
                                "START AI ANALYZE"
                            );

                           const cacheKey =
    `${title}-${price}`;

let ai =
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

    const isHotDeal =
    profit >= 120;
                              
                                console.log(
    "PROFIT:",
    profit
);

                            if (profit < 20) {
                                continue;
                            }

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
                                                `€${price}`,

                                            inline: true
                                        },

                                        {
                                            name:
                                                '📈 Winst',

                                            value:
                                                `€${profit}`,

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

                    console.log(err);

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