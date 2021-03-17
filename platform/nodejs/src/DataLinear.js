const fs = require("fs");
const mkdirp = require("mkdirp");

const DataLinear = require("../../../src/abi/DataLinear");

// points are forbidden
function strictDir(name) {
    return (name.replace(/\./g, ""));
}

class NodeJSDataLinearItem extends DataLinear.Item {
    constructor(memory, file, fd) {
        super(memory, file, fd);
        this.queue = [];
    }

    read(buffer, offset, length, position, cb) {
        return (fs.read(this.fd, buffer, offset, length, position, cb));
    }

    write(buffer, cb) {
        if (this.writting === true) {
            this.queue.push({ buffer, cb });
            return;
        }

        var scopeBuffer = buffer;
        var scopeCb = cb;
        var written = 0;

        // scope to current object
        this.writting = true;

        const relay = () => {
            fs.write(this.fd, scopeBuffer, written, scopeBuffer.length, null, (err, writtenbytes) => {
                if (err) {
                    return (scopeCb(err))
                } else {
                    written += writtenbytes;

                    // finaly got the buffer written
                    if (written === scopeBuffer.length) {
                        const other = this.queue.shift();
                        if (!other) {
                            this.writting = false;
                            return (scopeCb(null))
                        }

                        // there is packet in queue
                        // process now by swaping buffer
                        scopeBuffer = other.buffer;
                        scopeCb = other.cb;
                        written = 0;
                    }

                    setImmediate(relay)
                }
            })
        }

        relay();
    }

    async size() {
        try {
            const stat = fs.fstatSync(this.fd);
            return (stat.size);
        } catch (e) {
            this.memory.kernel.panic(`Can not stat file for size ${this.file}: ${e.message}`)
            return (0)
        }
    }

    async close() {
        fs.close(this.fd)
    }

    async lastModify() {
        try {
            const stat = fs.fstatSync(this.fd);
            return (stat.mtime);
        } catch (e) {
            this.memory.kernel.panic(`Can not stat file for mtime ${this.file}: ${e.message}`)
            return (null)
        }
    }
}

class NodeJSDataLinearRouter extends DataLinear.Driver {
    _prepareFile(file) {
        const dataDir = this.memory.user.options.dataDir;
        return (`${dataDir}/${strictDir(file)}.cct`);
    }

    async open(file) {
        const pfile = await this.getByFile(file);
        if (pfile) return (pfile);

        const dataDir = this.memory.user.options.dataDir;
        const fileName = this._prepareFile(file);

        try {
            mkdirp.sync(dataDir)
            const fd = fs.openSync(fileName, 'a+');
            this.fds[fd] = new NodeJSDataLinearItem(this.memory, fileName, fd)
            this.files[file] = this.fds[fd];
            return (this.fds[fd])
        } catch (e) {
            this.memory.kernel.panic(`Can not load file ${file}: ${e.message}`)
            return (null)
        }
    }

    // when communication is impossible
    async close(file) {
        const pfile = await this.getByFile(file);
        if (pfile) return (false);
        await pfile.close();
        return (true);
    }

    /**
     * 
     * @param {Tykle.N2N.Packet} packet 
     */
    async size(file) {
        const pfile = await this.open(file);
        if (!pfile) return (0);
        return (await pfile.size());
    }

    async lastModify(file) {
        const pfile = await this.open(file);
        if (!pfile) return (null);
        return (await pfile.lastModify());
    }
}

module.exports = {
    Item: NodeJSDataLinearItem,
    Driver: NodeJSDataLinearRouter
}