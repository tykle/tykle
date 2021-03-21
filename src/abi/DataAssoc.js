const config = require("./Config");

// low mem has schemas
// in low router collection are to the mongodb api

// can send N2N request

class signderivaMemAssoc {
    constructor(memory) {
        this.memory = memory;
        this.standalone = true;
        this.cache = {};
        this.lcd = {};
        this.council = {};
        this.Tykle = memory.proto.Tykle;
        this.memory.kernel.log.info("Starting cache standalone mode", ["abi", "assoc"]);
    }

    async setLCD(key, value) {
        const st = this.Tykle.LCD.create(value);
        this.lcd[key] = this.Tykle.LCD.encode(st).finish();
        return (st);
    }

    async getLCD(key) {
        const p = this.lcd[key];
        if (p) {
            const d = this.Tykle.LCD.decode(p);
            return (d)
        }
        return (null);
    }

    async setLCDHash(hash, value) {
        const key = 'H-' + hash.toString("base64");
        return (await this.setLCD(key, value))
    }

    async getLCDHash(hash) {
        // function later(delay) {
        //     return new Promise(function(resolve) {
        //         setTimeout(resolve, delay);
        //     });
        // }
        // await later(100);

        const key = 'H-' + hash.toString("base64");
        return (await this.getLCD(key))
    }

    async setLCDVault(c, value) {
        const key = `V-${c.pnid}-${c.vid}`;
        return (await this.setLCD(key, value))
    }

    async getLCDVault(circuit) {

        // function later(delay) {
        //     return new Promise(function(resolve) {
        //         setTimeout(resolve, delay);
        //     });
        // }

        // await later(1100)

        const f = async (c) => {
            const key = `V-${c.pnid}-${c.vid}`;
            return (await this.getLCD(key))
        }

        if (Array.isArray(circuit)) {
            const ret = [];
            for (var a in circuit) ret.push(await f(circuit[a]))
            return (ret)
        }
        else {
            return (await f(circuit))
        }


    }

    async getLCDVaultChest(circuit) {
        if (Array.isArray(circuit)) {
            const ret = [];
            for (var a in circuit) {
                const c = await this.getLCDVault(circuit[a]);
                if (c && c.vault && c.vault.invoke) ret.push(c.vault.invoke);
                else ret.push(null);
            }
            return (ret)
        }
        else {
            const r = (await this.getLCDVault(circuit));
            if (r && r.vault && r.vault.invoke) return (r.vault.invoke);
            return (null)
        }
    }

    async setCouncil(name, value) {
        const key = `C-${name}`;
        return (await this.setLCD(key, value, this.council))
    }

    async getCouncil(name) {
        const key = `C-${name}`;
        return (await this.getLCD(key, this.council))
    }

    async setLastHash(key, value) {
        key = `L-${key}`
        this.lcd[key] = value;
        return (value);
    }

    async getLastHash(key) {
        key = `L-${key}`
        return (this.lcd[key]);
    }

    // only circuit
    async setNodeIndex(key, value) {
        key = key != null ? `I-${key}` : `I-LAST`;
        this.lcd[key] = value;
        return (value);
    }

    async getNodeIndex(key) {
        key = key != null ? `I-${key}` : `I-LAST`;
        return (this.lcd[key]);
    }

    // ACCEPT COUNCIL
    /**
     * Set domain council 
     * @function TkSign
     * @param {string} key Domain Name
     * @param {string} value Shortcut to council
     * @returns {string} Initial value
     */
    async setDomainCouncil(key, value) {
        key = `D-${key}`
        this.lcd[key] = value;
        return (value);
    }

    async getDomainCouncil(key) {
        key = `D-${key}`
        return (this.lcd[key]);
    }

    async setCache(key, value, age) {
        this.cache[key] = {
            key: key,
            last: new Date,
            age: (age ? age : 60 * 5) * 1000,
            data: value,
        }
        return (this.cache[key]);
    }
}

module.exports = signderivaMemAssoc;