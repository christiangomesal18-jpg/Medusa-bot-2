
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

const discordTranscripts = require('discord-html-transcripts');
const express = require('express');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PIX_KEY = process.env.PIX_KEY;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '';
const PUBLIC_URL = process.env.PUBLIC_URL;

const tickets = new Map();

const app = express();
const transcriptFolder = path.join(__dirname, 'transcripts');

if (!fs.existsSync(transcriptFolder)) {
  fs.mkdirSync(transcriptFolder, { recursive: true });
}

app.use('/transcripts', express.static(transcriptFolder));

app.get('/', (req, res) => {
  res.send('Medusa Store - Bot online.');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor web iniciado na porta ${PORT}`);
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online.'),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel da Medusa Store.')
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
    interaction.memberPermissions.has(
      PermissionFlagsBits.ManageChannels
    )
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

async function gerarTranscript(ticketChannel) {
  const attachment = await discordTranscripts.createTranscript(
    ticketChannel,
    {
      limit: -1,
      returnType: 'buffer',
      filename: `transcript-${ticketChannel.id}.html`,
      saveImages: false,
      poweredBy: true
    }
  );

  const fileName = `transcript-${ticketChannel.id}.html`;
  const filePath = path.join(transcriptFolder, fileName);

  fs.writeFileSync(filePath, attachment);

  if (!PUBLIC_URL) {
    return null;
  }

  return `${PUBLIC_URL}/transcripts/${fileName}`;
}

async function enviarTranscriptDM(user, ticketChannel, valor) {
  try {
    const link = await gerarTranscript(ticketChannel);

    if (!link) {
      await user.send(
        '✅ **Pagamento aprovado!**\n\n' +
        `💰 Valor: **R$ ${valor}**\n\n` +
        '📄 O transcript foi gerado, mas o link público ainda não foi configurado no Railway.'
      );

      return;
    }

    await user.send(
      '✅ **Pagamento aprovado!**\n\n' +
      `💰 Valor: **R$ ${valor}**\n\n` +
      '📄 **Transcript da compra:**\n' +
      link
    );

    return link;

  } catch (error) {
    console.error('Erro ao enviar transcript por DM:', error);

    await user.send(
      '✅ **Pagamento aprovado!**\n\n' +
      `💰 Valor: **R$ ${valor}**\n\n` +
      'Não consegui enviar o transcript por DM.'
    ).catch(() => {});
  }
}

client.once('clientReady', () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  try {

    // =========================
    // COMANDOS
    // =========================

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === 'ping') {
        return interaction.reply('Pong!');
      }

      if (interaction.commandName === 'painel') {

        if (!isStaff(interaction)) {
          return interaction.reply({
            content:
              'Você não tem permissão para usar este comando.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setDescription(
            '🎁 **CAIXAS — MEDUSA STORE 🪼**\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '💎 **PRÊMIOS DAS CAIXAS**\n\n' +
            '🎁 R$ 25,00 Pix\n' +
            '🎁 R$ 10,00 Pix\n' +
            '🎁 R$ 5,00 Pix\n' +
            '🎁 R$ 2,00 Pix\n' +
            '🎁 Cargo Personalizado\n' +
            '🎁 Cargo Especial\n' +
            '🎁 Cargo Especial\n' +
            '🎁 Nada\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '💸 **VALOR DA CAIXA**\n\n' +
            '🎁 1 Caixa — R$ 0,50\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '🛒 **COMO REALIZAR A COMPRA**\n\n' +
            '1️⃣ Escolha a quantidade de Caixas desejada.\n' +
            '2️⃣ Informe sua escolha neste ticket.\n' +
            '3️⃣ A Staff enviará as instruções de pagamento.\n' +
            '4️⃣ Envie o comprovante após realizar o pagamento.\n' +
            '5️⃣ Aguarde a confirmação e a entrega das Caixas.\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '⚠️ **IMPORTANTE**\n\n' +
            '• Confira a quantidade e o valor antes de comprar.\n' +
            '• Guarde o comprovante da compra.\n' +
            '• Em caso de problemas, informe a Staff neste ticket.\n' +
            '• Caso receba ban recentemente após a compra, a Medusa Store não se responsabiliza pela perda das Caixas.\n\n' +

            '🪼 **MEDUSA STORE**\n' +
            'Mais Caixas. Mais chances. Mais diversão. ⚡💜'
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('abrir_ticket')
            .setLabel('Abrir Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }

      return;
    }

    // =========================
    // ABRIR TICKET
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'abrir_ticket'
    ) {

      const existing = interaction.guild.channels.cache.find(
        channel =>
          channel.name ===
            `ticket-${interaction.user.username.toLowerCase()}` &&
          channel.type === ChannelType.GuildText
      );

      if (existing) {
        return interaction.reply({
          content: `Você já possui um ticket: ${existing}`,
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('valor_inicial')
        .setTitle('Quantidade de Caixas');

      const quantidade = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel('Quantidade de Caixas')
        .setPlaceholder('Ex: 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

      modal.addComponents(
        new ActionRowBuilder().addComponents(quantidade)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // CRIAR TICKET
    // =========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'valor_inicial'
    ) {

      const quantidade =
        interaction.fields.getTextInputValue('quantidade');

      const numero = Number(
        quantidade.replace(',', '.')
      );

      if (
        !Number.isInteger(numero) ||
        numero < 1
      ) {
        return interaction.reply({
          content:
            'Digite uma quantidade válida. Ex: `1`',
          ephemeral: true
        });
      }

      const valorTotal = (numero * 0.50)
        .toFixed(2)
        .replace('.', ',');

      const category = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === 'tickets'
      );

      const channel =
        await interaction.guild.channels.create({
          name:
            `ticket-${interaction.user.username.toLowerCase()}`,
          type: ChannelType.GuildText,
          parent: category ? category.id : undefined,

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
        await channel.permissionOverwrites.create(
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
        quantidade: numero,
        valor: valorTotal,
        ticketChannelId: channel.id,
        paymentChannelId: null,
        status: 'aguardando_pagamento'
      });

      const embed = new EmbedBuilder()
        .setTitle('🎁 Compra de Caixas')
        .setDescription(
          `🎁 **Quantidade:** ${numero} Caixa(s)\n` +
          `💰 **Valor total:** R$ ${valorTotal}\n\n` +
          'Confira os dados acima.\n' +
          'Caso precise alterar a quantidade, clique em **Editar quantia**.\n\n' +
          'Quando estiver tudo certo, clique em **Realizar pagamento**.'
        );

      await channel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [ticketButtons()]
      });

      return interaction.reply({
        content: `Ticket criado: ${channel}`,
        ephemeral: true
      });
    }

    // =========================
    // EDITAR QUANTIDADE
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'editar_valor'
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

      const modal = new ModalBuilder()
        .setCustomId('editar_valor_modal')
        .setTitle('Editar quantidade');

      const quantidade = new TextInputBuilder()
        .setCustomId('quantidade')
        .setLabel('Nova quantidade')
        .setPlaceholder('Ex: 5')
        .setValue(String(ticket.quantidade))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10);

      modal.addComponents(
        new ActionRowBuilder().addComponents(quantidade)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // SALVAR NOVA QUANTIDADE
    // =========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'editar_valor_modal'
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

      const quantidade =
        interaction.fields.getTextInputValue('quantidade');

      const numero = Number(
        quantidade.replace(',', '.')
      );

      if (
        !Number.isInteger(numero) ||
        numero < 1
      ) {
        return interaction.reply({
          content:
            'Digite uma quantidade válida. Ex: `5`',
          ephemeral: true
        });
      }

      ticket.quantidade = numero;

      ticket.valor = (numero * 0.50)
        .toFixed(2)
        .replace('.', ',');

      return interaction.reply({
        content:
          `Quantidade alterada para **${numero} Caixa(s)**.\n` +
          `Novo valor: **R$ ${ticket.valor}**.`,
        ephemeral: true
      });
    }

    // =========================
    // PAGAMENTO
    // =========================

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
          content:
            'A chave Pix não está configurada no Railway.',
          ephemeral: true
        });
      }

      const category = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === 'pagamentos'
      );

      const paymentChannel =
        await interaction.guild.channels.create({
          name:
            `pagamento-${interaction.user.username.toLowerCase()}`,
          type: ChannelType.GuildText,
          parent: category ? category.id : undefined,

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
        await paymentChannel.permissionOverwrites.create(
          STAFF_ROLE_ID,
          {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }
        );
      }

      ticket.paymentChannelId = paymentChannel.id;
      ticket.status = 'aguardando_comprovante';

      const embed = new EmbedBuilder()
        .setTitle('💳 REALIZAR PAGAMENTO')
        .setDescription(
          `🎁 **Caixas:** ${ticket.quantidade}\n` +
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +
          '1️⃣ Faça o pagamento.\n' +
          '2️⃣ Envie o comprovante neste canal.\n' +
          '3️⃣ Aguarde a conferência da Staff.\n\n' +
          '⚠️ A aprovação é feita **manualmente** pela Staff.'
        );

      await paymentChannel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [paymentButtons()]
      });

      return interaction.reply({
        content:
          `Canal de pagamento criado: ${paymentChannel}`,
        ephemeral: true
      });
    }

    // =========================
    // COPIAR PIX
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'copiar_pix'
    ) {

      if (!PIX_KEY) {
        return interaction.reply({
          content: 'Chave Pix não configurada.',
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          `📋 **Chave Pix:**\n\`${PIX_KEY}\``,
        ephemeral: true
      });
    }

    // =========================
    // APROVAR PAGAMENTO
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'aprovar_pagamento'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content:
            'Somente a Staff pode aprovar o pagamento.',
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

      if (ticket.status === 'aprovado') {
        return interaction.reply({
          content: 'Este pagamento já foi aprovado.',
          ephemeral: true
        });
      }

      ticket.status = 'aprovado';
      ticket.aprovadoPor = interaction.user.id;

      await interaction.reply(
        `✅ Pagamento de **R$ ${ticket.valor}** aprovado por ${interaction.user}.\n\n` +
        '📄 Gerando transcript e enviando para o comprador...'
      );

      const ticketChannel =
        interaction.guild.channels.cache.get(
          ticket.ticketChannelId
        );

      if (!ticketChannel) {
        return;
      }

      const link = await enviarTranscriptDM(
        await client.users.fetch(ticket.userId),
        ticketChannel,
        ticket.valor
      );

      if (link) {
        await interaction.channel.send(
          `📄 Transcript enviado por DM para <@${ticket.userId}>.`
        );
      }

      return;
    }

    // =========================
    // REPROVAR PAGAMENTO
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'reprovar_pagamento'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content:
            'Somente a Staff pode reprovar o pagamento.',
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

      ticket.status = 'reprovado';
      ticket.reprovadoPor = interaction.user.id;

      return interaction.reply(
        `❌ Pagamento de **R$ ${ticket.valor}** reprovado por ${interaction.user}.`
      );
    }

    // =========================
    // FECHAR TICKET
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'fechar_ticket'
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
          content:
            'Você não pode fechar este ticket.',
          ephemeral: true
        });
      }

      await interaction.reply(
        '🔒 Este ticket será fechado em 5 segundos...'
      );

      setTimeout(async () => {

        const ticketChannel =
          interaction.guild.channels.cache.get(
            ticket.ticketChannelId
          );

        const paymentChannel =
          ticket.paymentChannelId
            ? interaction.guild.channels.cache.get(
                ticket.paymentChannelId
              )
            : null;

        if (ticketChannel) {
          await ticketChannel.delete().catch(() => {});
        }

        if (paymentChannel) {
          await paymentChannel.delete().catch(() => {});
        }

        tickets.delete(ticket.userId);

      }, 5000);

      return;
    }

  } catch (error) {

    console.error('ERRO:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          'Ocorreu um erro ao executar esta ação.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

registerCommands();

client.login(TOKEN);
