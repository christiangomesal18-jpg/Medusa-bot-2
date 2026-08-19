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
        valor,
        ticketChannelId: canal.id,
        paymentChannelId: null,
        comprovante: false,
        status: 'aguardando_pagamento'
      });

      await canal.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle('🎁 SUA CAIXA')
            .setDescription(
              `📦 Quantidade: **${quantidade}**\n` +
              `💰 Valor: **R$ ${valor}**\n\n` +
              'Clique em **Realizar pagamento**.'
            )
        ],
        components: [ticketButtons()]
      });

      return interaction.reply({
        content: `✅ Ticket criado: ${canal}`,
        ephemeral: true
      });
    }

    // ====================================
    // REALIZAR PAGAMENTO
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'realizar_pagamento'
    ) {

      const ticket = [...tickets.values()].find(
        t =>
          t.ticketChannelId === interaction.channel.id &&
          t.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (!PIX_KEY) {
        return interaction.reply({
          content: 'A PIX_KEY não está configurada.',
          ephemeral: true
        });
      }

      const pagamento =
        await interaction.guild.channels.create({
          name: `pagamento-${interaction.user.id}`,
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
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles
              ]
            }
          ]
        });

      ticket.paymentChannelId = pagamento.id;
      ticket.status = 'aguardando_comprovante';

      await pagamento.send({
        content: `${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle('💳 PAGAMENTO')
            .setDescription(
              `🎁 Caixas: **${ticket.quantidade}**\n` +
              `💰 Valor: **R$ ${ticket.valor}**\n\n` +

              `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +

              '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

              '📸 **Envie seu comprovante neste canal.**\n\n' +

              '⚠️ O comprovante é obrigatório.\n' +
              'Depois de enviar, aguarde a Staff.'
            )
        ],
        components: [pagamentoButtons()]
      });

      return interaction.reply({
        content: `💳 Canal de pagamento criado: ${pagamento}`,
        ephemeral: true
      });
    }

    // ====================================
    // COPIAR PIX
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'copiar_pix'
    ) {

      return interaction.reply({
        content: `📋 Chave Pix:\n\`${PIX_KEY}\``,
        ephemeral: true
      });
    }

    // ====================================
    // ACEITAR COMPROVANTE
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'aceitar_comprovante'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: 'Somente a Staff pode aceitar.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        t =>
          t.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (!ticket.comprovante) {
        return interaction.reply({
          content: '⚠️ O comprador ainda não enviou o comprovante.',
          ephemeral: true
        });
      }

      ticket.status = 'comprovante_aceito';

      return interaction.reply({
        content:
          '✅ Comprovante aceito!\n\n' +
          '🎁 Escolha agora a recompensa que o comprador receberá:',
        components: [menuRecompensa()],
        ephemeral: true
      });
    }

    // ====================================
    // REJEITAR COMPROVANTE
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'rejeitar_comprovante'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: 'Somente a Staff pode rejeitar.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        t =>
          t.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      ticket.comprovante = false;

      return interaction.reply({
        content:
          '❌ Comprovante rejeitado.\n' +
          'O comprador deve enviar outro comprovante.',
        ephemeral: true
      });
    }

    // ====================================
    // ESCOLHER RECOMPENSA
    // ====================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'escolher_recompensa'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: 'Somente a Staff pode escolher.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        t =>
          t.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      const recompensa =
        recompensas.find(
          r => r.id === interaction.values[0]
        );

      if (!recompensa) {
        return interaction.reply({
          content: 'Recompensa inválida.',
          ephemeral: true
        });
      }

      try {

        const comprador =
          await client.users.fetch(ticket.userId);

        await comprador.send(
          '🎁 **MEDUSA STORE** 🪼\n\n' +
          '✨ Sua caixa foi aberta!\n\n' +
          '🎉 **SURPRESA!**\n\n' +
          `🎁 Você ganhou: **${recompensa.nome}**\n\n` +
          'Obrigado pela compra! 💜'
        );

        ticket.status = 'finalizado';

        return interaction.update({
          content:
            `✅ Recompensa enviada no PV.\n\n` +
            `🎁 **${recompensa.nome}**`,
          components: []
        });

      } catch {

        return interaction.update({
          content:
            '⚠️ Não consegui enviar a mensagem no PV.',
          components: []
        });
      }
    }

    // ====================================
    // FECHAR
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'fechar'
    ) {

      const ticket = [...tickets.values()].find(
        t =>
          t.ticketChannelId === interaction.channel.id ||
          t.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (
        interaction.user.id !== ticket.userId &&
        !isStaff(interaction)
      ) {
        return interaction.reply({
          content: 'Você não pode fechar este canal.',
          ephemeral: true
        });
      }

      await interaction.reply('🔒 Fechando...');

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 1500);
    }

  } catch (error) {

    console.error(error);

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content: '❌ Erro.',
        ephemeral: true
      }).catch(() => {});
    }

  }

});

// ========================================
// DETECTAR COMPROVANTE
// ========================================

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  const ticket = [...tickets.values()].find(
    t => t.paymentChannelId === message.channel.id
  );

  if (!ticket) return;

  if (message.author.id !== ticket.userId) return;

  if (ticket.status !== 'aguardando_comprovante') return;

  ticket.comprovante = true;

  await message.channel.send(
    '📸 **Comprovante recebido!**\n\n' +
    'Aguarde a Staff analisar.'
  );

});

// ========================================
// LOGIN
// ========================================

client.login(TOKEN);
