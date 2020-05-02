// https://blog.insiderattack.net/working-with-multiple-nodejs-versions-85c8eef7a600
// npm install -g n
// n 8.11.3
// n - переключение версии, для magicpro 8.11.2
//
// Emoji
// https://discordjs.guide/popular-topics/reactions.html#reacting-to-messages
// https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/using-emojis.md

// Define static constants
const config = require('./config.json');

// Require modules
const Discord = require('discord.js');
const client = new Discord.Client({partials: ['MESSAGE', 'REACTION']});

const oceanlib = require('./oceanlib.js');

/**
 * Wait until ready and logged in
 * If we do not wait for the ready event
 * All commands will process before we are authorized
 */
client.on('ready', () => {
    console.log('Connected as ' + client.user.tag);
    console.log('Client name ' + client.user.username);
    // If the config.username differs, change it
    if (client.user.username != config.username) {
        client.user.setUsername(config.username);
    }
    client.user.setActivity(config.playingGame);
});

/**
 * On receive message
 */
client.on('message', message => {
    let channelID = message.channel.id;

    if (message.content.indexOf(config.cmdPrefix) !== 0 || message.author.bot) {
        return;
    }
    // Execute command!
    let args = message.content.slice(config.cmdPrefix.length).trim().split(/\n|\s/g);
    let command = args.shift().toLowerCase();

    if (command === 'auth') {
        oceanlib.auth(message, args);
    } else if (command === 'register') {
        oceanlib.register(message, args);
    } else if (command === 'cta') {
        oceanlib.cta(message, args);
    } else if (command === 'ok') {
        console.log(message.guild.emojis.cache);
        const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'crossed_swords');
        console.log(emoji);
        message.guild.emojis.cache.map(emoji => console.log(emoji.name));

        //message.reply('ko');
        message.react('🆗');
    } else if (command === 'clear') {
        oceanlib.clear(message);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    console.log(reaction.emoji.name, '🆗');
    if (reaction.me) {
        return;
    }
    console.log(reaction.emoji.name, '⚔');
    if (reaction.emoji.name === '⚔') {
        console.log('SWORDS');
    }
    console.log(reaction.emoji, reaction.emoji.name);
    console.log(reaction.message.id, user.id, user.username);

    //const swords = reaction.client.emojis.find(emoji => emoji.name === "crossed_swords");
    //console.log(client);

    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    // Now the message has been cached and is fully available
    console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
    // The reaction is now also fully available and the properties will be reflected accurately:
    console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
});
client.on('messageReactionRemove', async (reaction, user) => {
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    // Now the message has been cached and is fully available
    console.log(`${reaction.message.author}'s message "${reaction.message.content}" lost a reaction!`);
    // The reaction is now also fully available and the properties will be reflected accurately:
    console.log(`${reaction.count} user(s) have left the reaction to this message!`);
});

if (typeof config !== 'undefined') {
    if (config.token) {
        client.login(config.token);
    } else {
        console.log("ERROR: No bot token defined")
    }
} else {
    console.log("ERROR: No config file")
    console.log("execute: cp config.json.example config.json")
}
