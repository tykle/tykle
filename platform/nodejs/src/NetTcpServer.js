const net = require("net");
const crypto = require("crypto");
const Net = require("../../../src/abi/Net");

class NodeJSNetTcpServerSocket extends Net {
    constructor(memory, socket) {
        super(memory);
        this.socket = socket;

        this.log = new this.memory.lib.Log(['tcp', "in"]);
    }

    async write(buffer) {
        if(!this.socket) {
            return;
        }
        return (new Promise((resolve, reject) => {
            const r = this.socket.write(buffer, resolve);
            // if (r === false) this.socket.once('drain', resolve);
            // else resolve();
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
        await memory.network.channel.register(user, false);

        // change log 
        user.logOld = user.log;
        user.log = new memory.lib.Log([
            'tcp', 
            'in', 
            user.id
        ]);

        // 'connection' listener.
        user.log.debug(`New ${socket.remoteFamily} connection from ${socket.remoteAddress}:${socket.remotePort}`);
        socket.on('data', async (data) => {
            await memory.network.channel.read(user, data);
        });
        socket.on('close', async () => {
            user.log.debug(`Connection lost from ${socket.remoteAddress}:${socket.remotePort}`);
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