const sc = require('subcommander');
const fs = require('fs');
const { table } = require('table');
const chalk = require('chalk');


function loadList(Tykle, walletFile) {
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

function writeList(Tykle, walletFile, List) {
    const Packet = Tykle.Wallet.List.encode(List).finish();
    fs.writeFileSync(walletFile, Packet);
}

function fixZero(i) {
    if (i < 10) return (`000${i}`)
    if (i < 100) return (`00${i}`)
    return (`${i}`)
}

function findRef(List, ref) {
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

function ready(options, cb) {
    const platform = require("../platform/nodejs")
    options.mode = "anon";
    options.verbosity = 0;

    // create platform
    const device = new platform.Device()

    // boot from local file
    device.bootFromFile(options, cb)
}

// select default directory
var defaultDir;
try {
    defaultDir = fs.realpathSync(`${process.env.HOME}`);
} catch (e) {
    console.log(e)
}
if (!defaultDir) defaultDir = "/root/.tykle";
else defaultDir += "/.tykle";

// create wallet directory
try {
    const st = fs.statSync(defaultDir);
} catch (e) {
    try {
        fs.mkdirSync(defaultDir);
        fs.mkdirSync(defaultDir + "/data");
    } catch (e) {
        console.log(e)
        process.exit(-1);
    }
}

const wallet = sc.command('wallet', {
    desc: 'Tykle Wallet'
}).option('dataDir', {
    abbr: 'd',
    desc: 'Specify data directory',
    default: `${defaultDir}/data`
}).option('walletFile', {
    abbr: 'f',
    desc: 'Specify wallet file to operate',
    default: `${defaultDir}/main.tkw`
}).option('kernelFile', {
    abbr: 'k',
    desc: 'Specify kernel file to load',
    default: __dirname + "/../dist/main.js"
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('list', {
    desc: 'List all chests in the wallet',
    callback: function (options) {
        const cHead = chalk.rgb(173, 255, 47).bold;

        ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;

            // load wallet
            var List = loadList(Tykle, options.walletFile);

            // nonce / type / 
            const data = [[
                '',
                'Ref',
                'State',
                'Type',
                'Circuit',
                'Name',
                'ECDSA',
                'ECDH',
            ].map(item => { return (cHead(item.toUpperCase())) })];

            for (var a in List.items) {
                const chest = List.items[a];
                var cirStr = " ? / ? ";;
                if (chest.circuit) cirStr = `${fixZero(chest.circuit.pnid)}/${fixZero(chest.circuit.vid)}`;

                var state = "PUBLIC";
                if(chest.private) {
                    state = `PRIVATE ${chest.private.locked === true ? 'LOCKED' : 'UNLOCKED'}`
                }
                
                const insert = [
                    a,
                    chest.public.nonce.toString("hex"),
                    state,
                    chest.public.type === Tykle.Wallet.Chest.Type.IS_NODE ? 'NODE' : 'USER',
                    `[${cirStr}]`,
                    chest.name || 'N/A',
                    chest.public.ecdsa.toString("base64"),
                    chest.public.ecdh.toString("base64"),
                ]
                data.push(insert)
            }

            const config = {
                columns: {
                    2: { width: 8 },
                    5: { width: 30 },
                    6: { width: 30 },
                    7: { width: 30 }
                }
            };

            if (options.json === true) {
                console.log(JSON.stringify(List, null, "  "));
            }
            else {
                const output = table(data, config);
                console.log(`# Tykle Wallet: ${List.name} with ${List.items.length} chests`)
                console.log(output);
            }

            process.exit(0);
        })

    }
}).option('json', {
    abbr: 'json',
    desc: 'JSON output',
    default: false,
    flag: true
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('create', {
    desc: 'Create a chest in the wallet',
    callback: function (options) {

        const platform = require("../platform/nodejs")
        options.mode = "anon";

        // create platform
        const device = new platform.Device()

        // boot from local file
        device.bootFromFile(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;
            const Type = Tykle.N2N.PhyLink.Type;
            const Kernel = memory.kernel;

            // load wallet
            var List = loadList(Tykle, options.walletFile);

            // check if the
            const type = options.type.toLowerCase() === "node" ? Tykle.Wallet.Chest.Type.IS_NODE : Tykle.Wallet.Chest.Type.IS_USER
            const chest = await Tykle.Wallet.Chest.TkGenerate(type);
            List.items.push(chest);

            // encode and write file
            writeList(Tykle, options.walletFile, List);

            console.log("New Chest Created")
        })

    }
}).option('type', {
    abbr: 't',
    desc: 'Type: USER / NODE',
    default: `USER`
});




/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('name', {
    desc: 'Change the name of a chest',
    callback: function (options) {

        ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;

            // load wallet
            const List = loadList(Tykle, options.walletFile);
            const ref = options[0];
            const name = options[1];

            var selected = findRef(List, ref);
            if (!selected) {
                console.log(`Cannot find ${ref} chest in the wallet`);
                process.exit(-1);
            }

            if (!name) {
                console.log(`No name specified`);
                process.exit(-1);
            }

            selected.name = name;

            // encode and write file
            writeList(Tykle, options.walletFile, List);

            console.log(`Name of chest #${ref} updated: ${name}`);
            process.exit(0);
        })

    }
}).option('type', {
    abbr: 't',
    desc: 'Type: USER / NODE',
    default: `USER`
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('delete', {
    desc: 'Delete a chest from wallet',
    callback: function (options) {
        ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;

            // load wallet
            const List = loadList(Tykle, options.walletFile);
            const ref = options[0];

            var selected = findRef(List, ref);
            if (!selected) {
                console.log(`Cannot find ${ref} chest in the wallet`);
                process.exit(-1);
            }

            // delete
            List.items = List.items.filter((item) => {
                if (item === selected) return (false);
                return (true);
            })

            // encode and write file
            writeList(Tykle, options.walletFile, List);

            console.log(`Chest #${ref} deleted`);
            process.exit(0);
        })

    }
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('extract', {
    desc: 'Extract a chest from the wallet to a new one',
    callback: function (options) {
        ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;

            // load wallet

            const ref = options[0];
            const dst = options[1] || './extracted.tkw';

            if (!ref) {
                console.log(`Usage: tykle wallet extract [ref] (destination)`);
                process.exit(-1);
            }

            // load list
            const List = loadList(Tykle, options.walletFile);

            // get ref
            var selected = findRef(List, ref);
            if (!selected) {
                console.log(`Cannot find ${ref} chest in the wallet`);
                process.exit(-1);
            }

            // load dst 
            const ListDst = loadList(Tykle, dst);
            ListDst.items.push(selected);

            // encode and write file
            writeList(Tykle, dst, ListDst);

            console.log(`Chest #${ref} extracted from ${options.walletFile} and stored into wallet ${dst}`);
            process.exit(0);
        })
    }
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('insert', {
    desc: 'Insert a chest from another wallet',
    callback: function (options) {
        ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;

            // load wallet
            const ref = options[0];
            const from = options[1] || './extracted.tkw';

            if (!ref) {
                console.log(`Usage: tykle wallet extract [ref] (from)`);
                process.exit(-1);
            }

            // load list
            const List = loadList(Tykle, from);

            // get ref
            var selected = findRef(List, ref);
            if (!selected) {
                console.log(`Cannot find ${ref} chest in the wallet`);
                process.exit(-1);
            }

            // load from 
            const ListDst = loadList(Tykle, options.walletFile);
            ListDst.items.push(selected);

            // encode and write file
            writeList(Tykle, options.walletFile, ListDst);

            console.log(`Chest #${ref} loaded from ${from} and stored into wallet ${options.walletFile}`);
            process.exit(0);
        })
    }
});

/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
wallet.command('share', {
    desc: 'Share a chest',
    callback: function (options) {
        ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;

            // load wallet
            const ref = options[0];
            if (!ref) {
                console.log(`Usage: tykle wallet share [ref]`);
                process.exit(-1);
            }

            // load list
            const List = loadList(Tykle, options.walletFile);

            // get ref
            var selected = findRef(List, ref);
            if (!selected) {
                console.log(`Cannot find ${ref} chest in the wallet`);
                process.exit(-1);
            }

            // remove private ?
            if (options.private !== true) delete selected.private;

            // reencode chest
            const ePacket = Tykle.Wallet.Chest.encode(selected).finish();

            const buffer = `-----BEGIN TYKLE ${options.private !== true ? 'PUBLIC' : 'PRIVATE'} CHEST-----\n` +
                wordWrap(ePacket.toString("base64"), 40) + '\n' +
                `-----END TYKLE ${options.private !== true ? 'PUBLIC' : 'PRIVATE'} CHEST-----`;

            console.log(buffer)
            process.exit(0);
        })
    }
}).option('private', {
    abbr: 'private',
    desc: 'Share the chest with private information (risky)',
    default: false,
    flag: true
});
