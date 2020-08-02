module.exports = class OceanBot {
    constructor(config, emoji, ctaDescription, discord, request) {
        this.config = config;
        this.emoji = emoji;
        this.discord = discord;
        this.request = request;
        this.baseApiUrl = 'https://albion.gudilap.ru';

        this.ctaDescription = Object.entries(this.emoji).reduce((description, [key, value]) => {
            return description.replace(`{${key}}`, value);
        }, ctaDescription);
    }

    apiRequest(method, apiUrl, query) {
        return new Promise((resolve, reject) => {
            let headers = {
                'accept': 'application/json'
            };
            let body = '';
            let url = this.baseApiUrl + apiUrl;
            if (method === 'post') {
                headers['content-type'] = 'application/json';
                body = JSON.stringify(query);
            } else {
                url += query ? '?' + Object.entries(query).map((param) => param.join('=')).join('&') : '';
            }
            this.request({
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

    ctaRequest(message, args) {
        return new Promise((resolve, reject) => {
            let ctaTime;

            if (!args[0]) {
                reject(`Не указан тип активности, ${this.config.eventTypes.join(', ')}`);
            }

            let type = args[0].match(/(\+?)([a-z]+)(\+?)/);
            if (!this.config.eventTypes.includes(type[2])) {
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
                let time = this.validateTime(ctaTimeArgs[0]);
                if (!time) {
                    reject(`Неправильно указано время начала активности: ${ctaTimeArgs[0]}`);
                }
                let date = this.validateDate(ctaTimeArgs[1]);
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

    validateTime(time) {
        const timeReg = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
        let timeRes = time.match(timeReg);
        if (!timeRes) {
            return false;
        }

        return `${time}:00`;
    }

    validateDate(date) {
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

    sendCtaFormatMessage(message, description, ctaInfo) {
        const embed = new this.discord.MessageEmbed()
            // Set the title of the field
            .setTitle('Ошибка регистрации КТА')
            // Set the color of the embed
            .setColor(0xff0000)
            // Set the main content of the embed
            .setDescription(`${description}\n\n${ctaInfo}`);
        // Send the embed to the same channel as the message
        message.author.send(embed);
    }

    notifyAuthor(author, title, description) {
        const embed = new this.discord.MessageEmbed()
            // Set the title of the field
            .setTitle(title)
            // Set the color of the embed
            .setColor(0xff0000)
            // Set the main content of the embed
            .setDescription(description);
        author.send(embed);
    }

    notifyAdmin(guild, title, description, moderateAuthLink) {
        const embed = new this.discord.MessageEmbed()
            // Set the title of the field
            .setTitle(title)
            // Set the color of the embed
            .setColor(0xff0000);
        this.config.admins.map(adminId => {
            guild.members.fetch(adminId)
                .then(guildMember => {
                    let hashLoginData = '';
                    if (moderateAuthLink) {
                        hashLoginData = `\n---\n[Вход без пароля](${this.baseApiUrl}${moderateAuthLink}/${guildMember.user.id})\n` +
                            `Ссылка актуальна в течение часа`
                    }
                    embed.setDescription(description + hashLoginData);

                    guildMember.user.send(embed);
                })
                .catch(error => console.log(error));
        });
    }

    getRoleByReaction(reaction) {
        switch (reaction.emoji.name) {
            case this.emoji.rl:
                return 'rl';
            case this.emoji.tank:
                return 'tank';
            case this.emoji.heal:
                return 'heal';
            case this.emoji.dd:
                return 'dd';
            case this.emoji.support:
                return 'support';
        }

        return '';
    }

    notifyError(user, guild, error) {
        console.log('Error: ', error);
        let title = 'Ошибка регистрации на  активность';
        let info = 'Ветеранская диверсия, сервис недоступен';
        this.notifyAuthor(user, title, info);
        this.notifyAdmin(guild, title, error);
    }

    /**
     * Send Bot help message
     * @param message
     * @param commandInfo
     */
    help(message, commandInfo) {
        const embed = new this.discord.MessageEmbed()
            // Set the title of the field
            .setTitle('Добрая дорога!')
            // Set the color of the embed
            .setColor(0xff0000)
            // Set the main content of the embed
            .setDescription(commandInfo);

        message.author.send(embed);
    }

    /**
     * Register discord user at albion.gudilap.ru
     * @param message
     * @param args
     */
    register(message, args = []) {
        let adminMessage = `Пользователь ${message.author.username}, регистрационный ник ${args[0]}`;
        let params = {
            'discordId': message.author.id,
            'discordName': message.author.username,
            'albionName': args[0]
        };
        this.apiRequest('post', '/api/albion/discordRegister', params).then(
            apiResponse => {
                if (apiResponse.status) {
                    this.notifyAuthor(
                        message.author,
                        'Поздравляем!',
                        `${apiResponse.result.message}\nЗаявка будет рассмотрена в течение 10 минут`);
                    this.notifyAdmin(message.guild,
                        'Новая регистрация в albion.gudilap.ru',
                        `[Подтвердить регистрацию](${this.baseApiUrl}${apiResponse.result.moderateLink})\n${adminMessage}`,
                        apiResponse.result.moderateAuthLink
                    );
                } else {
                    this.notifyAuthor(message.author, 'Ошибка регистрации', apiResponse.result);
                    this.notifyAdmin(message.guild, 'Ошибка регистрации', `${apiResponse.result}\n${adminMessage}`);
                }
            },
            error => {
                this.notifyError(message.author, message.guild, error);
            }
        );
    }

    /**
     * Get new password for albion.gudilap.ru
     *
     * @param message
     * @param args
     * @param withPass
     */
    password(message, args = [], withPass = 0) {
        let adminMessage = `Пользователь ${message.author.username}, ник ${args[0]}`;
        let params = {
            'id': message.author.id,
            'albionName': args[0]
        };
        this.apiRequest('get', '/api/albion/resetPasswordDiscord', params).then(
            apiResponse => {
                if (apiResponse.status) {
                    this.notifyAuthor(
                        message.author,
                        'Доступ получен',
                        `[albion.gudilap.ru](https://albion.gudilap.ru)\n` +
                        `Логин: ${args[0]}\n` +
                        (withPass ? `Пароль: ${apiResponse.result.password}\n\n` : `\n`) +
                        `[Доступ без пароля](${apiResponse.result.instantLoginUrl})\n` +
                        `*Ссылка действительна 5 минут*`
                    );
                    this.notifyAdmin(message.guild, 'Доступ предоставлен', adminMessage);
                } else {
                    this.notifyAuthor(message.author, 'Ошибка получения доступа', apiResponse.result);
                    this.notifyAdmin(message.guild, 'Ошибка предоставления доступа', `${apiResponse.result}\n${adminMessage}`);
                }
            },
            error => {
                this.notifyError(message.author, message.guild, error);
            }
        );
    }

    /**
     * Update discord nicknames at albion.gudilap.ru
     * @param message
     * @param args
     */
    updateDb(message, args = []) {
        this.notifyAuthor(message.author, 'Команда updateDb', 'Доступна только администраторам');
    }

    /**
     * Register guild CTA activity
     * @param message
     * @param args
     * @param ctaInfo
     */
    cta(message, args, ctaInfo) {
        this.ctaRequest(message, args)
            .then(
                (params) => {
                    let adminMessage = `Пользователь ${message.author.username}`;
                    this.apiRequest('post', '/api/albion/discordEditEvent', params).then(
                        apiResponse => {
                            if (apiResponse.status) {
                                this.notifyAuthor(message.author, 'Поздравляем!', `${apiResponse.result}`);
                                this.notifyAdmin(message.guild, 'Новая активность', `${adminMessage}\n${apiResponse.result}`);

                                // Временно без РЛ
                                ///message.react(this.emoji.rl);
                                message.react(this.emoji.tank);
                                message.react(this.emoji.heal);
                                message.react(this.emoji.dd);
                                message.react(this.emoji.support);

                                message.reply(this.ctaDescription)
                                    .then(() => console.log(`Sent a reply to ${message.author.username}`))
                                    .catch(console.error);
                            } else {
                                this.notifyAuthor(message.author, 'Ошибка регистрации активности', apiResponse.result);
                                this.notifyAdmin(message.guild, 'Ошибка регистрации активности', `${adminMessage}\n${apiResponse.result}`);
                            }
                        },
                        error => {
                            this.notifyError(message.author, message.guild, error);
                        }
                    );
                },
                (text) => {
                    this.sendCtaFormatMessage(message, text, ctaInfo);
                });

    }

    /**
     * Delete guild CTA activity
     * @param message
     * @param args
     */
    deleteCta(message) {
        console.log('messageId: ' + message.id);
        console.log(`Api.deleteEvent(${message.id}, ${message.author.id});`);

        let params = {
            'messageId': message.id,
            'userId': message.author.id,
        };
        this.apiRequest('post', '/api/albion/discordDeleteEvent', params).then(
            apiResponse => {
                if (apiResponse.status) {
                    this.notifyAuthor(
                        message.author,
                        'Поздравляем!',
                        `${apiResponse.result}`);
                    this.notifyAdmin(
                        message.guild,
                        'Удаление сообщения КТА активности',
                        `${message.author.username}\n${apiResponse.result}`,
                    );
                } else {
                    this.notifyAuthor(message.author, 'Ошибка удаления КТА активности', apiResponse.result);
                    this.notifyAdmin(
                        message.guild,
                        'Ошибка удаления КТА активности',
                        `${message.author.username}\n${apiResponse.result}`
                    );
                }
            },
            error => {
                this.notifyError(message.author, message.guild, error);
            }
        );
    }

    /**
     * Добавления пользователя к активности
     * @param reaction
     * @param user
     */
    joinMember(reaction, user) {
        let role = this.getRoleByReaction(reaction);
        let params = {
            'messageId': reaction.message.id,
            'userId': user.id,
            'role': role,
        };
        console.log(`Api.discordJoinEvent(${reaction.message.id}, ${user.id}, ${role});`);
        this.apiRequest('get', '/api/albion/discordJoinEvent', params).then(
            apiResponse => {
                if (apiResponse.status) {
                    this.notifyAuthor(user, 'Поздравляем!', `${apiResponse.result}`);
                    this.notifyAdmin(
                        reaction.message.channel.guild,
                        'Регистрация на активность',
                        `Пользователь ${user.username}\n${apiResponse.result}`
                    );
                } else {
                    reaction.users.remove(user.id);
                    this.notifyAuthor(
                        user,
                        'Ошибка регистрации на активность' + (apiResponse.errorCode === 11 ? '\n!ao.register ИгровойНик' : ''),
                        apiResponse.result
                    );
                    this.notifyAdmin(
                        reaction.message.channel.guild,
                        'Ошибка регистрации на активность',
                        `Пользователь ${user.username}\n${apiResponse.result}`
                    );
                }
            },
            error => {
                reaction.users.remove(user.id);
                this.notifyError(user, reaction.guild, error);
            }
        );
    }

    /**
     * Исключение пользователя из списка участников активности
     * @param reaction
     * @param user
     */
    leaveMember(reaction, user) {
        let role = this.getRoleByReaction(reaction);
        let params = {
            'messageId': reaction.message.id,
            'userId': user.id,
            'role': role,
        };
        console.log(`Api.discordLeaveEvent(${reaction.message.id}, ${user.id}, ${role});`);
        this.apiRequest('get', '/api/albion/discordLeaveEvent', params).then(
            apiResponse => {
                if (apiResponse.status) {
                    this.notifyAuthor(user, 'Поздравляем!', `${apiResponse.result}`);
                } else {
                    //this.notifyAuthor(user, 'Ошибка выхода из списка участников активности', apiResponse.result);
                    this.notifyAdmin(
                        reaction.message.channel.guild,
                        'Ошибка выхода из списка участников активности',
                        `Пользователь ${user.username}\n${apiResponse.result}`
                    );
                }
            },
            error => {
                this.notifyError(user, reaction.guild, error);
            }
        );
    }
}
