const config = require("./Config");

class signderivaMemLinearItem {
    constructor(memory, file, fd) {
        this.memory = memory;
        this.file = file;
        this.fd = fd;
    }

    framing(opts) {
        opts = opts || {};
        const Tykle = this.memory.proto.Tykle;
        const Frame = new this.memory.lib.Net.FrameStreamDecode({
            onFrame: opts.onFrame,
            onError: opts.onError,
        });

        const ctx = {
            alloc: opts.alloc || 1000,
            size: 0,
            offset: opts.offset || 0
        }

        const r = () => {
            const buf = Buffer.alloc(ctx.alloc)
            this.read(buf, 0, buf.length, ctx.offset, async (err, bytes) => {
                if (err) {
                    if (opts.onEnd) return (opts.onError(`Framing error: ${err.message}`));
                }

                ctx.size += bytes;

                // prepare buffer
                var readyBuf = buf;
                if (ctx.alloc !== bytes) readyBuf = buf.slice(0, bytes)

                // exec
                await Frame.decode(readyBuf);

                // EOF
                if (bytes != buf.length) {
                    if (opts.onEnd) opts.onEnd();
                }

                // Not more bytes
                else if (opts.limit && ctx.size > opts.limit) {
                    if (opts.onEnd) opts.onEnd();
                    return;
                }
                // Continue to decode
                else {
                    ctx.offset += bytes;
                    setImmediate(r)
                }
            })
        }
        r()
    }

    read(buffer, offset, length, position, cb) {
        return (cb(new Error(`No linear driver`)));
    }

    write(buffer, cb) {
        return (cb(new Error(`No linear driver`)));
    }

    async awaitRead(buffer, offset, length, position) {
        return(new Promise((resolve, reject) => {
            this.read(buffer, offset, length, position, resolve);
        }));
    }

    async awaitWrite(buffer) {
        return(new Promise((resolve, reject) => {
            this.write(buffer, resolve);
        }));
    }

    async size() {
        return (cb(new Error(`No linear driver`)));
    }

    async close() {
        return (cb(new Error(`No linear driver`)));
    }

    async lastModify() {
        return (cb(new Error(`No linear driver`)));
    }
}

class signderivaMemLinearRouter {

    constructor(memory) {
        this.memory = memory;
        this.fds = [],
            this.files = []
    }

    async getByFile(file) {
        return (this.files[file]);
    }

    async getByFD(file) {
        return (this.files[file]);
    }

    async open(file) {

    }

    // when communication is impossible
    async close(file) {

    }

    /**
     * 
     * @param {Tykle.N2N.Packet} packet 
     */
    async size(file) {

    }

    async lastModify(file) {

    }

    async closeAll() {

    }
}

module.exports = {
    Item: signderivaMemLinearItem,
    Driver: signderivaMemLinearRouter,
}