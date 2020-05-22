const fs = require('fs');
const commandInfo = fs.readFileSync('./data/help.md', 'utf8');
const ctaInfo = fs.readFileSync('./data/ctaHelp.md', 'utf8');
const emoji = require('./data/emoji.json');
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
                console.log('error: ', error, response);
                reject(error);
            }
        })
    });
}

function ctaRequest(message, args) {
    return new Promise((resolve, reject) => {
        let ctaTime;

        if (!args[0]) {
            reject(`Не указан тип активности, ${config.eventTypes.join(', ')}`);
        }

        let type = args[0].match(/(\+?)([a-z]+)(\+?)/);
        if (!config.eventTypes.includes(type[2])) {
            reject(`Не верно указан тип активности, ${args[0]}`);
        }
        let isMandatory = type[1] || type[3] ? 1 : 0;

        let params = message.content.trim().split(/\n/g);
        // Скидываем первый аргумент, команду !ao.cta
        params.shift();
        if (!params[0]) {
            reject('Не указано название КТА активности');
        }

        if (params[1] && params[1].match('/\d+:\d+\s[\d\.]+/')) {
            let ctaTimeArgs = params[1].trim().split(/ +/g);
            let time = validateTime(ctaTimeArgs[0]);
            if (!time) {
                reject(`Неправильно указано время начала активности: ${ctaTimeArgs[0]}`);
            }
            let date = validateDate(ctaTimeArgs[1]);
            if (!date) {
                reject(`Неправильно указана дата начала активности: ${ctaTimeArgs[1]}`);
            }
            console.log(`${date} ${time}`);
            ctaTime = new Date(`${date} ${time}`);
            if (isNaN(ctaTime.getTime())) {
                reject(`Неправильный формат даты: ${date} ${time}`);
            }
        }
        ctaTime = ctaTime ? ctaTime.getTime() / 1000 : 0;
        resolve(
            {
                'messageId': message.id,
                'userId': message.author.id,
                'name': params[0],
                'type': args[0],
                'time': ctaTime,
                'isMandatory': isMandatory,
                'factor': 1
            }
        );
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
        .setDescription(`${description}\n\n${ctaInfo}`);
    // Send the embed to the same channel as the message
    message.author.send(embed);
}

function notifyAuthor(author, title, description) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(title)
        // Set the color of the embed
        .setColor(0xff0000)
        // Set the main content of the embed
        .setDescription(description);
    author.send(embed);
}

function notifyAdmin(guild, title, description, moderateAuthLink) {
    const embed = new Discord.MessageEmbed()
        // Set the title of the field
        .setTitle(title)
        // Set the color of the embed
        .setColor(0xff0000);
    config.admins.map(adminId => {
        guild.members.fetch(adminId)
            .then(guildMember => {
                let hashLoginData = '';
                if (moderateAuthLink) {
                    hashLoginData = `\n---\n[Вход без пароля](${baseApiUrl}${moderateAuthLink}/${guildMember.user.id})\n` +
                        `Ссылка актуальна в течение часа`
                }
                embed.setDescription(description + hashLoginData);

                guildMember.user.send(embed);
            })
            .catch(error => console.log(error));
    });
}

function getRoleByReaction(reaction) {
    switch (reaction.emoji.name) {
        case emoji.rl:
            return 'rl';
        case emoji.tank:
            return 'tank';
        case emoji.heal:
            return 'heal';
        case emoji.dd:
            return 'dd';
        case emoji.support:
            return 'support';
    }

    return '';
}

function notifyError(user, guild, error) {
    console.log('Error: ', error);
    let title = 'Ошибка регистрации на  активность';
    let info = 'Ветеранская диверсия, сервис недоступен';
    notifyAuthor(user, title, info);
    notifyAdmin(guild, title, error);
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
                notifyAuthor(
                    message.author,
                    'Поздравляем!',
                    `${apiResponse.result.message}\nЗаявка будет рассмотрена в течение 10 минут`);
                notifyAdmin(message.guild,
                    'Новая регистрация в ocean-albion.ru',
                    `[Подтвердить регистрацию](${baseApiUrl}${apiResponse.result.moderateLink})\n${adminMessage}`,
                    apiResponse.result.moderateAuthLink
                );
            } else {
                notifyAuthor(message.author, 'Ошибка регистрации', apiResponse.result);
                notifyAdmin(message.guild, 'Ошибка регистрации', `${apiResponse.result}\n${adminMessage}`);
            }
        },
        error => {
            notifyError(message.author, message.guild, error);
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
                    message.author,
                    'Доступ получен',
                    `[ocean-albion.ru](https://ocean-albion.ru)\nЛогин: ${args[0]}\nПароль: ${apiResponse.result.password}`
                );
                notifyAdmin(message.guild, 'Сброс пароля', adminMessage);
            } else {
                notifyAuthor(message.author, 'Ошибка получения доступа', apiResponse.result);
                notifyAdmin(message.guild, 'Ошибка получения пароля', `${apiResponse.result}\n${adminMessage}`);
            }
        },
        error => {
            notifyError(message.author, message.guild, error);
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
    notifyAuthor(message.author, 'Команда updateDb', 'Доступна только администраторам');
}
module.exports.updateDb = updateDb;

/**
 * Register guild CTA activity
 * @param message
 * @param args
 */
let cta = function cta(message, args) {
    ctaRequest(message, args)
        .then(
            (params) => {
                let adminMessage = `Пользователь ${message.author.username}`;
                apiRequest('post', '/api/albion/discordEditEvent', params).then(
                    apiResponse => {
                        if (apiResponse.status) {
                            notifyAuthor(message.author, 'Поздравляем!', `${apiResponse.result}`);
                            notifyAdmin(message.guild, 'Новая активность', `${adminMessage}\n${apiResponse.result}`);

                            // Временно без РЛ
                            ///message.react(emoji.rl);
                            message.react(emoji.tank);
                            message.react(emoji.heal);
                            message.react(emoji.dd);
                            message.react(emoji.support);
                        } else {
                            notifyAuthor(message.author, 'Ошибка регистрации активности', apiResponse.result);
                            notifyAdmin(message.guild, 'Ошибка регистрации активности', `${adminMessage}\n${apiResponse.result}`);
                        }
                    },
                    error => {
                        notifyError(message.author, message.guild, error);
                    }
                );
            },
            (text) => {
                sendCtaFormatMessage(message, text);
            });

}
module.exports.cta = cta;

/**
 * Delete guild CTA activity
 * @param message
 * @param args
 */
let deleteCta = function deleteCta(message) {
    console.log('messageId: ' + message.id);
    console.log(`Api.deleteEvent(${message.id}, ${message.author.id});`);

    let params = {
        'messageId': message.id,
        'userId': message.author.id,
    };
    apiRequest('post', '/api/albion/discordDeleteEvent', params).then(
        apiResponse => {
            if (apiResponse.status) {
                notifyAuthor(
                    message.author,
                    'Поздравляем!',
                    `${apiResponse.result}`);
                notifyAdmin(
                    message.guild,
                    'Удаление сообщения КТА активности',
                    `${message.author.username}\n${apiResponse.result}`,
                );
            } else {
                notifyAuthor(message.author, 'Ошибка удаления КТА активности', apiResponse.result);
                notifyAdmin(
                    message.guild,
                    'Ошибка удаления КТА активности',
                    `${message.author.username}\n${apiResponse.result}`
                );
            }
        },
        error => {
            notifyError(message.author, message.guild, error);
        }
    );
}
module.exports.deleteCta = deleteCta;

/**
 * Добавления пользователя к активности
 * @param reaction
 * @param user
 */
let joinMember = function joinMember(reaction, user) {
    let role = getRoleByReaction(reaction);
    let params = {
        'messageId': reaction.message.id,
        'userId': user.id,
        'role': role,
    };
    console.log(`Api.discordJoinEvent(${reaction.message.id}, ${user.id}, ${role});`);
    apiRequest('get', '/api/albion/discordJoinEvent', params).then(
        apiResponse => {
            if (apiResponse.status) {
                notifyAuthor(user, 'Поздравляем!', `${apiResponse.result}`);
                notifyAdmin(
                    reaction.message.channel.guild,
                    'Регистрация на активность',
                    `Пользователь ${user.username}\n${apiResponse.result}`
                );
            } else {
                reaction.users.remove(user.id);
                notifyAuthor(user, 'Ошибка регистрации на активность', apiResponse.result);
                notifyAdmin(
                    reaction.message.channel.guild,
                    'Ошибка регистрации на активность',
                    `Пользователь ${user.username}\n${apiResponse.result}`
                );
            }
        },
        error => {
            reaction.users.remove(user.id);
            notifyError(user, reaction.guild, error);
        }
    );
}
module.exports.joinMember = joinMember;

/**
 * Исключение пользователя из списка участников активности
 * @param reaction
 * @param user
 */
let leaveMember = function leaveMember(reaction, user) {
    let role = getRoleByReaction(reaction);
    let params = {
        'messageId': reaction.message.id,
        'userId': user.id,
        'role': role,
    };
    console.log(`Api.discordLeaveEvent(${reaction.message.id}, ${user.id}, ${role});`);
    apiRequest('get', '/api/albion/discordLeaveEvent', params).then(
        apiResponse => {
            if (apiResponse.status) {
                notifyAuthor(user, 'Поздравляем!', `${apiResponse.result}`);
            } else {
                //notifyAuthor(user, 'Ошибка выхода из списка участников активности', apiResponse.result);
                notifyAdmin(
                    reaction.message.channel.guild,
                    'Ошибка выхода из списка участников активности',
                    `Пользователь ${user.username}\n${apiResponse.result}`
                );
            }
        },
        error => {
            notifyError(user, reaction.guild, error);
        }
    );
}
module.exports.leaveMember = leaveMember;
