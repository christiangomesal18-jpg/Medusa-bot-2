const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const PIX_KEY = process.env.PIX_KEY;

const tickets = new Map();

// ========================================
// RECOMPENSAS
// ========================================

const recompensas = [
  { id: 'r50', nome: 'R$ 50,00' },
  { id: 'r25', nome: 'R$ 25,00' },
  { id: 'r10', nome: 'R$ 10,00' },
  { id: 'r5', nome: 'R$ 5,00' },
  { id: 'r2', nome: 'R$ 2,00' },
  { id: 'cargo_personalizado', nome: 'Cargo Personalizado' },
  { id: 'cargo_especial_1', nome: 'Cargo Especial 1' },
  { id: 'cargo_especial_2', nome: 'Cargo Especial 2' },
  { id: 'nada', nome: 'Nada' }
];

// ========================================
// STAFF = GERENCIAR CANAIS
// ========================================

function isStaff(interaction) {
  return interaction.memberPermissions?.has(
    PermissionFlagsBits.ManageChannels
  );
}

// ========================================
// BOT ONLINE
// ========================================

client.once('clientReady', () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

// ========================================
// PAINEL
// ========================================

function painelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir_caixa')
      .setLabel('Comprar Caixa')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Primary)
  );
}

// ========================================
// TICKET
// ========================================

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('realizar_pagamento')
      .setLabel('Realizar pagamento')
      .setEmoji('💳')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('fechar')
      .setLabel('Fechar')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

// ========================================
// PAGAMENTO
// ========================================

function pagamentoButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('copiar_pix')
      .setLabel('Copiar chave Pix')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('aceitar_comprovante')
      .setLabel('Aceitar comprovante')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('rejeitar_comprovante')
      .setLabel('Rejeitar comprovante')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('fechar')
      .setLabel('Fechar')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ========================================
// MENU DE RECOMPENSA DA STAFF
// ========================================

function menuRecompensa() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('escolher_recompensa')
      .setPlaceholder('🎁 Escolha a recompensa')
      .addOptions(
        recompensas.map(r => ({
          label: r.nome,
          value: r.id
        }))
      )
  );
}

// ========================================
// COMANDO /PAINEL
// ========================================

client.on('interactionCreate', async interaction => {

  try {

    // ====================================
    // COMANDO PAINEL
    // ====================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === 'painel'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: 'Você precisa ter Gerenciar Canais.',
          ephemeral: true
        });
      }

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

          '**💸 VALOR**\n\n' +
          '🎁 1 Caixa — **R$ 0,50**\n\n' +

          '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

          '**🛒 COMO COMPRAR**\n\n' +
          '1️⃣ Clique em Comprar Caixa.\n' +
          '2️⃣ Escolha a quantidade.\n' +
          '3️⃣ Realize o pagamento.\n' +
          '4️⃣ Envie o comprovante.\n' +
          '5️⃣ Aguarde a Staff.\n\n' +

          '🪼 **MEDUSA STORE**\n' +
          'Mais caixas. Mais chances. 💜'
        );

      return interaction.reply({
        embeds: [embed],
        components: [painelButtons()]
      });
    }

    // ====================================
    // COMPRAR CAIXA
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'abrir_caixa'
    ) {

      const modal = new ModalBuilder()
        .setCustomId('quantidade')
        .setTitle('🎁 Comprar Caixas');

      const input = new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Quantidade de caixas')
        .setPlaceholder('Ex: 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    // ====================================
    // CRIAR TICKET
    // ====================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'quantidade'
    ) {

      const quantidade = Number(
        interaction.fields.getTextInputValue('valor')
      );

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 1
      ) {
        return interaction.reply({
          content: 'Quantidade inválida.',
          ephemeral: true
        });
      }

      const valor = (quantidade * 0.50)
        .toFixed(2)
        .replace('.', ',');

      const canal =
        await interaction.guild.channels.create({
          name: `ticket-${interaction.user.id}`,
          type: ChannelType.GuildText,

          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ]
        });

      tickets.set(interaction.user.id, {
        userId: interaction.user.id,
        quantidade,
