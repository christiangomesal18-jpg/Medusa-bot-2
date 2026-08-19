
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

          '🎁 Clique no botão abaixo para comprar.'
        );

      const botoes = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId('comprar_caixa')
          .setLabel('Comprar Caixa')
          .setEmoji('🎁')
          .setStyle(ButtonStyle.Primary)

      );

      return interaction.reply({
        embeds: [embed],
        components: [botoes]
      });

    }

    // ====================================
    // BOTÃO COMPRAR CAIXA
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'comprar_caixa'
    ) {

      const modal = new ModalBuilder()
        .setCustomId('quantidade_caixa')
        .setTitle('🎁 Comprar Caixa');

      const quantidade = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel('Quantidade de caixas')
        .setPlaceholder('Digite a quantidade. Ex: 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder()
          .addComponents(quantidade)
      );

      return interaction.showModal(modal);

    }

    // ====================================
    // RECEBER QUANTIDADE
    // ====================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'quantidade_caixa'
    ) {

      const quantidade = Number(
        interaction.fields.getTextInputValue('quantidade')
      );

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 1
      ) {

        return interaction.reply({
          content: '❌ Digite uma quantidade válida.',
          ephemeral: true
        });

      }

      const valor = (quantidade * 0.50)
        .toFixed(2)
        .replace('.', ',');

      // ==================================
      // CRIAR TICKET
      // ==================================

      const canal =
        await interaction.guild.channels.create({

          name: `ticket-${interaction.user.id}`,

          type: ChannelType.GuildText,

          permissionOverwrites: [

            {
              id: interaction.guild.roles.everyone.id,

              deny: [
                PermissionFlagsBits.ViewChannel
              ]
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

      const embed = new EmbedBuilder()
        .setTitle('🎁 SUA CAIXA')
        .setDescription(
          `📦 Quantidade: **${quantidade}**\n` +
          `💰 Valor total: **R$ ${valor}**\n\n` +

          '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

          '💳 Quando estiver pronto, clique em **Realizar pagamento**.'
        );

      const botoes = new ActionRowBuilder().addComponents(

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

      await canal.send({

        content: `${interaction.user}`,

        embeds: [embed],

        components: [botoes]

      });

      return interaction.reply({

        content:
          `✅ Seu ticket foi criado: ${canal}`,

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

        content: '❌ Ocorreu um erro.',

        ephemeral: true

      }).catch(() => {});

    }

  }

});

client.login(TOKEN);
