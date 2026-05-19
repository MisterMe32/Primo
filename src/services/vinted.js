const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const seenItems = new Set();

async function fetchItems(url) {
    try {
        const res = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        return res.data.items || [];
    } catch (err) {
        console.log("Fetch error:", err.message);
        return [];
    }
}

function monitorVinted(channel, url) {
    setInterval(async () => {
        const items = await fetchItems(url);

        for (const item of items) {
            if (!seenItems.has(item.id)) {
                seenItems.add(item.id);

              const embed = new EmbedBuilder()
    .setTitle(item.title)
    .setURL(`https://www.vinted.nl/items/${item.id}`)
    .setDescription(`💶 €${item.price}`)
    .setColor(0x00AE86);

if (item.photo?.url) {
    embed.setImage(item.photo.url);
}

channel.send({
    embeds: [embed]
});
            }
        }
    }, 10000);
}

module.exports = { monitorVinted };
