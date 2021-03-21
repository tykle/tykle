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
    callback: async function (options) {
        const reserved = {};
        const platform = require("../platform/nodejs")
        options.mode = "node";
        options.verbosity = parseInt(options.level);

        // create platform
        const device = new platform.Device()

        // boot from local file
        device.bootFromFile(options, async (memory, finished) => {
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

            // load discovery packet
            const discoveryFile = `${loader.defaultWalletDir}/selfDiscovery.phy`;
            const discovery = loader.loadDiscovery(Tykle, { discoveryFile });
            if (!discovery) {
                console.log(`Error loading discovery packet, try: tykle discovery create tcp4://your-ip:1313`);
                process.exit(-1);
            }

            // broadcast my last heartbeat
            var early = false;
            await Kernel.newTask("Discovery Updater", true, async (task) => {
                const discovery = loader.loadDiscovery(Tykle, { discoveryFile });
                if (!discovery) return (task.sched(1000));

                // if (early !== true) {
                    // load very early phy
                    const dirs = fs.readdirSync("./data/phy")
                    for (var a in dirs) {
                        const phyFile = `./data/phy/${dirs[a]}`;
                        const data = fs.readFileSync(phyFile);
                        const toLoad = Tykle.N2N.Public.Discovery.decode(data);
                        memory.network.discovery.setMyMeetingPoint(toLoad);
                    }
                    // early = true;
                // }

                // imform the kernel
                memory.network.discovery.setMyMeetingPoint(discovery);

                // broadcast to multicast
                if (reserved.mcaster) {
                    const ePacket = Tykle.N2N.Public.Discovery.encode(discovery).finish();
                    await reserved.mcaster.write(ePacket);
                }

                task.sched(5000)
            })

            

            // start tcp server
            if (options.tcp4 === true) {
                reserved.tcp4 = platform.Net.TCP(memory);
            }

            if (options.mcast === true) {
                reserved.mcaster = platform.Net.MCAST(memory);
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
