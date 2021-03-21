const dgram = require('dgram');
const crypto = require("crypto");
const Net = require("../../../src/abi/Net");

const MCAST_PORT = 3131;
const MCAST_ADDR = "230.185.192.108";

class LinkMcast extends Net {
    constructor(memory, server) {
        super(memory);
        this.server = server;
        this.readOnly = true; // discard request and reply

        this.log = new this.memory.lib.Log(['multicast']);
    }

    async write(buffer) {
        return (await this.server.send(buffer, 0, buffer.length, MCAST_PORT, MCAST_ADDR))
    }

    error(name) {
        return (super.error(name))
    }
}

function NodeJSNetMcast(memory, host, port) {
    const Kernel = memory.kernel;
    Kernel.log.info(`Starting Multicasting on ${host}:${port}`);

    const server = dgram.createSocket("udp4");
    const link = new LinkMcast(memory, server);

    server.on('message', async (msg, rinfo) => {
        const Tykle = memory.proto.Tykle;
        try {
            const oPacket = Tykle.N2N.Public.Discovery.decode(msg);
            memory.network.discovery.setMeetingPoint(oPacket);
        } catch (e) { }
    });

    server.bind(MCAST_PORT, async () => {
        server.setBroadcast(true);
        server.setMulticastTTL(128);
        server.addMembership(MCAST_ADDR);
        Kernel.log.info(`Multicast service Listening on ${host}:${port} catching ${MCAST_ADDR}`, ['abi', 'net', 'mcast']);
    });

    return (link);
}

module.exports = NodeJSNetMcast;
