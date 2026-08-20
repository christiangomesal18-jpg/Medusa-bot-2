
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
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PIX_KEY = process.env.PIX_KEY;

const tickets = new Map();

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

  try {

    // ====================================
    // PAINEL
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
    // COMPRAR CAIXA
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
        .setStyle(1)
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

      tickets.set(interaction.user.id, {

        userId: interaction.user.id,
        quantidade: quantidade,
        valor: valor,
        ticketChannelId: canal.id,
        paymentChannelId: null

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
    // REALIZAR PAGAMENTO
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'realizar_pagamento'
    ) {

      const ticket = tickets.get(
        interaction.user.id
      );

      if (!ticket) {

        return interaction.reply({

          content:
            '❌ Ticket não encontrado.',

          ephemeral: true

        });
      }

      if (!PIX_KEY) {

        return interaction.reply({

          content:
            '❌ A variável PIX_KEY não está configurada.',

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

          .setTitle(
            '💳 PAGAMENTO — MEDUSA STORE'
          )

          .setDescription(

            `🎁 Caixas: **${ticket.quantidade}**\n` +
            `💰 Valor: **R$ ${ticket.valor}**\n\n` +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +

            '📸 **Envie o comprovante neste canal.**\n\n' +

            '⚠️ Depois de enviar, aguarde a Staff.'

          );

      const botoes =
        new ActionRowBuilder().addComponents(

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
            .setCustomId('fechar_pagamento')
            .setLabel('Fechar')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Secondary)

        );

      await pagamento.send({

        content:
          `${interaction.user}`,

        embeds:
          [embed],

        components:
          [botoes]

      });

      return interaction.reply({

        content:
          `💳 Canal de pagamento criado: ${pagamento}`,

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

        content:
          `📋 **Chave Pix:**\n\`${PIX_KEY}\``,

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

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        )
      ) {

        return interaction.reply({

          content:
            '❌ Apenas a Staff pode aceitar o comprovante.',

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
            '❌ Ticket não encontrado.',

          ephemeral: true

        });
      }

      const menu =
        new StringSelectMenuBuilder()

          .setCustomId(
            `recompensa_${ticket.userId}`
          )

          .setPlaceholder(
            '🎁 Escolha a recompensa do comprador'
          )

          .addOptions(

            {
              label: 'R$ 50,00',
              value: '50',
              emoji: '💵'
            },

            {
              label: 'R$ 25,00',
              value: '25',
              emoji: '💵'
            },

            {
              label: 'R$ 10,00',
              value: '10',
              emoji: '💵'
            },

            {
              label: 'R$ 5,00',
              value: '5',
              emoji: '💵'
            },

            {
              label: 'R$ 2,00',
              value: '2',
              emoji: '💵'
            },

            {
              label: 'Cargo Personalizado',
              value: 'personalizado',
              emoji: '🎨'
            },

            {
              label: 'Cargo Especial 1',
              value: 'especial1',
              emoji: '⭐'
            },

            {
              label: 'Cargo Especial 2',
              value: 'especial2',
              emoji: '🌟'
            },

            {
              label: 'Nada',
              value: 'nada',
              emoji: '📦'
            }

          );

      const row =
        new ActionRowBuilder()
          .addComponents(menu);

      return interaction.reply({

        content:
          '🎁 **Escolha secretamente a recompensa do comprador:**',

        components:
          [row],

        ephemeral:
          true

      });

    }

    // ====================================
    // ESCOLHER RECOMPENSA
    // ====================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('recompensa_')
    ) {

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        )
      ) {

        return interaction.reply({

          content:
            '❌ Apenas a Staff pode escolher a recompensa.',

          ephemeral: true

        });
      }

      const userId =
        interaction.customId
          .replace('recompensa_', '');

      const recompensa =
        interaction.values[0];

      const usuario =
        await client.users.fetch(userId);

      let mensagem = '';

      if (recompensa === '50') {

        mensagem =
          '💵 **Parabéns!**\n\n' +
          'Você ganhou **R$ 50,00**!';

      }

      else if (recompensa === '25') {

        mensagem =
          '💵 **Parabéns!**\n\n' +
          'Você ganhou **R$ 25,00**!';

      }

      else if (recompensa === '10') {

        mensagem =
          '💵 **Parabéns!**\n\n' +
          'Você ganhou **R$ 10,00**!';

      }

      else if (recompensa === '5') {

        mensagem =
          '💵 **Parabéns!**\n\n' +
          'Você ganhou **R$ 5,00**!';

      }

      else if (recompensa === '2') {

        mensagem =
          '💵 **Parabéns!**\n\n' +
          'Você ganhou **R$ 2,00**!';

      }

      else if (
        recompensa === 'personalizado'
      ) {

        mensagem =
          '🎨 **Parabéns!**\n\n' +
          'Você ganhou um **Cargo Personalizado**!';

      }

      else if (
        recompensa === 'especial1'
      ) {

        mensagem =
          '⭐ **Parabéns!**\n\n' +
          'Você ganhou o **Cargo Especial 1**!';

      }

      else if (
        recompensa === 'especial2'
      ) {

        mensagem =
          '🌟 **Parabéns!**\n\n' +
          'Você ganhou o **Cargo Especial 2**!';

      }

      else {

        mensagem =
          '📦 **Resultado da sua caixa**\n\n' +
          'Dessa vez você não ganhou uma recompensa.';

      }

      try {

        await usuario.send(mensagem);

      } catch (error) {

        console.log(
          'Não foi possível enviar o PV do comprador.'
        );

      }

      return interaction.update({

        content:
          '✅ Recompensa enviada no PV do comprador.',

        components:
          []

      });

    }

    // ====================================
    // REJEITAR
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'rejeitar_comprovante'
    ) {

      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.ManageChannels
        )
      ) {

        return interaction.reply({

          content:
            '❌ Apenas a Staff pode rejeitar o comprovante.',

          ephemeral: true

        });
      }

      return interaction.reply({

        content:
          '❌ **Comprovante rejeitado.**\n\n' +
          'Peça ao comprador para enviar um novo comprovante.',

        ephemeral: true

      });

    }

    // ====================================
    // FECHAR
    // ====================================

    if (
      interaction.isButton() &&
      (
        interaction.customId === 'fechar_ticket' ||
        interaction.customId === 'fechar_pagamento'
      )
    ) {

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

  }

});

client.login(TOKEN);
