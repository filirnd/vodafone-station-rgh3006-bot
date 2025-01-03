process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const sha = require("./sha");
const axios = require('axios');
const CookieJar = require('tough-cookie').CookieJar;
const HttpCookieAgent = require('http-cookie-agent/http').HttpCookieAgent
const HttpsCookieAgent = require('http-cookie-agent/http').HttpsCookieAgent

const ROUTER_URL = "192.168.1.1";
const HEADERS = {
    "User-Agent": ("Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0"),
    "Accept-Language": "en-GB,en;q=0.5",
    "X-Requested-With": "XMLHttpRequest",
}
const jar = new CookieJar();
const client = axios.create({
    httpAgent: new HttpCookieAgent({ cookies: { jar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
});

const LOGIN = [
    "not logged",
    "logged",
    "already logged",
    "credential error",
    "credential error",
    "password mismatch",
    "incorrect challenge",
    "password mismatch",
]

USER_ALREADY_LOGGED_IN = "MSG_LOGIN_150"

FULL_FIELDS_NUM = 8


let csrf_token = 'HK5A6050D9JW5F7CBA8F';
let encryption_key = "";
let headers = HEADERS;


// UTILS
exports.getUserData = (key, list) => {
    for (const elem of list) {
        if (key in elem) {
            return elem[key];
        }
    }
    return null;
}

const getPageResult = async (resource) => {
    const ts = new Date().getTime();
    let url = "https://" + ROUTER_URL + resource + "?_=" + ts + "&csrf_token=" + csrf_token;
    console.log("GET resource ", url);
    return await client.get(url, {
        headers: headers,
        timeout: 10000,
        maxRedirects: 0
    })
}
const postPageResult = async (resource, payload, timeout = 10000) => {
    const ts = new Date().getTime();
    let url = "https://" + ROUTER_URL + resource + "?_=" + ts + "&csrf_token=" + csrf_token;
    return await client.post(
        url,
        payload,
        {
            headers: headers,
            timeout: timeout
        })
}

const getSercommPage = async (resource) => {
    const result = await getPageResult(resource);
    return result.data;
}
const postSercommPage = async (resource, payload, timeout = 10000) => {
    const result = await postPageResult(resource, payload, timeout);
    return result.data;
}

const getCSFRToken = async (htmlPage) => {
    // Regex per trovare il valore di csrf_token
    const csrfRegex = /var csrf_token = '(.*?)';/;

    // Eseguire la regex sull'HTML
    const match = htmlPage.match(csrfRegex);

    if (match && match[1]) {
        console.log('CSRF Token:', match[1]);
        csrf_token = match[1]; // Output: HK1470FA4FJW780264EA
        return csrf_token;
    } else {
        console.error('CSRF Token non trovato!');
        return;
    }

}

const setCookie = async () => {
    jar.setCookie("login_uid=1", "https://" + ROUTER_URL);
}


// API
const findLoginUrl = async () => {
    const url = "https://" + ROUTER_URL + "/login.html";
    console.log("Requiring ", url);
    const result = await client.get(
        url,
        {
            headers: headers,
            timeout: 10000
        }
    )

    if (result.status === 200) {
        return result.data;
    } else {
        console.log("Status not 200 ".result.status);
    }
}

const checkLoggedIn = async () => {
    const result = await postSercommPage(
        "/data/login.json",
        { "loginUserChkLoginTimeout": USERNAME }
    )
    const index = result ? parseInt(String(result), 10000) : 0;
    console.log("Login status: ", LOGIN[index], reply);
    return index;
}

const getUserLang = async () => {
    let result = await getSercommPage("/data/user_lang.json");
    encryption_key = this.getUserData("encryption_key", result);
}

const reset = async () => {
    let payload = { "chk_sys_busy": "" }
    reply = await postPageResult("/data/reset.json", payload);
    if (reply.status === 200)
        return true;
    return false;
}

const loginJson = async (payload) => {
    let reply_json = await postSercommPage("/data/login.json", payload);

    if (reply_json === "1")
        return true;

    console.log("Login false,", reply_json);
    return false;
}

exports.login = async (username, password) => {
    let html_page = await findLoginUrl();
    await getCSFRToken(html_page);
    await getUserLang();
    await setCookie();
    await reset();



    // encrypt username
    const hash1_username = sha.hex_hmac_sha256('$1$SERCOMM$', unescape(encodeURIComponent(username)));
    const user_name = sha.hex_hmac_sha256(encryption_key, hash1_username);

    // encrypt password
    const hash1_pass = sha.hex_hmac_sha256('$1$SERCOMM$', unescape(encodeURIComponent(password)));
    const user_password = sha.hex_hmac_sha256(encryption_key, hash1_pass);

    let loginBody = "LoginName=" + user_name + "&LoginPWD=" + user_password;
    let loginResult = await loginJson(loginBody);

    if (loginResult) {
        console.log("Logged in.");
        return true;
    }
    return false;
}


exports.getDeviceData = async () => {
    const overview = await getSercommPage("/data/overview.json");
    return overview;
}

exports.logout = async () => {
    try {
        await getSercommPage("/data/logout.json");
    } catch (e) {

    }
    await jar.removeAllCookies();
}

exports.restartConnection = async (connectionType,username,password) => {
    let payload = connectionType + "_reconnect=1";
    try {
        const restartResponse = await postSercommPage("/data/statussupportrestart.json", payload);
        console.log(restartResponse);
    } catch (e) {
        console.log("Restarting in progress..");
        let restarted = false;
        console.log("Waiting 4sec before check connection.");
        await sleep(4000);
        while (!restarted) {
            try {
                await this.login(username,password);
                console.log("restarted.");
                restarted = true;
            } catch (e) {
                console.log("Waiting 2sec and retry.."+e);
                await sleep(2000);
            }


        }
        console.log('Fiber restarted.');
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    
}