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
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
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
// STAFF
// ========================================

function isStaff(interaction) {
  return interaction.memberPermissions?.has(
    PermissionFlagsBits.ManageChannels
  );
}

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
  if (!CLIENT_ID) {
    console.log('CLIENT_ID não configurado.');
    return;
  }

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
// PAINEL
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
// TICKET
// ========================================

function botoesTicket() {
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
// PAGAMENTO
// ========================================

function botoesPagamento() {
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
      .setCustomId('fechar_pagamento')
      .setLabel('Fechar')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ========================================
// MENU PRIVADO DA STAFF
// ========================================

function menuRecompensas() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('escolher_recompensa')
      .setPlaceholder('🎁 Escolha a recompensa')
      .addOptions(
        recompensas.map(recompensa => ({
          label: recompensa.nome,
          value: recompensa.id
        }))
      )
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

      if (!isStaff(interaction)) {
        return interaction.reply({
          content:
            'Você precisa ter a permissão **Gerenciar Canais**.',
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
    // COMPRAR
    // ====================================

    if (
      interaction.isButton() &&
      interaction.customId === 'comprar_caixa'
    ) {

      const modal = new ModalBuilder()
        .setCustomId('criar_ticket')
        .setTitle('🎁 Comprar Caixa');

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

    // ====================================
    // CRIAR TICKET
    // ====================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'criar_ticket'
    ) {

      const quantidade = Number(
        interaction.fields.getTextInputValue('quantidade')
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
              'Clique em **Realizar pagamento** para continuar.'
            )
        ],

        components: [botoesTicket()]
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

      const ticket = tickets.get(interaction.user.id);

      if (!ticket) {
        return interaction.reply({
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (!PIX_KEY) {
        return interaction.reply({
          content:
            'A variável PIX_KEY não está configurada.',
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
              deny: [
                PermissionFlagsBits.ViewChannel
              ]
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
            .setTitle('💳 PAGAMENTO — MEDUSA STORE')
            .setDescription(
              `🎁 Caixas: **${ticket.quantidade}**\n` +
              `💰 Valor: **R$ ${ticket.valor}**\n\n` +

              `🔑 **Chave Pix:**\n\`${PIX_KEY}\`\n\n` +

              '━━━━━━━━━━━━━━━━━━━━━━━\n\n' +

              '📸 **Envie seu comprovante neste canal.**\n\n' +

              '⚠️ O comprovante é obrigatório.\n\n' +

              'Após enviar, aguarde a Staff analisar.'
            )
        ],

        components: [botoesPagamento()]
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
          content: 'Ticket não encontrado.',
          ephemeral: true
        });
      }

      if (!ticket.comprovante) {
        return interaction.reply({
          content:
            '⚠️ O comprador ainda não enviou o comprovante.',
          ephemeral: true
        });
      }

      ticket.status = 'comprovante_aceito';

      // ISSO FICA OCULTO PARA O COMPRADOR
      return interaction.reply({
        content:
          '✅ **Comprovante aceito!**\n\n' +
          '🎁 Escolha a recompensa que o comprador receberá.\n' +
          '🔒 Esta escolha está visível somente para você.',

        components: [
          menuRecompensas()
        ],

        ephemeral: true
      });
    }

    // ====================================
    // REJEITAR
    // ====================================

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

      ticket.comprovante = false;

      return interaction.reply({
        content:
          '❌ Comprovante rejeitado.\n\n' +
          'O comprador deve enviar outro comprovante.',
        ephemeral: true
      });
    }

    // ====================================
    // STAFF ESCOLHE RECOMPENSA
    // ====================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'escolher_recompensa'
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

      const recompensa =
        recompensas.find(
          r =>
            r.id === interaction.values[0]
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

        ticket.status = 'finalizado';
        ticket.recompensa = recompensa.nome;

        return interaction.update({
          content:
            '✅ **Recompensa enviada no PV do comprador!**\n\n' +
            '🔒 O comprador não consegue ver esta mensagem.',
          components: []
        });

      } catch (error) {

        console.error(
          'Erro ao enviar PV:',
          error
        );

        return interaction.update({
          content:
            '⚠️ Não consegui enviar o PV do comprador.\n\n' +
            'Ele precisa permitir mensagens privadas do servidor.',
          components: []
        });
      }
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
// RECEBER COMPROVANTE
// ========================================

client.on('messageCreate', async message => {

  if (message.author.bot) return;

  const ticket =
    [...tickets.values()].find(
      t =>
        t.paymentChannelId ===
        message.channel.id
    );

  if (!ticket) return;

  if (
    message.author.id !==
    ticket.userId
  ) {
    return;
  }

  if (
    ticket.status !==
    'aguardando_comprovante'
  ) {
    return;
  }

  // Considera comprovante quando
  // o comprador envia imagem/anexo
  if (message.attachments.size === 0) {

    await message.reply(
      '📸 Envie o comprovante como imagem ou arquivo.'
    );

    return;
  }

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
