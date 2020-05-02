const config = require('./config.json');
const Discord = require('discord.js');
const request = require('request');

/**
 * Auth discord user at ocean-albion.ru
 * @param message
 * @param args
 */
let auth = function auth(message, args = []) {
    /*request({
        uri: 'https://gameinfo.albiononline.com/api/gameinfo/events?limit=' + limit + '&offset=' + offset,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            parseKills(body);
        } else {
            console.log('Error: ', error); // Log the error
        }
    });*/
}

/**
 * Auth discord user at ocean-albion.ru
 * @param message
 * @param args
 */
let register = function register(message, args = []) {
    /*
    console.log(message.channel.guild.members);
    console.log(message.channel.guild.roles.find());
    console.log(message.channel.guild.roles);
    console.log(message.member);
    console.log(args);
    */
    request.post({
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
        },
        url: 'https://ocean-albion.ru/api/albion/discordRegister',
        body: JSON.stringify({
            'discordId': message.author.id,
            'discordName': message.author.username,
            'albionName': args[0]
        })
    }, function (error, response, body) {
        let adminMessage = `Пользователь ${message.author.username}, регистрационный ник ${args[0]}`;
        if (!error && response.statusCode === 200) {
            const apiResponse = JSON.parse(body);
            console.log(apiResponse);
            if (apiResponse.status) {
                notifyRegUser(message, 'Поздравляем!', apiResponse.result);
                notifyRegAdmin(message, 'Новая регистрация в ocean-albion.ru', adminMessage);
            } else {
                notifyRegUser(message, 'Ошибка регистрации', apiResponse.result);
                notifyRegAdmin(message, 'Ошибка регистрации', `${apiResponse.result}\n${adminMessage}`);
            }
        } else {
            console.log('Error: ', error);
            let title = 'Ошибка регистрации';
            let info = 'Ветеранская диверсия, сервис недоступен';
            notifyRegUser(message, title, info);
            notifyRegAdmin(message, title, error);
        }
    });
}

/**
 * Register guild CTA activity
 * @param message
 * @param args
 */
let cta = function cta(message, args = []) {
    console.log('author: ' + message.author.id + ' ' + message.author.username);
    console.log('messageId: ' + message.id);
    let ctaTime;

    if (!args[0]) {
        sendCtaFormatMessage(message);
        return;
    }
    if (!args[0]) {
        sendCtaFormatMessage(message, 'Не указано название КТА активности');
        return;
    }
    if (args[1]) {
        let ctaTimeArgs = args[1].trim().split(/ +/g);
        let time = validateTime(ctaTimeArgs[0]);
        if (!time) {
            sendCtaFormatMessage(message, `Неправильно указано время начала активности: ${ctaTimeArgs[0]}`);
            return;
        }
        let date = validateDate(ctaTimeArgs[1]);
        if (!date) {
            sendCtaFormatMessage(message, `Неправильно указана дата начала активности: ${ctaTimeArgs[1]}`);
            return;
        }

        console.log(`${date} ${time}`);
        ctaTime = new Date(`${date} ${time}`);
        if (isNaN(ctaTime.getTime())) {
            sendCtaFormatMessage(message, `Неправильный формат даты: ${date} ${time}`);
            return;
        }
    }

    console.log(`Api.registerEvent(${message.author.username}, ${args[0]}, ${ctaTime.getTime()});`);
    // Api.registerEvent(message.author.username, args[0], ctaTime.getTime());
    message.react('🆗');
}

let clear = function clear(message) {
    if (config.admins.includes(message.author.id) && message.channel.id === config.botChannel) {
        message.channel.send('Clearing Killboard').then(msg => {
            msg.channel.messages.fetch().then(messages => {
                message.channel.bulkDelete(messages);
                console.log("[ADMIN] " + message.author.username + " cleared Killboard");
            })
        })
    }
}

function validateTime(time) {
    const timeReg = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
    let timeRes = time.match(timeReg);
    if (!timeRes) {
        return false;
    }

    return `${time}:00`;
}

function validateDate(date) {
    if (!date) {
        return new Date().toISOString().slice(0, 10);
    }

    const dateReg = /^(\d+)\.(\d+)\.?(\d*)$/
    let dateRes = date.match(dateReg);
    if (!dateRes) {
        return false;
    }

    return [
        (dateRes[3] ? dateRes[3] : (new Date()).getFullYear()),
        dateRes[2],
        dateRes[1]
    ].join('-');
}

function sendCtaFormatMessage(message, description) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle('Ошибка регистрации КТА')
        // Set the color of the embed
        .setColor(0xff0000)
        // Set the main content of the embed
        .setDescription(description)
        .addField('Формат сообщения', 'Команда - **!cta**\n' +
            'Название КТА - **Произвольная строка**\n' +
            'Время, дата (не обяз.) - **чч:мм дд.мм.гггг**')
        .addField('Пример', '**!cta**\n' +
            '**КТА, реклайм 31.12**\n' +
            '**21:00 31.12.2019**')
        .addField('или', '**!cta**\n' +
            '**КТА, защита клайма 31.12**\n' +
            '**21:00**')
        .addField('или', '**!cta**\n' +
            '**КТА, защита клайма 31.12**');
    // Send the embed to the same channel as the message
    message.author.send(embed);
}

function notifyRegUser(message, title, description) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(title)
        // Set the color of the embed
        .setColor(0xff0000)
        // Set the main content of the embed
        .setDescription(description);
    message.author.send(embed);
}

function notifyRegAdmin(message, title, description) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(title)
        // Set the color of the embed
        .setColor(0xff0000)
        // Set the main content of the embed
        .setDescription(description);
    config.admins.map(adminId => {
        message.guild.members.fetch(adminId)
            .then(guildMember => {
                console.log(guildMember.user);
                guildMember.user.send(embed);
            })
            .catch(error => console.log(error));
    });
}

module.exports.auth = auth;
module.exports.cta = cta;
module.exports.clear = clear;
module.exports.register = register;
