const sc = require('subcommander');
const fs = require('fs');
const { table } = require('table');
const chalk = require('chalk');
const os = require('os');
const loader = require('./_loader');


const discovery = sc.command('discovery', {
    desc: 'Tykle Wallet'
}).option('dataDir', {
    abbr: 'd',
    desc: 'Specify data directory',
    default: `${loader.defaultWalletDir}/data`
}).option('discoveryFile', {
    abbr: 'f',
    desc: 'Specify discovery file to operate',
    default: `${loader.defaultWalletDir}/selfDiscovery.phy`
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
discovery.command('create', {
    desc: 'Create a dicovery channel',
    callback: function (options) {

        loader.ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;
            const Device = memory.device;

            if (!options.pnid) {
                console.log(`Please use option -p to set provided circuit`);
                process.exit(-1);
            }

            if (!options.vid) {
                console.log(`Please use option -v to set vault circuit`);
                process.exit(-1);
            }

            // load wallet
            var List = loader.loadWalletList(Tykle, options.walletFile);
            const Chest = loader.findWalletCircuit(List, options.pnid, options.vid);
            if(!Chest) {
                console.log(`Cannot find chest circuit in the wallet`);
                process.exit(-1);
            }

            const rPacket = {
                nonce: await Device.random(4),
                date: new Date().toUTCString(),
                links: []
            }

            // add interface phy
            function inter(str) {
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
                        if (ip.family === "IPv4") {
                            const phy = memory.lib.Net.PhyFromString(`tcp4://${ip.address}`);
                            rPacket.links.push(phy);
                            // console.log(`tcp4://${ip.address} added`);
                        }
                        else if (ip.family === "IPv6" && options.noIpv6 !== true) {
                            const phy = memory.lib.Net.PhyFromString(`tcp6://${ip.address}`);
                            rPacket.links.push(phy);
                            // console.log(`tcp6://${ip.address} added`);
                        }
                    }
                }
            }

            if (options.interfaces) {
                inter(options.interfaces);
            }

            // add manual phy
            var a = 0;
            do {
                const str = options[a];
                if(!str) break;
                const phy = memory.lib.Net.PhyFromString(str);
                rPacket.links.push(phy);
                if (!phy.hostname) {
                    console.log(`Warning no hostname for ${str}`)
                }
                // else console.log(`${str} added`);
                a++;
            } while (options[a])

            // hash & sign
            const oPacket = await Tykle.N2N.Public.Discovery.fromObject(rPacket)
            Tykle.N2N.Public.Discovery.TkHash(oPacket);
            Tykle.N2N.Public.Discovery.TkSign(Chest, oPacket);

            // write in the self dicovery
            const discoverySelf = `${loader.defaultWalletDir}/selfDiscovery.phy`;
            const ePacket = Tykle.N2N.Public.Discovery.encode(oPacket).finish();
            fs.writeFileSync(discoverySelf, ePacket);
            console.pretty(oPacket)
            console.log(`Writting discovery PHY to ${discoverySelf}`)

            const data = fs.readFileSync(discoverySelf);

            process.exit(0);
        })

    }
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
}).option('noIpv6', {
    abbr: 'nov6',
    desc: 'No Discovering IPv6 Address',
    flag: true
});



/* * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 *
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * */
discovery.command('read', {
    desc: 'Read the current discovery channel',
    callback: function (options) {
        loader.ready(options, async (memory, finished) => {
            const Tykle = memory.proto.Tykle;
            console.log(options)
            const oPacket = loader.loadDiscovery(Tykle, options);
            console.pretty(oPacket);
            process.exit(0);
        })
    }
});