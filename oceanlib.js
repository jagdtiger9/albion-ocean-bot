const fs = require('fs');
const commandInfo = fs.readFileSync('./help.md', 'utf8');
const config = require('./config.json');
const Discord = require('discord.js');
const request = require('request');

const baseApiUrl = 'https://ocean-albion.ru';

function apiRequest(method, apiUrl, query) {
    return new Promise((resolve, reject) => {
        let headers = {
            'accept': 'application/json'
        };
        let body = '';
        let url = baseApiUrl + apiUrl;
        if (method === 'post') {
            headers['content-type'] = 'application/json';
            body = JSON.stringify(query);
        } else {
            url += query ? '?' + Object.entries(query).map((param) => param.join('=')).join('&') : '';
        }
        request({
            method: method,
            headers: headers,
            url: url,
            body: body
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                const apiResponse = JSON.parse(body);
                console.log(apiResponse);
                resolve(apiResponse);
            } else {
                reject(error);
            }
        })
    });
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

function notifyAuthor(message, title, description) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(title)
        // Set the color of the embed
        .setColor(0xff0000)
        // Set the main content of the embed
        .setDescription(description);
    message.author.send(embed);
}

function notifyAdmin(message, title, description, moderateAuthLink) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(title)
        // Set the color of the embed
        .setColor(0xff0000);
    config.admins.map(adminId => {
        message.guild.members.fetch(adminId)
            .then(guildMember => {
                console.log(moderateAuthLink, guildMember.user);
                if (moderateAuthLink) {
                    description += `\n---\n[Вход без пароля](${baseApiUrl}${moderateAuthLink}/${guildMember.user.id})\n` +
                        `Ссылка актуальна в течение 10 минут`
                }
                embed.setDescription(description);

                guildMember.user.send(embed);
            })
            .catch(error => console.log(error));
    });
}

/**
 * Send Bot help message
 * @param message
 * @param args
 */
let help = function help(message) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle('Добрая дорога!')
        // Set the color of the embed
        .setColor(0xff0000)
        // Set the main content of the embed
        .setDescription(commandInfo);

    message.author.send(embed);
}
module.exports.help = help;

/**
 * Register discord user at ocean-albion.ru
 * @param message
 * @param args
 */
let register = function register(message, args = []) {
    let adminMessage = `Пользователь ${message.author.username}, регистрационный ник ${args[0]}`;
    let params = {
        'discordId': message.author.id,
        'discordName': message.author.username,
        'albionName': args[0]
    };
    apiRequest('post', '/api/albion/discordRegister', params).then(
        apiResponse => {
            if (apiResponse.status) {
                console.log(apiResponse);
                notifyAuthor(
                    message,
                    'Поздравляем!',
                    `${apiResponse.result.message}\nЗаявка будет рассмотрена в течение 10 минут`);
                notifyAdmin(message,
                    'Новая регистрация в ocean-albion.ru',
                    `[Подтвердить регистрацию](${baseApiUrl}${apiResponse.result.moderateLink})\n${adminMessage}`,
                    apiResponse.result.moderateAuthLink
                );
            } else {
                notifyAuthor(message, 'Ошибка регистрации', apiResponse.result);
                notifyAdmin(message, 'Ошибка регистрации', `${apiResponse.result}\n${adminMessage}`);
            }
        },
        error => {
            console.log('Error: ', error);
            let title = 'Ошибка регистрации';
            let info = 'Ветеранская диверсия, сервис недоступен';
            notifyAuthor(message, title, info);
            notifyAdmin(message, title, error);
        }
    );
}
module.exports.register = register;

/**
 * Get new password for ocean-albion.ru
 * @param message
 */
let password = function password(message, args = []) {
    let adminMessage = `Пользователь ${message.author.username}, ник ${args[0]}`;
    let params = {
        'id': message.author.id,
        'albionName': args[0]
    };
    apiRequest('get', '/api/albion/resetPasswordDiscord', params).then(
        apiResponse => {
            if (apiResponse.status) {
                notifyAuthor(
                    message,
                    'Доступ получен',
                    `[ocean-albion.ru](https://ocean-albion.ru)\nЛогин: ${args[0]}\nПароль: ${apiResponse.result.password}`
                );
                notifyAdmin(message, 'Сброс пароля', adminMessage);
            } else {
                notifyAuthor(message, 'Ошибка получения доступа', apiResponse.result);
                notifyAdmin(message, 'Ошибка получения пароля', `${apiResponse.result}\n${adminMessage}`);
            }
        },
        error => {
            console.log('Error: ', error);
            let title = 'Ошибка получения пароля';
            let info = 'Ветеранская диверсия, сервис недоступен';
            notifyAuthor(message, title, info);
            notifyAdmin(message, title, error);
        }
    );
}
module.exports.password = password;


/**
 * Update discord nicknames at ocean-albion.ru
 * @param message
 * @param args
 */
let updateDb = function updateDb(message, args = []) {
    notifyAuthor(message, 'Команда updateDb', 'Доступна только администраторам');
}
module.exports.updateDb = updateDb;

/**
 * Auth discord user at ocean-albion.ru
 * @param message
 * @param args
 */
let auth = function auth(message, args = []) {
    notifyAuthor(message, 'Команда auth', 'Возможно, она будет делать что-нибудь полезное');
    /*
    console.log(message.channel.guild.members);
    console.log(message.channel.guild.roles.find());
    console.log(message.channel.guild.roles);
    console.log(message.member);
    console.log(args);
    */
}
module.exports.auth = auth;

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
module.exports.cta = cta;

let clear = function clear(message) {
    if (config.admins.includes(message.author.id) && message.channel.id === config.botChannel.main) {
        message.channel.send('Clearing Killboard').then(msg => {
            msg.channel.messages.fetch().then(messages => {
                message.channel.bulkDelete(messages);
                console.log("[ADMIN] " + message.author.username + " cleared Killboard");
            })
        })
    }
}
module.exports.clear = clear;
