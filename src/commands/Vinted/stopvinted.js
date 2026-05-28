import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stopvinted')
        .setDescription('Stop een actieve Vinted search'),

    async execute(interaction) {

        try {

         for (const [key, interval] of global.activeIntervals.entries()) {
    console.log("STOPPING:", interval);
            clearInterval(interval);
}

global.activeIntervals.clear();
console.log("ALL INTERVALS CLEARED");


if (global.activeBrowsers) {

    for (
        const [key, browser]
        of global.activeBrowsers.entries()
    ) {

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
if (global.vintedInterval) {

    clearInterval(global.vintedInterval);

    global.vintedInterval = null;
}

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
