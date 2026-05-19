import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stopvinted')
        .setDescription('Stop een actieve Vinted search'),

    async execute(interaction) {

        try {

         for (const [key, interval] of global.activeIntervals.entries()) {
    clearInterval(interval);
}

global.activeIntervals.clear();
if (global.activeBrowsers) {
  for (const [key, browser] of global.activeBrowsers.entries()) {
    try {
      await browser.close();
    } catch (e) {}

    global.activeBrowsers.delete(key);
  }
}
if (global.activeSearches) {
    global.activeSearches.clear();
}

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
