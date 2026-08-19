
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PIX_KEY = process.env.PIX_KEY;

const tickets = new Map();

// ========================================
// COMANDO /PAINEL
// ========================================

const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel da Medusa Store.')
    .toJSON()
];

async function registrarComando() {

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

    console.log('Comando /painel registrado.');

  } catch (error) {

    console.error('Erro ao registrar comando:', error);

  }
}

// ========================================
// BOT ONLINE
// ========================================

client.once('clientReady', async () => {

  console.log(`BOT ONLINE: ${client.user.tag}`);

  await registrarComando();

});

// ========================================
// BOTÃO DO PAINEL
// ========================================

function botaoPainel() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId('comprar_caixa')
      .setLabel('Comprar Caixa')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Primary)

  );

}

// ========================================
// BOTÃO DO TICKET
// ========================================

function botaoPagamento() {

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

// ========================================
// INTERAÇÕES
// ========================================

client.on('interactionCreate', async interaction => {

  try {

    // ====================================
    // /PAINEL
    // ====================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === 'painel'
    ) {

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

          '🎁 Clique em **Comprar Caixa** para começar.'

        );

      return interaction.reply({

        embeds: [embed],

        components: [botaoPainel()]

      });

    }

    // ====================================
    // COMPRAR CAIXA
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'comprar_caixa'
    ) {

      const modal = new ModalBuilder()

        .setCustomId('criar_ticket')

        .setTitle('🎁 Comprar Caixa');

      const quantidade =
        new TextInputBuilder()

          .setCustomId('quantidade')

          .setLabel('Quantidade de caixas')

          .setPlaceholder('Ex: 1')

          .setStyle(TextInputStyle.Short)

          .setRequired(true);

      modal.addComponents(

        new ActionRowBuilder()
          .addComponents(quantidade)

      );

      return interaction.showModal(modal);

    }

    // ====================================
    // CRIAR TICKET
    // ====================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'criar_ticket'
    ) {

      const quantidade = Number(

        interaction.fields
          .getTextInputValue('quantidade')

      );

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

          name:
            `ticket-${interaction.user.id}`,

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

                PermissionFlagsBits.ReadMessageHistory

              ]

            }

          ]

        });

      tickets.set(interaction.user.id, {

        userId:
          interaction.user.id,

        quantidade:
          quantidade,

        valor:
          valor,

        ticketChannelId:
          canal.id

      });

      const embed =
        new EmbedBuilder()

          .setTitle('🎁 SUA CAIXA')

          .setDescription(

            `📦 Quantidade: **${quantidade}**\n` +

            `💰 Valor: **R$ ${valor}**\n\n` +

            'Clique em **Realizar pagamento** para continuar.'

          );

      await canal.send({

        content:
          `${interaction.user}`,

        embeds:
          [embed],

        components:
          [botaoPagamento()]

      });

      return interaction.reply({

        content:
          `✅ Ticket criado: ${canal}`,

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

      const ticket =
        tickets.get(interaction.user.id);

      if (!ticket) {

        return interaction.reply({

          content:
            'Ticket não encontrado.',

          ephemeral: true

        });

      }

      if (!PIX_KEY) {

        return interaction.reply({

          content:
            'A variável PIX_KEY não está configurada no Railway.',

          ephemeral: true

        });

      }

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

      ticket.paymentChannelId =
        pagamento.id;

      const embed =
        new EmbedBuilder()

          .setTitle('💳 PAGAMENTO — MEDUSA STORE')

          .setDescription(

            `🎁 Caixas: **${ticket.quantidade}**\n` +

            `💰 Valor: **R$ ${ticket.valor}**\n\n` +

            `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +

            '📸 Faça o pagamento e envie o comprovante neste canal.\n\n' +

            '⚠️ O comprovante será obrigatório.'

          );

      await pagamento.send({

        content:
          `${interaction.user}`,

        embeds:
          [embed]

      });

      return interaction.reply({

        content:
          `✅ Canal de pagamento criado: ${pagamento}`,

        ephemeral: true

      });

    }

    // ====================================
    // FECHAR TICKET
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'fechar_ticket'
    ) {

      await interaction.reply(
        '🔒 Fechando ticket...'
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
          '❌ Erro.',

        ephemeral: true

      }).catch(() => {});

    }

  }

});

client.login(TOKEN);
