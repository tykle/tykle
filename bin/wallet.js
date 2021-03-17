const sc = require('subcommander');
const fs = require('fs');

var defaultWalletDir;
try {
    defaultWalletDir = fs.realpathSync(`${process.env.HOME}`);
} catch(e) {
    console.log(e)
}
if(!defaultWalletDir) defaultWalletDir = "/root/.tykle";
else defaultWalletDir += "/.tykle";

// create wallet directory
try {
    const st = fs.statSync(defaultWalletDir);
} catch(e) {
    try {
        fs.mkdirSync(defaultWalletDir);
    } catch(e) {
        console.log(e)
        process.exit(-1);
    }
}

const wallet = sc.command('wallet', {
    desc: 'Tykle Wallet'
}).option('dataDir', {
    abbr: 'd',
    desc: 'Specify data directory',
    default: defaultWalletDir
});

wallet.command('list', {
    desc: 'List all chests in the wallet',
    callback: function (options) {
        console.log(options)
        // const platform = require("../platform/nodejs")

        // const device = new platform()
        // device.bootFromFile(options, (memory, finished) => {

        //     const Tykle = memory.lib.protobuf.Tykle;

        //     memory.kernel.start()
        //     finished()
        // })
    }
});

wallet.command('create', {
    desc: 'Create a chest in the wallet',
    callback: function (options) {
    }
});

wallet.command('delete', {
    desc: 'Delete a chest from the wallet',
    callback: function (options) {
    }
});

wallet.command('extract', {
    desc: 'Extract a chest from the wallet to a new one',
    callback: function (options) {
    }
});

wallet.command('insert', {
    desc: 'Insert a chest from another wallet',
    callback: function (options) {
    }
});
