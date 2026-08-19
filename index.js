;
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const command = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Responde com Pong!');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommand() {
  try {
    console.log('Registrando comando /ping...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: [command.toJSON()] }
    );

    console.log('Comando registrado!');
  } catch (error) {
    console.error(error);
  }
}

client.once('ready', () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong! 🏓');
  }
});

registerCommand();
client.login(process.env.TOKEN);
