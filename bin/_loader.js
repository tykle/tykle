const fs = require('fs');


/* * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Wallet directory
 * * * * * * * * * * * * * * * * * * * * * * * * */
// select default directory
var defaultWalletDir;
try {
    defaultWalletDir = fs.realpathSync(`${process.env.HOME}`);
} catch (e) {
    console.log(e)
}
if (!defaultWalletDir) defaultWalletDir = "/root/.tykle";
else defaultWalletDir += "/.tykle";

// create wallet directory
try {
    fs.statSync(defaultWalletDir);
} catch (e) {
    try {
        fs.mkdirSync(defaultWalletDir);
        fs.mkdirSync(defaultWalletDir + "/data");
    } catch (e) {
        console.log(e)
        process.exit(-1);
    }
}


module.exports = {
    defaultWalletDir
}