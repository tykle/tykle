const fs = require('fs');
const net = require("net");

//
function setupTcpClient(options) {
    const memory = options.memory;
    const Network = memory.network;
    
    const client = net.createConnection({
        host: options.host,
        port: options.port
    }, async () => {
        // console.log(`New ${client.remoteFamily} connection to ${client.remoteAddress}:${client.remotePort}`);

        client.n2n = Network.n2nDecode(async (packet) => {
            if (options.onFrame) await options.onFrame(client, packet);
        }, (err) => {
            console.log(`Decoding error ${client.remoteAddress}:${client.remotePort}: ${err}`);
        })

        await options.onStart(client);
    });
    client.on('data', (data) => {
        return (new Promise(async (resolve, reject) => {
            await client.n2n.decode(data, resolve);
        }));
    });
    client.on('end', () => {
        // memory.device.info(`Disconnected from ${client.remoteAddress}:${client.remotePort}`);
    });
    client.on('error', (err) => {
        console.log(`Connection error ${client.remoteAddress}:${client.remotePort}: ${err}`);
    });
}

//
function ready(options, cb) {
    const platform = require("../platform/nodejs")
    options.mode = "anon";
    options.verbosity = 0;

    // create platform
    const device = new platform.Device()

    // boot from local file
    device.bootFromFile(options, cb)
}

//
function loadWalletList(Tykle, walletFile) {
    var List;
    var data;
    try {
        data = fs.readFileSync(walletFile);
    } catch (e) {
        List = Tykle.Wallet.List.fromObject({ name: "New Wallet", items: [] });
        return (List);
    }

    try {
        List = Tykle.Wallet.List.decode(data);
    } catch (e) {
        console.log(`Error reading Wallet ${walletFile}: ${e.message}`)
        process.exit(-1);
    }

    return (List);
}

function findWalletRef(List, ref) {
    var selected = null;
    for (var a in List.items) {
        const chest = List.items[a];
        if (chest.public.nonce.toString("hex") === ref.toLowerCase()) {
            selected = chest;
            break;
        }
    }
    return (selected);
}

function findWalletCircuit(List, pnid, vid) {
    for (var a in List.items) {
        const chest = List.items[a];
        if(chest.circuit) {
            if(chest.circuit.pnid == pnid && chest.circuit.vid == vid) return(chest)
        }
    }
    return (null);
}

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

//
function loadDiscovery(Tykle, options) {
    const data = fs.readFileSync(options.discoveryFile);
    return(Tykle.N2N.Public.Discovery.decode(data));
}

// word wrap
function wordWrap(str, maxWidth) {
    var newLineStr = "\n"; done = false; res = '';
    while (str.length > maxWidth) {
        found = false;
        // Inserts new line at first whitespace of the line
        for (i = maxWidth - 1; i >= 0; i--) {
            if (testWhite(str.charAt(i))) {
                res = res + [str.slice(0, i), newLineStr].join('');
                str = str.slice(i + 1);
                found = true;
                break;
            }
        }
        // Inserts new line at maxWidth position, the word is too long to wrap
        if (!found) {
            res += [str.slice(0, maxWidth), newLineStr].join('');
            str = str.slice(maxWidth);
        }

    }

    return res + str;
}
function testWhite(x) {
    var white = new RegExp(/^\s$/);
    return white.test(x.charAt(0));
};

// fix zero 
function fixZero(i) {
    if (i < 10) return (`000${i}`)
    if (i < 100) return (`00${i}`)
    return (`${i}`)
}

module.exports = {
    defaultWalletDir,
    ready,
    loadWalletList,
    wordWrap,
    findWalletRef,
    findWalletCircuit,
    fixZero,
    loadDiscovery,
    setupTcpClient
}