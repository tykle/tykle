const net = require("net");
const crypto = require("crypto");
const Net = require("../../../src/abi/Net");

// node-test-25_1  | [3/21/2021, 8:25:02 AM] [000/025] [INFO]     /tcp/in/f24352b7          | New IPv6 connection from ::ffff:172.20.0.1:64680
// node-test-25_1  | [f24352b7] error N2N Framing invalid wire type 4 at offset 8
// node-test-25_1  | [f24352b7] error N2N Framing invalid wire type 7 at offset 5
// node-test-25_1  | [f24352b7] error N2N Framing index out of range: 82 + 32 > 109
// node-test-25_1  | [f24352b7] error N2N Framing invalid wire type 4 at offset 6
// node-test-25_1  | [f24352b7] error N2N Framing invalid wire type 4 at offset 82
// node-test-25_1  | [f24352b7] error N2N Framing invalid wire type 6 at offset 35
// node-test-25_1  | [f24352b7] error N2N Framing index out of range: 2 + 83 > 13
// node-test-25_1  | [f24352b7] error N2N Framing invalid wire type 6 at offset 6


class NodeJSNetTcpServerSocket extends Net {
    constructor(memory, socket) {
        super(memory);
        this.socket = socket;

        this.log = new this.memory.lib.Log(['tcp', "in"]);
    }

    async write(buffer) {
        if (!this.socket) return;
        return (new Promise((resolve, reject) => {
            const r = this.socket.write(buffer);
            if (r === false) this.socket.once('drain', resolve);
            else resolve();
        }));
    }

    async error(name) {
        await this.close()
        return (await super.error(name))
    }

    async close() {
        await this.memory.network.channel.unregister(this);

        if (this.socket) this.socket.destroy();
        this.socket = null;
        await super.close();
    }

}

function NodeJSNetTcpServer(memory) {
    const Kernel = memory.kernel;

    const server = net.createServer(async (socket) => {
        const user = new NodeJSNetTcpServerSocket(memory, socket);

        // registering connection into the kernel
        await memory.network.channel.register(user, true);

        // change log 
        user.logOld = user.log;
        user.log = new memory.lib.Log([
            'tcp', 
            'in', 
            user.id
        ]);

        // 'connection' listener.
        user.log.info(`New ${socket.remoteFamily} connection from ${socket.remoteAddress}:${socket.remotePort}`);
        socket.on('data', async (data) => {
            await memory.network.channel.read(user, data);
        });
        socket.on('close', async () => {
            user.log.info(`Connection lost from ${socket.remoteAddress}:${socket.remotePort}`);
            user.log = user.logOld;
            await memory.network.channel.unregister(user);
        });
        socket.on('error', async (err) => {
            user.log.warning(`Error: ${err}`);
            user.log = user.logOld;
            await memory.network.channel.unregister(user);
        });


    }).on('error', (err) => {
        // Handle errors here.
        throw err;
    });

    // Grab an arbitrary unused port.
    server.listen(1313, 10, () => {
        const l = server.address();
        Kernel.log.info(`Server open on ${l.address}:${l.port} (${l.family} ready)`, ['abi', 'net', 'tcp']);
    });

}

module.exports = NodeJSNetTcpServer;