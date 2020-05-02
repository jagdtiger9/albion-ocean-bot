# Albion Ocean bot

A discord bot for Albion

### Usage

* !register UserName

### Prerequisites

* [NodeJS](https://nodejs.org/)

### Installing

* Install Node JS on the machine that will run the bot
* Execute 'npm install' in the directory to download the dependencies
* Create a new [Discord Application](https://discordapp.com/developers/applications/)
* Copy config.json.example --> config.json
* Add the 'APP BOT USER' token as 'token' in 'config.json'
* Enable developer mode in Discord (Settings -> Appearance)
* Right click the channel you wish to use as the kill board, and Copy ID
* Set ID as 'botChannel'
* OPTIONAL: Set User IDs for admin accounts

* **To add the bot to your server**: Visit [https://discordapp.com/oauth2/authorize?client_id={YOUR CLIENT ID}](https://discordapp.com/oauth2/authorize?client_id=#)
Example: [https://discordapp.com/api/oauth2/authorize?client_id=347919794504335362&permissions=2048&scope=bot](https://discordapp.com/oauth2/authorize?client_id=#)

##### Example: config.json

--

```json
{
    "cmdPrefix": "!",
    "guildName": "OCEAN",
    "username": "Albion bot",
    "admins": [
        "....."
    ],
    "botChannel": ".....",
    "playingGame": "Albion bot",
    "token": "....."
}

```

* [Discord.js](https://github.com/hydrabolt/discord.js/) - Discord app library for Node.js and browsers.
* [Request](https://github.com/request/request) - Simplified HTTP client
