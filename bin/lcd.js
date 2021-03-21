const sc = require('subcommander');
const fs = require('fs');

const crypto = require("crypto");
const cliProgress = require('cli-progress');
const _colors = require('colors');
const loader = require('./_loader');


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


lcd.command('Hash', {
    desc: 'Get LCD hash',
    callback: function (options) {
        options.mode = "anon";
        options.verbosity = 0;
        
        loader.ready(options, async (memory, finished) => {

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

                try {
                    if (!packet.reply.lcd) return;
                } catch (e) { return; }

                const Network = memory.network;
                if (!packet.reply.lcd.lcdHash.data) {
                    console.log("Cannot lookup LCD hash");
                }
                else {
                    console.log(`Valid return from service for LCD hash ${options[0]}`)
                    console.pretty(packet.reply.lcd.lcdHash.data);
                }
                client.end();
            }
            loader.setupTcpClient(options);

            finished()
        })
    }
});

lcd.command('LastHash', {
    desc: 'Get contexted last hash',
    callback: function (options) {
        options.mode = "anon";
        options.verbosity = 0;

        loader.ready(options, async (memory, finished) => {

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

                try {
                    if (!packet.reply.lcd) return;
                } catch (e) { return; }

                if (packet.reply.lcd.lastHash) {
                    if (client.resolvSent !== true) {
                        console.log(`LCD last ${options[0]} hash 0x${packet.reply.lcd.lastHash.data.toString("hex")}`)

                        const ePacket = await Network.request({
                            lcd: {
                                lcdHash: {
                                    hash: packet.reply.lcd.lastHash.data
                                }
                            }
                        })
                        client.write(ePacket);
                        client.resolvSent = true;
                    }
                }
                else if (packet.reply.lcd.lcdHash && client.resolvSent === true) {
                    if (!packet.reply.lcd.lcdHash.data) {
                        console.log("Cannot lookup LCD hash");
                    }
                    else {
                        console.pretty(packet.reply.lcd.lcdHash.data);
                    }
                    client.end();
                }
            }
            loader.setupTcpClient(options);

            finished()
        })
    }
});
