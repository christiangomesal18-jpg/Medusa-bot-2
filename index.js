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

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '';

const tickets = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online.'),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de tickets.')
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

      if (interaction.commandName === 'painel') {

        if (!isStaff(interaction)) {
          return interaction.reply({
            content: '❌ Você não tem permissão para usar este comando.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎫 Atendimento')
          .setDescription(
            'Clique no botão abaixo para abrir um ticket.\n\n' +
            'Dentro do ticket você poderá escolher a quantia e realizar o pagamento.'
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
          channel.name === `ticket-${interaction.user.username.toLowerCase()}` &&
          channel.type === ChannelType.GuildText
      );

      if (existing) {
        return interaction.reply({
          content: `❌ Você já possui um ticket: ${existing}`,
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_valor_inicial')
        .setTitle('Valor do pagamento');

      const valor = new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Digite o valor')
        .setPlaceholder('Ex: 25,00')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(valor)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // CRIAR TICKET
    // =========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'modal_valor_inicial'
    ) {

      const valor = interaction.fields.getTextInputValue('valor');

      const category = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === 'tickets'
      );

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase()}`,
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
        valor: valor,
        ticketChannelId: channel.id,
        paymentChannelId: null,
        status: 'aguardando_pagamento'
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Seu Ticket')
        .setDescription(
          `Olá, ${interaction.user}!\n\n` +
          `💰 **Valor atual:** R$ ${valor}\n\n` +
          'Você pode alterar o valor ou realizar o pagamento.'
        );

      await channel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [ticketButtons()]
      });

      return interaction.reply({
        content: `✅ Ticket criado: ${channel}`,
        ephemeral: true
      });
    }

    // =========================
    // EDITAR VALOR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'editar_valor'
    ) {

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.ticketChannelId === interaction.channel.id &&
          ticket.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_editar_valor')
        .setTitle('Editar quantia');

      const valor = new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Novo valor')
        .setPlaceholder('Ex: 50,00')
        .setValue(ticket.valor)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(valor)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // SALVAR NOVO VALOR
    // =========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'modal_editar_valor'
    ) {

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.ticketChannelId === interaction.channel.id &&
          ticket.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      const novoValor =
        interaction.fields.getTextInputValue('valor');

      ticket.valor = novoValor;

      return interaction.reply({
        content: `✅ Valor alterado para **R$ ${novoValor}**.`,
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
        ticket =>
          ticket.ticketChannelId === interaction.channel.id &&
          ticket.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (!PIX_KEY) {
        return interaction.reply({
          content: '❌ A chave Pix não foi configurada.',
          ephemeral: true
        });
      }

      if (ticket.paymentChannelId) {
        const existing =
          interaction.guild.channels.cache.get(
            ticket.paymentChannelId
          );

        if (existing) {
          return interaction.reply({
            content: `💳 O canal de pagamento já existe: ${existing}`,
            ephemeral: true
          });
        }
      }

      const category = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === 'pagamentos'
      );

      const paymentChannel =
        await interaction.guild.channels.create({
          name: `pagamento-${interaction.user.username.toLowerCase()}`,
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
        .setTitle('💳 Realizar pagamento')
        .setDescription(
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +
          '1. Faça o pagamento.\n' +
          '2. Envie o comprovante neste canal.\n' +
          '3. Aguarde a conferência da staff.\n\n' +
          '⚠️ A aprovação é feita **manualmente**.'
        );

      await paymentChannel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [paymentButtons()]
      });

      return interaction.reply({
        content: `✅ Página de pagamento criada: ${paymentChannel}`,
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
          content: '❌ Chave Pix não configurada.',
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          `📋 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +
          'Copie a chave acima para realizar o pagamento.',
        ephemeral: true
      });
    }

    // =========================
    // APROVAR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'aprovar_pagamento'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: '❌ Apenas a staff pode aprovar pagamentos.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      ticket.status = 'aprovado';
      ticket.aprovadoPor = interaction.user.id;

      const embed = new EmbedBuilder()
        .setTitle('✅ Pagamento aprovado')
        .setDescription(
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `👤 **Aprovado por:** ${interaction.user}\n\n` +
          'O pagamento foi conferido e aprovado manualmente.'
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // =========================
    // REPROVAR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'reprovar_pagamento'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: '❌ Apenas a staff pode reprovar pagamentos.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      ticket.status = 'reprovado';
      ticket.reprovadoPor = interaction.user.id;

      const embed = new EmbedBuilder()
        .setTitle('❌ Pagamento reprovado')
        .setDescription(
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `👤 **Reprovado por:** ${interaction.user}\n\n` +
          'O pagamento foi reprovado manualmente.'
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // =========================
    // FECHAR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'fechar_ticket'
    ) {

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.ticketChannelId === interaction.channel.id ||
          ticket.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (
        interaction.user.id !== ticket.userId &&
        !isStaff(interaction)
      ) {
        return interaction.reply({
          content: '❌ Você não pode fechar este ticket.',
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
    console.error('ERRO NA INTERAÇÃO:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao executar essa ação.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

registerCommands();

client.login(TOKEN);const {
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

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || '';

const tickets = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica se o bot está online.'),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de tickets.')
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

      if (interaction.commandName === 'painel') {

        if (!isStaff(interaction)) {
          return interaction.reply({
            content: '❌ Você não tem permissão para usar este comando.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎫 Atendimento')
          .setDescription(
            'Clique no botão abaixo para abrir um ticket.\n\n' +
            'Dentro do ticket você poderá escolher a quantia e realizar o pagamento.'
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
          channel.name === `ticket-${interaction.user.username.toLowerCase()}` &&
          channel.type === ChannelType.GuildText
      );

      if (existing) {
        return interaction.reply({
          content: `❌ Você já possui um ticket: ${existing}`,
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_valor_inicial')
        .setTitle('Valor do pagamento');

      const valor = new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Digite o valor')
        .setPlaceholder('Ex: 25,00')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(valor)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // CRIAR TICKET
    // =========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'modal_valor_inicial'
    ) {

      const valor = interaction.fields.getTextInputValue('valor');

      const category = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === 'tickets'
      );

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase()}`,
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
        valor: valor,
        ticketChannelId: channel.id,
        paymentChannelId: null,
        status: 'aguardando_pagamento'
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Seu Ticket')
        .setDescription(
          `Olá, ${interaction.user}!\n\n` +
          `💰 **Valor atual:** R$ ${valor}\n\n` +
          'Você pode alterar o valor ou realizar o pagamento.'
        );

      await channel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [ticketButtons()]
      });

      return interaction.reply({
        content: `✅ Ticket criado: ${channel}`,
        ephemeral: true
      });
    }

    // =========================
    // EDITAR VALOR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'editar_valor'
    ) {

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.ticketChannelId === interaction.channel.id &&
          ticket.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_editar_valor')
        .setTitle('Editar quantia');

      const valor = new TextInputBuilder()
        .setCustomId('valor')
        .setLabel('Novo valor')
        .setPlaceholder('Ex: 50,00')
        .setValue(ticket.valor)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

      modal.addComponents(
        new ActionRowBuilder().addComponents(valor)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // SALVAR NOVO VALOR
    // =========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'modal_editar_valor'
    ) {

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.ticketChannelId === interaction.channel.id &&
          ticket.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      const novoValor =
        interaction.fields.getTextInputValue('valor');

      ticket.valor = novoValor;

      return interaction.reply({
        content: `✅ Valor alterado para **R$ ${novoValor}**.`,
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
        ticket =>
          ticket.ticketChannelId === interaction.channel.id &&
          ticket.userId === interaction.user.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (!PIX_KEY) {
        return interaction.reply({
          content: '❌ A chave Pix não foi configurada.',
          ephemeral: true
        });
      }

      if (ticket.paymentChannelId) {
        const existing =
          interaction.guild.channels.cache.get(
            ticket.paymentChannelId
          );

        if (existing) {
          return interaction.reply({
            content: `💳 O canal de pagamento já existe: ${existing}`,
            ephemeral: true
          });
        }
      }

      const category = interaction.guild.channels.cache.find(
        channel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === 'pagamentos'
      );

      const paymentChannel =
        await interaction.guild.channels.create({
          name: `pagamento-${interaction.user.username.toLowerCase()}`,
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
        .setTitle('💳 Realizar pagamento')
        .setDescription(
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +
          '1. Faça o pagamento.\n' +
          '2. Envie o comprovante neste canal.\n' +
          '3. Aguarde a conferência da staff.\n\n' +
          '⚠️ A aprovação é feita **manualmente**.'
        );

      await paymentChannel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [paymentButtons()]
      });

      return interaction.reply({
        content: `✅ Página de pagamento criada: ${paymentChannel}`,
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
          content: '❌ Chave Pix não configurada.',
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          `📋 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +
          'Copie a chave acima para realizar o pagamento.',
        ephemeral: true
      });
    }

    // =========================
    // APROVAR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'aprovar_pagamento'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: '❌ Apenas a staff pode aprovar pagamentos.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      ticket.status = 'aprovado';
      ticket.aprovadoPor = interaction.user.id;

      const embed = new EmbedBuilder()
        .setTitle('✅ Pagamento aprovado')
        .setDescription(
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `👤 **Aprovado por:** ${interaction.user}\n\n` +
          'O pagamento foi conferido e aprovado manualmente.'
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // =========================
    // REPROVAR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'reprovar_pagamento'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content: '❌ Apenas a staff pode reprovar pagamentos.',
          ephemeral: true
        });
      }

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      ticket.status = 'reprovado';
      ticket.reprovadoPor = interaction.user.id;

      const embed = new EmbedBuilder()
        .setTitle('❌ Pagamento reprovado')
        .setDescription(
          `💰 **Valor:** R$ ${ticket.valor}\n\n` +
          `👤 **Reprovado por:** ${interaction.user}\n\n` +
          'O pagamento foi reprovado manualmente.'
        );

      return interaction.reply({
        embeds: [embed]
      });
    }

    // =========================
    // FECHAR
    // =========================

    if (
      interaction.isButton() &&
      interaction.customId === 'fechar_ticket'
    ) {

      const ticket = [...tickets.values()].find(
        ticket =>
          ticket.ticketChannelId === interaction.channel.id ||
          ticket.paymentChannelId === interaction.channel.id
      );

      if (!ticket) {
        return interaction.reply({
          content: '❌ Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (
        interaction.user.id !== ticket.userId &&
        !isStaff(interaction)
      ) {
        return interaction.reply({
          content: '❌ Você não pode fechar este ticket.',
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
    console.error('ERRO NA INTERAÇÃO:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Ocorreu um erro ao executar essa ação.',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

registerCommands();

client.login(TOKEN);
     
