
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

client.once('clientReady', () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.login(TOKEN);
