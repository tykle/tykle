const crypto = require("crypto");
const EC = require('elliptic').ec;
const fs = require("fs");
const log = require('fancylog');
const chalk = require('chalk');
const { crc32 } = require('crc');

const Device = require("../../../src/abi/Device");

const DataLinear = require("./DataLinear");
const n2nTcpClient = require("./NetTcpClient");
const n2nNetMcast = require("./NetMcast");

class NodeJSDevice extends Device {
    constructor(mem) {
        super(mem);
        this.logPaddingChan = 25;
        this.logPaddingType = 10;
    }

    bootFromFile(options, loaded) {
        fs.readFile(options.kernelFile, (err, data) => {
            if (err) {
                console.log(err);
                process.exit(-1);
            }

            // execute memory into proper scope
            const self = this;
            (async function () {
                const memory = {
                    device: self,
                    user: { options },
                    onBoot: loaded
                }

                memory.data = {
                    linear: new DataLinear.Driver(memory)
                }

                memory.device.boot(memory, data.toString())
            })()
        })
    }

    async transport(phyLink) {
        // const Return = Reason(reason);
        const Tykle = this.memory.proto.Tykle;
        const Type = Tykle.N2N.PhyLink.Type;
        switch (phyLink.type) {
            case Type.N2N_TCP_4:
            case Type.N2N_TCP_6:
                return (n2nTcpClient(this.memory, phyLink.hostname, phyLink.port));
            case Type.N2N_MCAST:
                return (n2nNetMcast(this.memory, phyLink.hostname, phyLink.port));
        }
        return (null);
    }

    uname() {
        return ("NodeJS Tykle Platform");
    }

    _trustable(code) {
        // this.memory.kernel.log.warning(`Bypassing Trustable Code`);
        return ({
            trust: "trustedKey",
            magic: "magic",
            sender: "sender",
            hash: "hash",
            der: "der"
        });
    }

    /**
     * Get random bytes
     * @param  {Number} n Number of bytes
     * @return {Array}   Array of random bytes
     */
    async random(n) {
        return (await crypto.randomBytes(n))
    }

    /**
     * Retrieve a SHA256 derivated class context
     * @return {nodejsDeviceSHA256} SHA256 class
     */
    sha256() {
        return (crypto.createHash("sha256"))
    }

    /**
     * Retrieve a HMAC derivated class context
     * @return {nodejsDeviceHMAC} HMAC class
     */
    hmac() {
        return (crypto.createHmac("sha256"))
    }

    /**
     * Retrieve a ECDH derivated class context
     * @return {nodejsDeviceECDSA} ECDSA class
     */
    ecdsa(curve) {
        return (new EC(curve))
    }

    /**
     * Retrieve a ECDSA derivated class context
     * @return {nodejsDeviceECDH} ECDH class
     */
    ecdh(curve) {
        return (new EC(curve))
    }

    info(text) {
        log.info(text)
    }

    success(text) {
        log.info(text)
    }

    warning(text) {
        log.warn(text)
    }

    error(text) {
        log.error(text)
    }

    debug(text) {
        // log.debug(text)
    }

    logger(message) {
        message.params = message.params || [];

        // remove null and undefined
        message.params = message.params.filter((item) => {
            if (!item) return (false);
            return (true)
        })

        var chan = `/${message.params.join("/")}`;

        // prepare chan
        var type = `[${message.type.toUpperCase()}]`;

        // padding
        if (type.length > this.logPaddingType) this.logPaddingType = type.length;
        type += ' '.repeat(this.logPaddingType - type.length);

        if (chan.length > this.logPaddingChan) this.logPaddingChan = chan.length;
        chan += ' '.repeat(this.logPaddingChan - chan.length);

        // coloring type
        switch (message.type) {
            case 'success': type = chalk.green(type); break;
            case 'info': type = chalk.grey(type); break;
            case 'error':
            case 'fatal': type = chalk.red(type); break;
            case 'warning': type = chalk.yellow(type); break;
            case 'debug': return;// type = chalk.blue(type); break;
        }

        // rand hash
        // var track;
        // var round = 0;
        // do {
        //     track = crc32(chan + round).toString(16);
        //     var rgb = parseInt(track, 16);
        //     var r = (rgb >> 16) & 0xff;
        //     var g = (rgb >> 8) & 0xff;
        //     var b = (rgb >> 0) & 0xff;
        //     var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // } while (luma < 40);

        const rec = 100;
        var track = crc32(chan);
        var r = (track >> 16) & 0xff;
        var g = (track >> 8) & 0xff;
        var b = (track >> 0) & 0xff;

        if(r < rec) r = rec+r;
        if(g < rec) g = rec+g;
        if(b < rec) b = rec+b;

        // console.log(r, g, b)
        chan = chalk.rgb(r, g, b)(chan);

        function fixZero(i) {
            if(i<10) return(`00${i}`)
            if(i<100) return(`0${i}`)
            return(`${i}`)
        }

        // compute current chest
        var chest = " - / - ";
        if(this.memory && this.memory.chest) {
            const circuit = this.memory.chest.circuit;
            if(!circuit) chest = "?/?";
            else chest = `${fixZero(circuit.pnid)}/${fixZero(circuit.vid)}`;
            
        }
        

        console.log(`[${message.date.toLocaleString()}] [${chest}] ${type} ${chan} | ${message.message}`)
    }
}

module.exports = NodeJSDevice;