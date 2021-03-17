const net = require("net");
const crypto = require("crypto");
const Net = require("../../../src/abi/Net");

class NodeJSNetTcpClientSocket extends Net {
    constructor(memory, host, port) {
        super(memory);
        this.host = host;
        this.port = port;
        this.ready = false;
        this.socket = null;


        this.log = new this.memory.lib.Log(['tcp', "out"]);
    }

    async write(buffer) {
        if(!this.socket) return;
        return(new Promise((resolve, reject) => {
            const r = this.socket.write(buffer);
            if(r === false) this.socket.once('drain', resolve);
            else resolve();
        }));
    }


    async error(name) {
        await this.close();
        return (super.error(name))
    }

    async close() {
        await this.memory.network.channel.unregister(this);

        if(this.socket) this.socket.destroy();
        this.socket = null;
        await super.close();
    }

}

function NodeJSNetTcpClient(memory, host, port) {
    const user = new NodeJSNetTcpClientSocket(memory, host, port);

    function shoot() {
        const client = net.createConnection({ host, port }, async () => {
            user.socket = client;
            await memory.network.channel.register(user, true);

            // change log 
            user.logOld = user.log;
            user.log = new memory.lib.Log(['tcp', "out", user.id]);

            user.log.info(`Client Connected to ${host}:${port}`);
        });
        client.on('data', async (data) => {
            await memory.network.channel.read(user, data);
        });
        client.on('close', async () => {
            user.log.info(`Client Disconnected from ${host}:${port}`);
            user.log = user.logOld;
            await memory.network.channel.unregister(user);
            user.socket = null;
        });
        client.on('error', async (err) => {
            user.log.warning(`Client error: ${err}`);
            user.log = user.logOld;
            await memory.network.channel.unregister(user);
            user.socket = null;
        });
    }
    shoot();

    return (user)
}

module.exports = NodeJSNetTcpClient;
