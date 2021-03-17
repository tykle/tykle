const sc = require('subcommander');
const fs = require('fs');
const net = require("net");
const crypto = require("crypto");
const cliProgress = require('cli-progress');
const _colors = require('colors');

const platform = require("../platform/nodejs");
const { memory } = require('console');

const lcd = sc.command('lcd', {
    desc: 'Play with anonymous Tykle Linear Circuit Distribution '
}).option('kernelFile', {
    abbr: 'k',
    desc: 'Specify kernel file to load',
    default: __dirname + "/../dist/main.js"
}).option('dataDir', {
    abbr: 'd',
    desc: 'Specify data directory',
    default: fs.realpathSync(__dirname + "/../data")
}).option('host', {
    abbr: 'h',
    desc: 'Specify host to connect',
    default: "127.0.0.1"
}).option('port', {
    abbr: 'p',
    desc: 'Specify port to connect',
    default: "1313"
});


function setupClient(options) {
    const memory = options.memory;
    const Network = memory.network;

    const client = net.createConnection({
        host: options.host,
        port: options.port
    }, async () => {
        memory.device.info(`New ${client.remoteFamily} connection to ${client.remoteAddress}:${client.remotePort}`);

        client.n2n = Network.n2nDecodeReplyHelper(async (packet) => {
            if (options.onFrame) await options.onFrame(client, packet);
        }, (err) => {
            memory.device.info(`Decoding error ${client.remoteAddress}:${client.remotePort}: ${err}`);
        })

        await options.onStart(client);
    });
    client.on('data', (data) => {
        return (new Promise((resolve, reject) => {
            client.n2n.decode(data, resolve);
        }));
    });
    client.on('end', () => {
        memory.device.info(`Disconnected from ${client.remoteAddress}:${client.remotePort}`);
    });
    client.on('error', (err) => {
        memory.device.info(`Connection error ${client.remoteAddress}:${client.remotePort}: ${err}`);
    });
}

lcd.command('Hash', {
    desc: 'Get LCD hash',
    callback: function (options) {
        options.mode = "anon";

        // create platform
        const device = new platform.Device()

        // boot from local file
        device.bootFromFile(options, (memory, finished) => {

            options.memory = memory;
            options.onStart = async (client) => {
                const Network = memory.network;

                const ePacket = await Network.request({
                    lcd: {
                        lcdHash: {
                            hash: Buffer.from(options[0], "hex")
                        }
                    }
                })
                client.write(ePacket);
            }
            options.onFrame = async (client, packet) => {
                const Network = memory.network;
                if (!packet.lcd.lcdHash.data) {
                    console.log("Cannot lookup LCD hash");
                }
                else {
                    console.log(`Valid return from service for LCD hash ${options[0]}`)
                    console.pretty(packet.lcd.lcdHash.data);
                }
                client.end();
            }
            setupClient(options);

            finished()
        })
    }
});

lcd.command('LastHash', {
    desc: 'Get contexted last hash',
    callback: function (options) {
        options.mode = "anon";

        // create platform
        const device = new platform.Device()

        // boot from local file
        device.bootFromFile(options, (memory, finished) => {

            options.memory = memory;
            options.onStart = async (client) => {
                const Network = memory.network;

                const ePacket = await Network.request({
                    lcd: {
                        lastHash: {
                            search: options[0]
                        }
                    }
                })
                client.write(ePacket);
            }
            options.onFrame = async (client, packet) => {
                const Network = memory.network;

                if (client.resolvSent !== true) {
                    console.log(`LCD last ${options[0]} hash 0x${packet.lcd.lastHash.data.toString("hex")}`)
                    const ePacket = await Network.request({
                        lcd: {
                            lcdHash: {
                                hash: packet.lcd.lastHash.data
                            }
                        }
                    })
                    client.write(ePacket);
                    client.resolvSent = true;
                }
                else {
                    if (!packet.lcd.lcdHash.data) {
                        console.log("Cannot lookup LCD hash");
                    }
                    else {
                        console.pretty(packet.lcd.lcdHash.data);
                    }
                    client.end();
                }
            }
            setupClient(options);

            finished()
        })
    }
});
