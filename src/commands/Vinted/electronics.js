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
let firstRun = true;

const blockedWords = [

    // accessoires
    'hoesje',
    'case',
    'cover',
    'charger',
    'oplader',
    'dock only',
    'joycon only',
    'controller only',
    'alleen controller',
    'tablet only',

    // defect
    'kapot',
    'defect',
    'werkt niet',
    'repair',
    'onderdelen',
    'for parts',

    // fake / scam
    'empty box',
    'doos only',
    'icloud locked',
    'account only',

    // irrelevante dingen
    'gezocht',
    'huur',
    'verhuur'
];
// AGRESSIEVE FLIP PRIJZEN
const products = {

    // SWITCH
    switchLite: {
      keywords: [
    'switch lite',
    'lite switch',
    'nintendo lite'
],
        resale: 120,
        maxBuy: 65,
        type: 'SWITCH LITE'
    },

    switchOLED: {
        keywords: [
    'switch oled',
    'oled switch',
    'nintendo oled'
],
        resale: 250,
        maxBuy: 220,
        type: 'SWITCH OLED'
    },

    switchNormal: {
    keywords: [
        'switch',
        'nintendo switch',
        'switch console',
        'switch v1',
        'switch v2'
    ],
        resale: 150,
        maxBuy: 130,
        type: 'SWITCH'
    },

    // PS5
    ps5Digital: {
       keywords: [
    'ps5 digital',
    'playstation 5 digital',
    'digital edition'
],
        resale: 300,
        maxBuy: 220,
        type: 'PS5 DIGITAL'
    },

    ps5Slim: {
       keywords: [
    'ps5 slim',
    'playstation 5 slim'
],
        resale: 390,
        maxBuy: 320,
        type: 'PS5 SLIM'
    },

    ps5Standard: {
        keywords: [
    'ps5',
    'playstation 5',
    'playstation5',
    'ps 5',
    'sony ps5'
],
        resale: 340,
        maxBuy: 330,
        type: 'PS5'
    },

    // IPHONES
    iphone11: {
       keywords: [
    'iphone 11',
    '11 pro',
    '11 pro max'
],
        resale: 220,
        maxBuy: 140,
        type: 'IPHONE 11'
    },

    iphone12: {
       keywords: [
    'iphone 12',
    '12 pro',
    '12 pro max'
],
        resale: 280,
        maxBuy: 190,
        type: 'IPHONE 12'
    },

    iphone13: {
       keywords: [
    'iphone 13',
    '13 pro',
    '13 pro max'
],
        resale: 420,
        maxBuy: 380,
        type: 'IPHONE 13'
    },

    // SAMSUNG
    samsungA54: {
       keywords: [
    'a54',
    'samsung a54',
    'galaxy a54'
],
        resale: 220,
        maxBuy: 140,
        type: 'SAMSUNG A54'
    },

    samsungS23: {
      keywords: [
    's23',
    's23 ultra',
    'galaxy s23',
    'samsung s23'
],
        resale: 420,
        maxBuy: 280,
        type: 'S23'
    },

    // STEAM DECK
    steamDeck: {
       keywords: [
    'steam deck',
    'steamdeck',
    'deck 256',
    'deck 512'
],
        resale: 350,
        maxBuy: 300,
        type: 'STEAM DECK'
    },

    // MACBOOKS
    macbookAir: {
       keywords: [
    'macbook air',
    'mac air',
    'm1 air',
    'm2 air'
],
        resale: 500,
        maxBuy: 450,
        type: 'MACBOOK AIR'
    },

    macbookPro: {
       keywords: [
    'macbook pro',
    'mac pro',
    'm1 pro',
    'm2 pro'
],
        resale: 750,
        maxBuy: 650,
        type: 'MACBOOK PRO'
    }
};

function detectProduct(title) {

    title = title.toLowerCase();

    for (const product of Object.values(products)) {

        for (const keyword of product.keywords) {

            if (title.includes(keyword)) {
                return product;
            }
        }
    }

    return null;
}

async function aiCheck(title) {

   const prompt = `
   Titel: ${title}

   Is dit:
   - alleen een accessoire
   OF
   - een volledige console/bundel?

   Antwoord ALLEEN met:

   ACCESSORY_ONLY
   of
   FULL_PRODUCT
   `;

   try {

      const response =
         await openai.chat.completions.create({

         model: "gpt-4o-mini",

         messages: [
            {
               role: "user",
               content: prompt
            }
         ],

         max_tokens: 10
      });

      return response
         .choices[0]
         .message.content
         .trim();

   } catch (err) {

      console.log("AI ERROR:", err);

      return "ACCESSORY_ONLY";
   }
}

async function analyzeDealAI({

    title,
    price,
    productType

}) {

    try {

        const prompt = `

Je bent een professionele reseller / flip expert.

Analyseer deze Vinted listing.

Titel:
${title}

Prijs:
€${price}

Product:
${productType}

Geef ALLEEN JSON terug.

Format:

{
  "score": number,
  "estimatedResale": number,
  "suggestedOffer": number,
  "risk": "low" | "medium" | "high",
  "summary": "korte uitleg"
}

Belangrijk:
- Denk als agressieve reseller
- Gebruik snelle doorverkoopprijzen
- Wees conservatief
- Hoge score alleen bij echte goede flips
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

        console.log(
            'AI ERROR:',
            err
        );

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

       
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]
});
        const page =
            await browser.newPage();

            if (!global.activeIntervals) {
    global.activeIntervals = new Map();
}
      const interval = setInterval(async () => {


    console.log("INTERVAL RUNNING:", searchKey);

    if (runningSearches.get(searchKey)) {

        return;

    }

    runningSearches.set(searchKey, true);

    try {

                const searchTerms = [

                    'ps5',
                    'nintendo switch',
                    'iphone',
                    'steam deck',
                    'macbook',
                    'samsung'
                ];

                for (const term of searchTerms) {

                    const url =
`https://www.vinted.nl/catalog?search_text=${encodeURIComponent(term)}&order=newest_first`;

await page.setExtraHTTPHeaders({
   'Accept-Language': 'en-US,en;q=0.9'
});
                    await page.goto(url, {

                        waitUntil:
                            'domcontentloaded',

                        timeout: 60000
                    });

                    await page.waitForTimeout(3000);

                    const items =
                        await page.$$eval(

                            '[data-testid="grid-item"]',

                            cards => {

                                return cards.map(card => {

                               const title =
    card.querySelector('img')?.alt ||
    card.querySelector('[data-testid="item-box-title"]')?.innerText ||
    '';
                                  const price = 
                                  card.querySelector('[data-testid="item-box-price"]')
?.innerText || '';

                                    const link =
    card.querySelector("a")?.href || "";


                                    const image =
card.querySelector('img')
?.src || '';

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
                        
                        const title =
                            item.title.toLowerCase();
if (seenItems.has(item.link)) {
    continue;
}

// eerste scan skippen
if (firstRun) {
    seenItems.add(item.link);
    continue;
}

seenItems.add(item.link);
                        // blocked words
                       if (
    blockedWords.some(word =>
        title.includes(word)
    )
) {

    console.log("SUSPICIOUS LISTING:", title);

    const aiResult =
        await aiCheck(title);

    console.log("AI RESULT:", aiResult);

    if (
        aiResult ===
        "ACCESSORY_ONLY"
    ) {

        console.log(
            "BLOCKED ACCESSORY"
        );

        continue;
    }
   console.log("AI APPROVED");

}

                        // detectie
                        const product =
                            detectProduct(title);

                       if (!product) {
  console.log("NO PRODUCT:", title);
   continue;
}

                        // prijs
                        const price = Number(
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
   console.log("PRICE TOO HIGH:", title, price);
   continue;
}

                        if (
                            price > product.maxBuy
                        ) {
                            continue;
                        }

                        const itemId =
                            item.link;

                       

                        // AI ANALYSE
                        let estimatedValue =
                            product.resale;

                        let suggestedOffer =
                            Math.floor(price * 0.85);

                        let aiScore = 70;

                        let aiRisk = 'medium';

                        let aiSummary =
                            'Standaard analyse';

                        const ai =
                            await analyzeDealAI({

                                title: item.title,
                                price,
                                productType:
                                    product.type
                            });

                        if (ai) {

                            estimatedValue =
                                ai.estimatedResale
                                || estimatedValue;

                            suggestedOffer =
                                ai.suggestedOffer
                                || suggestedOffer;

                            aiScore =
                                ai.score
                                || aiScore;

                            aiRisk =
                                ai.risk
                                || aiRisk;

                            aiSummary =
                                ai.summary
                                || aiSummary;
                        }

                        const profit =
                            estimatedValue - price;

                        // alleen goede flips
                        if (profit < 20) {
                            continue;
                        }

                        let dealRating =
                            '🟢 GOEDE DEAL';

                        if (profit >= 140) {

                            dealRating =
                                '🔥 INSANE DEAL';
                        }

                        else if (profit >= 90) {

                            dealRating =
                                '🟡 HEEL GOEDE DEAL';
                        }

                        const embed =
                            new EmbedBuilder()

                            .setTitle(`🔥 ${product.type}`)

                                .setURL(item.link)

                                .setColor(0x00AE86)

                             .addFields(

    {
        name: '💶 Prijs',
        value: `€${price}`,
        inline: true
    },

    {
        name: '📈 Winst',
        value: `€${profit}`,
        inline: true
    },

    {
        name: '🤖 AI Score',
        value: `${aiScore}/100`,
        inline: true
    },

    {
        name: '🧠 Analyse',
       value: aiSummary ? aiSummary.slice(0, 80) : "Geen analyse"
    }
)

                                .setFooter({

                                    text:
'Primo AI Electronics'
                                })

                                .setTimestamp();

                        if (item.image) {

                         embed.setThumbnail(item.image);
                        }
console.log(item.title, item.price);
console.log("SENDING ITEM");
                        await interaction.channel.send({

                            content:
`🚨 AI VINTED DEAL <@638981298555322368>`,

                            embeds: [embed]
                        });
                    }
                }

                firstRun = false;

            } catch (err) {

                console.log(err);
}  finally {

   runningSearches.set(
      searchKey,
      false
   );
}

        }, 45000);
        global.activeIntervals.set(searchKey, interval);
    }
};