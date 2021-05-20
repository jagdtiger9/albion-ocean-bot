/**
 * https://blog.insiderattack.net/working-with-multiple-nodejs-versions-85c8eef7a600
 * npm install -g n
 * n 8.11.3
 * n - переключение версии, для php-env 8.11.2
 *
 * Emoji
 * https://discordjs.guide/popular-topics/reactions.html#reacting-to-messages
 * https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/using-emojis.md
 * Для получения кода эмоции - \+картинка эмоции в чат
 * копируем и используем
 *
 * Разметочка
 * https://www.writebots.com/discord-text-formatting/
 *
 * Управление ролями
 * https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/understanding/roles.md
 */

const OceanBot = require('./oceanlib.js');
const config = require('./config.json');
const emoji = require('./data/emoji.json');
const request = require('request');
const Discord = require('discord.js');
const fs = require('fs');
const commandInfo = fs.readFileSync('./data/help.md', 'utf8');
const ctaInfo = fs.readFileSync('./data/ctaHelp.md', 'utf8');
const ctaDescription = fs.readFileSync('./data/ctaDescription.md', 'utf8');

const Ocean = new OceanBot(config, emoji, ctaDescription, Discord, request);
const client = new Discord.Client({partials: ['MESSAGE', 'CHANNEL', 'REACTION']});

let args;

/**
 * Wait until ready and logged in
 * If we do not wait for the ready event
 * All commands will process before we are authorized
 */
client.on('ready', () => {
    console.log('Connected as ' + client.user.tag);
    console.log('Client name ' + client.user.username);
    // If the config.username differs, change it
    if (client.user.username !== config.bot.name) {
        client.user.setUsername(config.bot.name);
    }
    client.user.setActivity(config.playingGame);
});

client.on('message', message => {
    if (!(args = getArgs(message))) {
        return;
    }

    let command = args.shift().toLowerCase();
    switch (command) {
        case 'help':
            Ocean.help(message, commandInfo);
            break;
        case 'register':
            Ocean.register(message, args);
            break;
        case 'password':
            Ocean.password(message, args, 1);
            break;
        case 'access':
            Ocean.password(message, args, 1);
            break;
        case 'updateDb':
            Ocean.updateDb(message, args);
            break;
        case 'cta':
            Ocean.cta(message, args, ctaInfo);
            break;
    }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    // Редактирование сообщения созданного вне текущей сессии, автор не задан
    if (!newMessage.author) {
        return;
    }
    if (!(args = getArgs(newMessage))) {
        return;
    }

    let command = args.shift().toLowerCase();
    switch (command) {
        case 'cta':
            Ocean.cta(newMessage, args, ctaInfo);
            break;
    }
})

client.on('messageDelete', (message) => {
    if (message.partial) {
        // Удаление сообщения созданного вне текущей сессии, автор не задан
        console.log(`The message is partial, ${message.id}, impossible to delete`);
    }

    if (!message.author) {
        return;
    }
    if (!(args = getArgs(message))) {
        return;
    }
    let command = args.shift().toLowerCase();
    if (command === 'cta') {
        Ocean.deleteCta(message);
    }
})

client.on('messageReactionAdd', async (reaction, user) => {
    return false;
    validateReaction(reaction).then(
        messageReactionHandler(reaction, user, true),
        error => console.log('AddReaction error', error)
    );
});

client.on('messageReactionRemove', async (reaction, user) => {
    validateReaction(reaction).then(
        messageReactionHandler(reaction, user),
        error => console.log('RemoveReaction error', error)
    );
});

function messageReactionHandler(reaction, user, add = false) {
    // Реакцию проставил-снял bot
    if (config.bot.id === user.id) {
        return null;
    }

    // Сервисное сообщение, назначение роли albion-friend
    if (reaction.emoji.name === emoji.friendRole.icon) {
        Ocean.addFriend(reaction, user, add);
        return null;
    }

    // CTA
    if (Object.values(emoji.cta).includes(reaction.emoji.name)) {
        if (add) {
            Ocean.joinMember(reaction, user);
        } else {
            // reaction.me не проверяем, при отмене реакции, me - оставшийся голос
            Ocean.leaveMember(reaction, user);
        }
        return null;
    }
}

function getArgs(message) {
    let channelID = message.channel.id;
    if (config.botChannel.main !== channelID) {
        return null;
    }
    // Если редактируемое-удаляемое сообщение было создано не во время текущей сессии бота, автор будет не определен
    if (message.content.indexOf(config.cmdPrefix) !== 0 || (message.author && message.author.bot)) {
        return null;
    }

    // Параметры команды
    let commandLine = message.content.slice(config.cmdPrefix.length).trim().split(/\n/g).shift();

    return commandLine.split(/\s/g);
}

async function validateReaction(reaction) {
    // Partial reaction
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    let channelID = reaction.message.channel.id;
    if (config.botChannel.cta !== channelID) {
        return Promise.reject();
    }

    return Promise.resolve(reaction);
}

if (typeof config !== 'undefined') {
    if (config.botToken) {
        client.login(config.botToken);
    } else {
        console.log("ERROR: Bot token undefined")
    }
} else {
    console.log("ERROR: config file not found")
    console.log("$ cp config.json.example config.json")
}
