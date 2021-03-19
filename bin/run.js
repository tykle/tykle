#!/usr/bin/env node

const sc = require('subcommander');
const fs = require('fs');
const crypto = require('crypto');
const dgram = require('dgram');
const cliProgress = require('cli-progress');
const _colors = require('colors');
const os = require('os');

const loader = require('./_loader');

sc.command('run', {
    desc: 'Run Tykle CCT',
    callback: function (options) {

        const platform = require("../platform/nodejs")
        options.mode = "node";
        options.verbosity = parseInt(options.level);

        // create platform
        const device = new platform.Device()

        // boot from local file
        device.bootFromFile(options, (memory, finished) => {
            const Tykle = memory.proto.Tykle;
            const Type = Tykle.N2N.PhyLink.Type;
            const Kernel = memory.kernel;

            if (!options.pnid) {
                Kernel.log.error(`Please use option -p to set provided circuit`);
                process.exit(-1);
            }

            if (!options.vid) {
                Kernel.log.error(`Please use option -v to set vault circuit`);
                process.exit(-1);
            }

            // load chest
            try {
                const walletData = fs.readFileSync(options.walletFile);
                const wallet = Tykle.Wallet.List.decode(walletData);
                if (!wallet) {
                    console.log("No Wallet Loaded");
                    process.exit(-1);
                }

                if (wallet.name) Kernel.log.success(`Wallet ${wallet.name} in-use`);

                // extract chest from wallet list
                var select = wallet.items.filter((chest) => {
                    if (chest.circuit && chest.circuit.pnid == options.pnid && chest.circuit.vid == options.vid) return (true)
                    // device.debug(`\t|- Chest ${chest.name} PNID=${chest.circuit.pnid} VID=${chest.circuit.vid} is available`);
                    return (false)
                })
                if (select.length === 0) {
                    Kernel.log.error(`Cannot find chest in wallet PNID=${options.pnid} VID=${options.vid}`);
                    process.exit(-1);
                }
                select = select.pop();

                Kernel.log.success(`Chest ${select.name} will be use for circuit PNID=${options.pnid} VID=${options.vid}`)

            } catch (e) {
                console.log(`Error reading ${options.walletFile}: ${e.message}`);
                process.exit(-1);
            }

            memory.kernel.start(options.mode, select)

            function inter(str) {
                const ret = [];
                const list = str.split(",")
                const cards = os.networkInterfaces()
                for (var a in list) {
                    const interface = list[a];

                    if (!cards[interface]) {
                        console.log(`Cannot find interface ${interface}`);
                        process.exit(-1);
                    }

                    for (var b in cards[interface]) {
                        const ip = cards[interface][b];
                        ret.push({
                            ...ip,
                            interface
                        })
                    }
                }
                return (ret);
            }

            var ips = [];
            if (options.interfaces) {
                ips = inter(options.interfaces);
            }

            // start 
            if (options.tcp4 === true) {
                const tcp4 = platform.Net.TCP(memory);

                ips.map((item) => {
                    if (item.family === "IPv4")
                        memory.network.discovery.contactable(`tcp4://${item.address}`);
                })

                // memory.network.discovery.contactable("tcp4://");
            }

            if (options.reach) {
                const list = options.reach.split(",")

                for (var a in list) {
                    const reach = list[a];
                    memory.network.discovery.addStr(reach, true, true);
                }
            }

            if (options.mcast === true) {
                memory.network.discovery.addStr("mcast://", true, true);
            }

            finished()
        })
    }
}).option('kernelFile', {
    abbr: 'k',
    desc: 'Specify kernel file to load',
    default: __dirname + "/../dist/main.js"
}).option('dataDir', {
    abbr: 'd',
    desc: 'Specify data directory',
    default: fs.realpathSync(__dirname + "/../data")
}).option('walletFile', {
    abbr: 'w',
    desc: 'Specify wallet',
    default: `${loader.defaultWalletDir}/main.tkw`
}).option('pnid', {
    abbr: 'p',
    desc: 'Provided Network ID to use'
}).option('vid', {
    abbr: 'v',
    desc: 'Vault ID to use'
}).option('interfaces', {
    abbr: 'i',
    desc: 'Specify interface to combine with network services'
}).option('reach', {
    abbr: 'r',
    desc: 'Specify PhyLink string to reach initialy'
}).option('tcp4', {
    abbr: 'tcp4',
    desc: 'Start TCP4 Service',
    flag: true
}).option('mcast', {
    abbr: 'mcast',
    desc: 'Start Multicasting Service',
    flag: true
}).option('http', {
    abbr: 'http',
    desc: 'Start HTTP Service',
    flag: true
}).option('level', {
    abbr: 'l',
    desc: 'Specify error level',
    default: 1
});
