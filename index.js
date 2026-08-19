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
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '';

const tickets = new Map();

// ===============================
// RECOMPENSAS
// ===============================

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

// ===============================
// STAFF
// ===============================

function isStaff(interaction) {

  if (
    interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageChannels
    )
  ) {
    return true;
  }

  if (
    STAFF_ROLE_ID &&
    interaction.member?.roles?.cache?.has(STAFF_ROLE_ID)
  ) {
    return true;
  }

  return false;
}

// ===============================
// PAINEL
// ===============================

function painelButtons() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('abrir_caixa')
      .setLabel('Comprar Caixa')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Primary)

  );
}

// ===============================
// TICKET
// ===============================

function ticketButtons() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('realizar_pagamento')
      .setLabel('Realizar pagamento')
      .setEmoji('💳')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('fechar_ticket')
      .setLabel('Fechar')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)

  );
}

// ===============================
// CANAL DE PAGAMENTO
// ===============================

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
      .setCustomId('fechar_ticket')
      .setLabel('Fechar')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary)

  );
}

// ===============================
// MENU DA STAFF
// ===============================

function menuRecompensa() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()
      .setCustomId('staff_escolher_recompensa')
      .setPlaceholder('🎲 Escolha a recompensa')
      .addOptions(
        recompensas.map(recompensa => ({
          label: recompensa.nome,
          value: recompensa.id
        }))
      )

  );
}

// ===============================
// BOT ONLINE
// ===============================

client.once('clientReady', () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

// ===============================
// DETECTAR COMPROVANTE
// ===============================

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  const ticket = [...tickets.values()].find(
    t => t.paymentChannelId === message.channel.id
  );

  if (!ticket) return;

  if (message.author.id !== ticket.userId) return;

  if (ticket.status !== 'aguardando_comprovante') return;

  ticket.comprovanteEnviado = true;

  await message.channel.send(
    '📸 **Comprovante recebido!**\n\n' +
    'Aguarde a Staff conferir o pagamento.'
  );

});

// ===============================
// INTERAÇÕES
// ===============================

client.on('interactionCreate', async interaction => {

  try {

    // ===============================
    // ABRIR CAIXA
    // ===============================

    if (
      interaction.isButton() &&
      interaction.customId === 'abrir_caixa'
    ) {

      const modal = new ModalBuilder()
        .setCustomId('quantidade_caixas')
        .setTitle('🎁 Comprar Caixas');

      const quantidade = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel('Quantidade de caixas')
        .setPlaceholder('Ex: 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(quantidade)
      );

      return interaction.showModal(modal);
    }

    // ===============================
    // CRIAR TICKET
    // ===============================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'quantidade_caixas'
    ) {

      const quantidadeTexto =
        interaction.fields.getTextInputValue('quantidade');

      const quantidade = Number(quantidadeTexto);

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 1
      ) {
        return interaction.reply({
          content: 'Digite uma quantidade válida.',
          ephemeral: true
        });
      }

      const valor =
        (quantidade * 0.50)
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

      if (STAFF_ROLE_ID) {

        await canal.permissionOverwrites.create(
          STAFF_ROLE_ID,
          {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }
        );

      }

      tickets.set(interaction.user.id, {

        userId: interaction.user.id,

        quantidade,

        valor,

        ticketChannelId: canal.id,

        paymentChannelId: null,

        status: 'aguardando_pagamento',

        comprovanteEnviado: false

      });

      const embed =
        new EmbedBuilder()

          .setTitle('🎁 CAIXA — MEDUSA STORE 🪼')

          .setDescription(

            `🎁 **Quantidade:** ${quantidade}\n` +
            `💰 **Valor:** R$ ${valor}\n\n` +

            '📦 Cada caixa custa **R$ 0,50**.\n\n' +

            'Clique abaixo para realizar o pagamento.'

          );

      await canal.send({

        content: `${interaction.user}`,

        embeds: [embed],

        components: [ticketButtons()]

      });

      return interaction.reply({

        content: `✅ Ticket criado: ${canal}`,

        ephemeral: true

      });
    }

    // ===============================
    // REALIZAR PAGAMENTO
    // ===============================

    if (
      interaction.isButton() &&
      interaction.customId === 'realizar_pagamento'
    ) {

      const ticket =
        [...tickets.values()].find(

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

          content: 'A chave Pix não está configurada.',

          ephemeral: true

        });

      }

      // =================================
      // CRIA O CANAL SECUNDÁRIO
      // =================================

      const pagamento =
        await interaction.guild.channels.create({

          name:
            `pagamento-${interaction.user.id}`,

          type:
            ChannelType.GuildText,

          permissionOverwrites: [

            {
              id:
                interaction.guild.roles.everyone.id,

              deny: [
                PermissionFlagsBits.ViewChannel
              ]

            },

            {
              id:
                interaction.user.id,

              allow: [

                PermissionFlagsBits.ViewChannel,

                PermissionFlagsBits.SendMessages,

                PermissionFlagsBits.ReadMessageHistory,

                PermissionFlagsBits.AttachFiles

              ]

            }

          ]

        });

      if (STAFF_ROLE_ID) {

        await pagamento.permissionOverwrites.create(

          STAFF_ROLE_ID,

          {

            ViewChannel: true,

            SendMessages: true,

            ReadMessageHistory: true

          }

        );

      }

      ticket.paymentChannelId = pagamento.id;

      ticket.status = 'aguardando_comprovante';

      ticket.comprovanteEnviado = false;

      const embed =
        new EmbedBuilder()

          .setTitle('💳 PAGAMENTO — MEDUSA STORE')

          .setDescription(

            `🎁 **Caixas:** ${ticket.quantidade}\n` +

            `💰 **Valor:** R$ ${ticket.valor}\n\n` +

            `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '📸 **Envie o comprovante neste canal.**\n\n' +

            '⚠️ É obrigatório enviar o comprovante antes da Staff aceitar o pagamento.\n\n' +

            'Após o envio, aguarde a Staff.'

          );

      await pagamento.send({

        content: `${interaction.user}`,

        embeds: [embed],

        components: [pagamentoButtons()]

      });

      return interaction.reply({

        content:
          `💳 Canal de pagamento criado: ${pagamento}`,

        ephemeral: true

      });

    }

    // ===============================
    // COPIAR PIX
    // ===============================

    if (
      interaction.isButton() &&
      interaction.customId === 'copiar_pix'
    ) {

      return interaction.reply({

        content:
          `📋 **Chave Pix:**\n\`${PIX_KEY}\``,

        ephemeral: true

      });

    }

    // ===============================
    // ACEITAR COMPROVANTE
    // ===============================

    if (
      interaction.isButton() &&
      interaction.customId === 'aceitar_comprovante'
    ) {

      if (!isStaff(interaction)) {

        return interaction.reply({

          content:
            'Somente a Staff pode aceitar o comprovante.',

          ephemeral: true

        });

      }

      const ticket =
        [...tickets.values()].find(

          t =>
            t.paymentChannelId ===
            interaction.channel.id

        );

      if (!ticket) {

        return interaction.reply({

          content:
            'Ticket não encontrado.',

          ephemeral: true

        });

      }

      // =================================
      // OBRIGA A ENVIAR COMPROVANTE
      // =================================

      if (!ticket.comprovanteEnviado) {

        return interaction.reply({

          content:
            '⚠️ O comprador ainda não enviou o comprovante.',

          ephemeral: true

        });

      }

      ticket.status =
        'pagamento_aceito';

      // SOMENTE A STAFF VÊ

      return interaction.reply({

        content:

          '✅ **Comprovante aceito!**\n\n' +

          '🎲 Agora escolha a recompensa que o comprador receberá:',

        components: [
          menuRecompensa()
        ],

        ephemeral: true

      });

    }

    // ===============================
    // REJEITAR COMPROVANTE
    // ===============================

    if (
      interaction.isButton() &&
      interaction.customId === 'rejeitar_comprovante'
    ) {

      if (!isStaff(interaction)) {

        return interaction.reply({

          content:
            'Somente a Staff pode rejeitar.',

          ephemeral: true

        });

      }

      const ticket =
        [...tickets.values()].find(

          t =>
            t.paymentChannelId ===
            interaction.channel.id

        );

      if (!ticket) {

        return interaction.reply({

          content:
            'Ticket não encontrado.',

          ephemeral: true

        });

      }

      ticket.comprovanteEnviado = false;

      return interaction.reply({

        content:
          '❌ Comprovante rejeitado. O comprador deve enviar um novo comprovante.',

        ephemeral: true

      });

    }

    // ===============================
    // ESCOLHER RECOMPENSA
    // ===============================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        'staff_escolher_recompensa'
    ) {

      if (!isStaff(interaction)) {

        return interaction.reply({

          content:
            'Somente a Staff pode escolher.',

          ephemeral: true

        });

      }

      const ticket =
        [...tickets.values()].find(

          t =>
            t.paymentChannelId ===
            interaction.channel.id

        );

      if (!ticket) {

        return interaction.reply({

          content:
            'Ticket não encontrado.',

          ephemeral: true

        });

      }

      const id =
        interaction.values[0];

      const recompensa =
        recompensas.find(
          r => r.id === id
        );

      if (!recompensa) {

        return interaction.reply({

          content:
            'Recompensa inválida.',

          ephemeral: true

        });

      }

      try {

        const comprador =
          await client.users.fetch(
            ticket.userId
          );

        await comprador.send(

          '🎁 **MEDUSA STORE** 🪼\n\n' +

          '✨ Sua caixa foi aberta!\n\n' +

          '🎉 **SURPRESA!**\n\n' +

          `🎁 Você ganhou: **${recompensa.nome}**\n\n` +

          'Obrigado pela compra! 💜'

        );

        ticket.recompensa =
          recompensa.nome;

        ticket.status =
          'finalizado';

        return interaction.update({

          content:

            `✅ Recompensa enviada no PV do comprador.\n\n` +

            `🎁 Recompensa: **${recompensa.nome}**`,

          components: []

        });

      } catch {

        return interaction.update({

          content:
            '⚠️ Não consegui enviar o PV do comprador.',

          components: []

        });

      }

    }

    // ===============================
    // FECHAR
    // ===============================

    if (
      interaction.isButton() &&
      interaction.customId === 'fechar_ticket'
    ) {

      const ticket =
        [...tickets.values()].find(

          t =>
            t.ticketChannelId === interaction.channel.id ||
            t.paymentChannelId === interaction.channel.id

        );

      if (!ticket) {

        return interaction.reply({

          content:
            'Ticket não encontrado.',

          ephemeral: true

        });

      }

      if (
        interaction.user.id !== ticket.userId &&
        !isStaff(interaction)
      ) {

        return interaction.reply({

          content:
            'Você não pode fechar este canal.',

          ephemeral: true

        });

      }

      await interaction.reply(
        '🔒 Fechando...'
      );

      setTimeout(() => {

        interaction.channel
          .delete()
          .catch(() => {});

      }, 1500);

    }

  } catch (error) {

    console.error('ERRO:', error);

    if (
      !interaction.replied &&
      !interaction.deferred
    ) {

      await interaction.reply({

        content:
          '❌ Não foi possível realizar esta ação.',

        ephemeral: true

      }).catch(() => {});

    }

  }

});

client.login(TOKEN);
