import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stopvinted')
        .setDescription('Stop een actieve Vinted search'),

    async execute(interaction) {

        try {

            // STOP ALLE INTERVALS
            if (global.activeIntervals) {

                for (const [key, interval] of global.activeIntervals.entries()) {

                    console.log("STOPPING:", key);

                    clearInterval(interval);
                }

                global.activeIntervals.clear();

                console.log("ALL INTERVALS CLEARED");
            }

            // SLUIT ALLE BROWSERS
            if (global.activeBrowsers) {

                for (const [key, browser] of global.activeBrowsers.entries()) {

                    try {

                        await browser.close();

                        console.log(
                            "BROWSER CLOSED:",
                            key
                        );

                    } catch (e) {

                        console.log(
                            "BROWSER CLOSE ERROR:",
                            e.message
                        );
                    }
                }

                global.activeBrowsers.clear();
            }

            // RESET OUDE INTERVAL
            if (global.vintedInterval) {

                clearInterval(global.vintedInterval);

                global.vintedInterval = null;
            }

            // RESET ACTIVE SEARCHES
            if (global.activeSearches) {

                global.activeSearches.clear();
            }

            // RESET SCANNER STATUS
            global.activeScanner = false;
            global.currentScanner = null;

            return interaction.reply({
                content: '🛑 Alle searches gestopt.',
                ephemeral: true
            });

        } catch (err) {

            console.log(err);

            return interaction.reply({
                content: '❌ Error bij stoppen van search.',
                ephemeral: true
            });
        }
    }
};