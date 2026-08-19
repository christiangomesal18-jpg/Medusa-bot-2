;
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PIX_KEY = process.env.PIX_KEY;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const tickets = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de tickets.'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log('Comandos registrados!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
}

function isStaff(interaction) {
  if (
    interaction.memberPermissions &&
    interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)
  ) {
    return true;
  }

  if (
    STAFF_ROLE_ID &&
    interaction.member &&
    interaction.member.roles &&
    interaction.member.roles.cache.has(STAFF_ROLE_ID)
  ) {
    return true;
  }

  return false;
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('editar_valor')
      .setLabel('Editar quantia')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('realizar_pagamento')
      .setLabel('Realizar pagamento')
      .setEmoji('💳')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('fechar_ticket')
      .setLabel('Fechar ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function paymentButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('copiar_pix')
      .setLabel('Copiar chave Pix')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('aprovar_pagamento')
      .setLabel('Aprovar pagamento')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('reprovar_pagamento')
      .setLabel('Reprovar pagamento')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('fechar_ticket')
      .setLabel('Fechar ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary)
  );
}

client.once('clientReady', () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  try {

    // =========================
    // COMANDOS
    // =========================

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === 'ping') {
        return interaction.reply('Pong! 🏓');
      }

      if
