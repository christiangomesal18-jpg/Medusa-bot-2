
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel das caixas.')
    .toJSON()
];

client.once('clientReady', async () => {

  console.log(`BOT ONLINE: ${client.user.tag}`);

  const rest = new REST({
    version: '10'
  }).setToken(TOKEN);

  try {

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands
      }
    );

    console.log('COMANDO /PAINEL REGISTRADO');

  } catch (error) {

    console.error(error);

  }

});

client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== 'painel') return;

  const embed = new EmbedBuilder()
    .setTitle('🎁 CAIXAS — MEDUSA STORE 🪼')
    .setDescription(
      '**💎 PRÊMIOS DAS CAIXAS**\n\n' +

      '🎁 R$ 50,00\n' +
      '🎁 R$ 25,00\n' +
      '🎁 R$ 10,00\n' +
      '🎁 R$ 5,00\n' +
      '🎁 R$ 2,00\n' +
      '🎁 Cargo Personalizado\n' +
      '🎁 Cargo Especial 1\n' +
      '🎁 Cargo Especial 2\n' +
      '🎁 Nada\n\n' +

      '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

      '**💸 VALOR DA CAIXA**\n\n' +

      '🎁 1 Caixa — **R$ 0,50**\n\n' +

      '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

      '🎁 Clique no botão abaixo para comprar.'
    );

  const botoes = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('comprar_caixa')
      .setLabel('Comprar Caixa')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Primary)

  );

  await interaction.reply({
    embeds: [embed],
    components: [botoes]
  });

});

client.login(TOKEN);
