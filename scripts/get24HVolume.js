LONG_TERM_KEY_FILE = "long_term_key.txt"
JWT_FILE = "jwt.txt"

var request = require('request-promise');
var fs = require('fs');

const networkServices = require('../scripts/services/networkServices')

async function getNewJwt() {

    // read long term key
    longTermKey = fs.readFileSync(LONG_TERM_KEY_FILE, 'utf8');
    longTermKey = longTermKey.trim()

    // issue JWT
    url = 'https://auth.dfuse.io/v1/auth/issue'
    options = {
            url: url,
            method: 'POST',
            body : {
                'api_key' : longTermKey
            },
            json : true
    };
    res = await request(options);
    fs.writeFileSync(JWT_FILE, JSON.stringify(res));

    return res;
}

async function main() {

    // get JWT if exists
    issueNewJwt = false
    try {
        currentJwt = JSON.parse(fs.readFileSync(JWT_FILE, 'utf8'));
    } catch(err) {
        console.log("Jwt does not exist, attempting to issue a new one")
        issueNewJwt = true
    }

    // check if JWT expired
    if (!issueNewJwt) {
        expiration = currentJwt["expires_at"]
        currentTimeStamp = Math.floor(Date.now() / 1000)
        if (currentTimeStamp > expiration) {
            issueNewJwt = true
            console.log("JWT expired")
        } else {
            console.log("JWT did not expire yet")
        }
    }

    // issue new JWT if it expired
    if (issueNewJwt) {
        console.log("issuing new JWT")
        currentJwt = await getNewJwt();
    }

    // get past 24h volume
    jwtKey = currentJwt["token"]
    res = await networkServices.getLastDaysVolume({
        dfuseKey : jwtKey,
        networkContract : "yolonetworkx", 
        days : 1
    })
    console.log(res)

}
main()