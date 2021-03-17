class Uouseur {
    constructor(memory) {
        this.memory = memory;
        this.ready = false;
        this.readOnly = false;
        this._queue = [];
        this._awaiting = {}
        this._destructors = [];

        this.log = new this.memory.lib.Log(["channel"]);
    }

    addDestructor(fct) {
        this._destructors.push(fct);
    }

    async write(buffer) {
        return (null);
    }

    async error(name) {
        const msg = `Error: ${name}`;
        this.log.error(msg);
        return (msg)
    }

    dispatch(channel, packet) {
        if(!packet.sequence) return;
        const key = packet.sequence.toString("hex");
        const exec = this._awaiting[key];
        if(exec) {
            if(exec.onReply) exec.onReply(null, channel, packet, exec.packet);
            
            // exec.onReply
            delete this._awaiting[key];
        }
    }

    async request(packet, onReply, timeout) {
        if(this.closed === true) return;

        const Device = this.memory.device;

        // assign sequence
        var id = null;
        do {
            packet.sequence = await Device.random(6);
        } while(this._awaiting[packet.sequence.toString("hex")]);

        this._awaiting[packet.sequence.toString("hex")] = {
            packet, onReply, timeout
        }
        const ePacket = this.memory.network.requestEncode(packet);
        this.queue(ePacket);
    }

    queue(buffer, onFinish, timeout) {
        if(this.closed === true) return;

        timeout = timeout || 60;
        this._queue.push({ buffer, onFinish, timeout });
        if (this._queueLock !== true) {
            this._queueLock = true;
            
            setImmediate(async () => { 
                await this.dequeue();
            })
        }
    }

    async dequeue() {
        const item = this._queue.shift();
        if(!item) {
            this._queueLock = false;
            return;
        }
        
        await this.write(item.buffer);
        if(item.onFinish) await item.onFinish();
        
        setImmediate(async () => { 
            await this.dequeue();
        })
    }

    async close() {
        this.closed = true;
        this._queueLock = true;
        this._queue = []
    }

}

module.exports = Uouseur;