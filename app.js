const api = require("./libs/api");

const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const config = require('./config.json');
const USERNAME = config.user;  // Username del router
const PASSWORD = config.password;  // Password del router
BOT_TOKEN = config.botToken;

const main = async () => {
    console.log("Starting 🌐 Vodafone Station Bot 1.0 📡");

    const bot = new Telegraf(BOT_TOKEN);
    bot.start((ctx) => {
        ctx.reply('🌐 Vodafone Station Bot 1.0 📡');
        ctx.reply('Availables commands:\n- /info\n- /routerInfo\n- /fiberRestart \n- /routerRestart');
    })

    bot.command('info', (ctx) => {
        ctx.reply('Availables commands:\n- /info\n- /routerInfo\n- /fiberRestart \n- /routerRestart');
    });

    bot.command('fiberRestart', async (ctx) => {
        try {
            ctx.reply('🌐 Fiber restarting..')
            console.log("Request fiberRestart. Trying to login..");
            await api.login(USERNAME, PASSWORD);
            console.log("Request fiberRestart. Trying to fiberRestart..");
            await api.restartConnection("fiber",USERNAME,PASSWORD);
            ctx.reply('🌐 Fiber restarted.');
        } catch (e) {
            console.log("Restarting fiber");
            let restarted = false;
            while (!restarted) {
                try {
                    api.login(USERNAME, PASSWORD);
                    api.getUserData();
                    restarted = true;
                } catch (e) {

                }

                console.log("Waiting 2sec and retry..");
                await sleep(2000);
            }
            ctx.reply('🌐 Fiber restarted.');
        }
    });

    bot.command('routerRestart', (ctx) => {
        try {
            ctx.reply('📡 Router restarting..')
        } catch (e) {
            console.log("Restarting router");
        }
    });

    bot.command('routerInfo', async (ctx) => {
        try {
            await api.logout();
            console.log("Request routerInfo. Trying to login..");
            await api.login(USERNAME, PASSWORD);
            console.log("Request routerInfo. Trying to getDeviceData..");
            const overview = await api.getDeviceData();
            ctx.reply('🖥️ Router Info:')
            const downStr = overview.find(item => item['down_str'] !== undefined);
            const upStr = overview.find(item => item['up_str'] !== undefined);
            ctx.reply('\n-downStream:' + downStr['down_str'] + '\n-upStream:' + upStr['up_str']);
            api.logout();
        } catch (e) {
            console.log(e);
            ctx.reply("⚠️ Error on request⚠️ ➡️ " + e.message);
        }

    });

    bot.launch()
    console.log("Launched 🌐 Vodafone Station Bot 1.0 📡");

}





main();