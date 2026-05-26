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
  "productType": string,
  "estimatedResale": number,
  "maxBuyPrice": number,
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

Gebruik realistische resale prijzen.
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

                            'Accept-Language':
                                'en-US,en;q=0.9'
                        });

                        await page.goto(url, {

                            waitUntil:
                                'domcontentloaded',

                            timeout: 60000
                        });

                        await page.waitForTimeout(
                            3000
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
                                continue;
                            }

                            console.log(
                                "START AI ANALYZE"
                            );

                            const ai =
                                await analyzeDealAI({

                                    title: item.title,
                                    price
                                });

                            console.log(
                                "AI RESULT:",
                                ai
                            );

                            if (!ai) {
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

                            if (
                                price >
                                ai.maxBuyPrice
                            ) {

                                console.log(
                                    "PRICE TOO HIGH"
                                );

                                continue;
                            }

                            let estimatedValue =
                                ai.estimatedResale;

                            let aiScore =
                                ai.flipScore || 70;

                            let aiRisk =
                                ai.risk || 'medium';

                            let aiSummary =
                                ai.summary ||
                                'AI analyse';

                            const profit =
                                estimatedValue - price;

                            if (profit < 20) {
                                continue;
                            }

                            console.log(
                                "REACHED EMBED"
                            );

                            const embed =
                                new EmbedBuilder()

                                    .setTitle(
                                        `🔥 ${ai.productType}`
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