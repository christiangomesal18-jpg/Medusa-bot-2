
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
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

// =========================
// BOTÕES DO TICKET
// =========================

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

// =========================
// BOTÕES DO PAGAMENTO
// =========================

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

// =========================
// RECOMPENSAS
// =========================

const recompensas = [
  {
    id: 'nada',
    label: 'Nada',
    description: 'Nenhuma recompensa'
  },
  {
    id: 'cargo_personalizado',
    label: 'Cargo Personalizado',
    description: 'Cargo Personalizado'
  },
  {
    id: 'cargo_especial_1',
    label: 'Cargo Especial 1',
    description: 'Primeiro Cargo Especial'
  },
  {
    id: 'cargo_especial_2',
    label: 'Cargo Especial 2',
    description: 'Segundo Cargo Especial'
  },
  {
    id: 'r50',
    label: 'R$ 50',
    description: 'Recompensa de R$ 50'
  },
  {
    id: 'r25',
    label: 'R$ 25',
    description: 'Recompensa de R$ 25'
  },
  {
    id: 'r10',
    label: 'R$ 10',
    description: 'Recompensa de R$ 10'
  },
  {
    id: 'r5',
    label: 'R$ 5',
    description: 'Recompensa de R$ 5'
  },
  {
    id: 'r2',
    label: 'R$ 2',
    description: 'Recompensa de R$ 2'
  }
];

function recompensaMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('escolher_recompensa')
      .setPlaceholder('🎁 Escolha a recompensa')
      .addOptions(
        recompensas.map(recompensa => ({
          label: recompensa.label,
          description: recompensa.description,
          value: recompensa.id
        }))
      )
  );
}

// =========================
// BOT ONLINE
// =========================

client.once('clientReady', () => {
  console.log(`BOT ONLINE: ${client.user.tag}`);
});

// =========================
// INTERAÇÕES
// =========================

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
            '🎁 R$ 25,00\n' +
            '🎁 R$ 10,00\n' +
            '🎁 R$ 5,00\n' +
            '🎁 R$ 2,00\n' +
            '🎁 Cargo Personalizado\n' +
            '🎁 Cargo Especial 1\n' +
            '🎁 Cargo Especial 2\n' +
            '🎁 Nada\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '💸 **VALOR DA CAIXA**\n\n' +
            '🎁 1 Caixa — R$ 0,50\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '🛒 **COMO REALIZAR A COMPRA**\n\n' +
            '1️⃣ Escolha a quantidade de Caixas.\n' +
            '2️⃣ Abra um ticket.\n' +
            '3️⃣ Realize o pagamento.\n' +
            '4️⃣ Envie o comprovante.\n' +
            '5️⃣ Aguarde a aprovação da Staff.\n\n' +

            '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

            '⚠️ **IMPORTANTE**\n\n' +
            '• Confira a quantidade e o valor antes de comprar.\n' +
            '• Guarde o comprovante da compra.\n' +
            '• Em caso de problemas, informe a Staff.\n\n' +

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
          content: 'Digite uma quantidade válida. Ex: `1`',
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
          'Confira os dados acima.\n\n' +
          'Clique em **Realizar pagamento** para continuar.'
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
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(quantidade)
      );

      return interaction.showModal(modal);
    }

    // =========================
    // SALVAR QUANTIDADE
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
          content: 'Digite uma quantidade válida.',
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
    // REALIZAR PAGAMENTO
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
              deny: [PermissionFlags.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlags.ViewChannel,
                PermissionFlags.SendMessages,
                PermissionFlags.ReadMessageHistory
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
          '3️⃣ Aguarde a conferência da Staff.'
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
          content:
            'Este pagamento já foi aprovado.',
          ephemeral: true
        });
      }

      ticket.status = 'aprovado';
      ticket.aprovadoPor = interaction.user.id;

      // SOMENTE A STAFF QUE CLICOU VÊ O MENU
      return interaction.reply({
        content:
          '✅ **Pagamento aprovado!**\n\n' +
          '🎁 Escolha a recompensa que o comprador receberá:',
        components: [recompensaMenu()],
        ephemeral: true
      });
    }

    // =========================
    // ESCOLHER RECOMPENSA
    // =========================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'escolher_recompensa'
    ) {

      if (!isStaff(interaction)) {
        return interaction.reply({
          content:
            'Somente a Staff pode escolher a recompensa.',
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

      const recompensaId =
        interaction.values[0];

      const recompensa =
        recompensas.find(
          r => r.id === recompensaId
        );

      if (!recompensa) {
        return interaction.reply({
          content: 'Recompensa inválida.',
          ephemeral: true
        });
      }

      ticket.recompensa = recompensa.label;

      let comprador;

      try {
        comprador = await client.users.fetch(
          ticket.userId
        );
      } catch (error) {
        console.error(
          'Erro ao encontrar comprador:',
          error
        );

        return interaction.update({
          content:
            '❌ Não consegui encontrar o comprador.',
          components: []
        });
      }

      try {

        await comprador.send(
          '🎁 **MEDUSA STORE**\n\n' +
          '✅ Seu pagamento foi aprovado!\n\n' +
          `🎁 **Sua recompensa:** ${recompensa.label}\n\n` +
          'Obrigado pela compra! 🪼💜'
        );

        // A confirmação continua SOMENTE para a Staff
        return interaction.update({
          content:
            `✅ Recompensa **${recompensa.label}** enviada no PV do comprador.`,
          components: []
        });

      } catch (error) {

        console.error(
          'Erro ao enviar DM:',
          error
        );

        return interaction.update({
          content:
            '⚠️ Não consegui enviar a recompensa por PV. O comprador pode estar com as DMs fechadas.',
          components: []
        });
      }
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

      return interaction.reply(
        `❌ Pagamento de **R$ ${ticket.valor}** reprovado.`
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
