
const bootURLs = [
    'https://gist.githubusercontent.com/mykiimike/6d9af32e307c854d2295caa8a668a112/raw/b6a964d7cf61ef5a2bc7655209cf2acd32ad7b2b/test.js'
]

class signderivaDevice {
    constructor(memory) {
        this.memory = memory;
        this._reference = 0;
    }

    uname() {
        return ("Unconfigured Device");
    }

    onBoot() {
        // this.info("Signderiva Kernel Boot Completed");
    }

    incomingNetwork(netDev) {
        throw new Error("Not network platform defined")
    }

    outgoingNetwork() {
        throw new Error("Not network platform defined")
    }

    /**
     * Indicate the current working state of Signderiva Kernel
     * @param  {[type]} reference Reference number (1 or -1)
     * @param  {[type]} message   Related message
     */
    stack(reference) {
        this._reference += reference;
    }

    info(text) {
        console.log(text)
    }

    success(text) {
        console.log(text)
    }

    warning(text) {
        console.log(text)
    }

    error(text) {
        console.log(text)
    }


    debug(text) {
        console.log(text)
    }

    /**
     * Get random bytes
     * @param  {Number} n Number of bytes
     * @return {Array}   Array of random bytes
     */
    async random(n) {
        return (null)
    }

    async random32() {
        return((await this.random(4)).readUInt32LE(0))
    }

     /**
     * Retrieve a SHA256 derivated class context
     * @return {signderivaDeviceSHA256} SHA256 class
     */
    sha256() {
        return (null)
    }

    /**
     * Retrieve a HMAC derivated class context
     * @return {signderivaDeviceHMAC} HMAC class
     */
    hmac() {
        return (null)
    }

    /**
     * Retrieve a ECDSA derivated class context
     * @return {signderivaDeviceECDSA} ECDSA class
     */
    ecdsa(curve) {
        return (null)
    }

    /**
     * Retrieve a ECDH derivated class context
     * @return {signderivaDeviceECDH} ECDH class
     */
    ecdh(curve) {
        return (null)
    }

    /**
     * Retrieve a AES 256 bits CBC derivated class context
     * @return {signderivaDeviceAES128CBC} aes128CBC class
     */
    cipherAES256CBC(key, iv) {
        return (null)
    }

    nextTick(cb) {
        setImmediate(cb)
    }

    /**
     * Check if the code is trustable
     * @param  {String} code Code to check
     * @return {Object} Information about the code
     */
    _trustable(code) {
        // get magic
        var pos = code.indexOf('\n');
        const magic = code.substr(0, pos).substr(3);
        if (!magic) {
            this.info("Boot - Invalid Magic Code");
            return (null);
        }
        var rest = code.substr(pos + 1)

        // get sender
        pos = rest.indexOf('\n');
        const sender = rest.substr(0, pos).substr(3);
        if (!sender) {
            this.info("Boot - Invalid Sender Signature");
            return (null);
        }
        rest = rest.substr(pos + 1)

        // get the hash
        pos = rest.indexOf('\n');
        const hash = rest.substr(0, pos).substr(3);
        if (!hash) {
            this.info("Boot - Invalid Hash");
            return (null);
        }
        rest = rest.substr(pos + 1)

        // get the DER
        pos = rest.indexOf('\n');
        const der = rest.substr(0, pos).substr(3);
        if (!der) {
            this.info("Boot - Invalid DER");
            return (null);
        }

        // get executable code
        const executable = rest.substr(pos + 1);

        // compute the hash
        const hashCtx = this.sha256();
        hashCtx.update(magic)
        hashCtx.update(sender)
        hashCtx.update(executable)
        const cHash = hashCtx.digest('hex')

        // compare hash
        if (hash != cHash) {
            this.error("Can not compare hashes, they are not the same");
            return (null);
        }

        // check if the key is trusted
        var trusted = false;
        var trustedKey = null;
        for (var a in trust.bigbang) {
            const bb = trust.bigbang[a];
            if (bb.dsa.public == sender) {
                trustedKey = bb;
                trusted = true;
                break;
            }
        }
        if (trusted !== true) {
            this.error("Can not use the following code because it is not trusted");
            return (null);
        }
        this.info("Found Trusted Key Booting from Bigbang Key " + trustedKey.name);

        // load the dsa key
        const skey = new key(this)
        skey.load(trustedKey)

        // check DSA der signature
        if (dsa.verify(skey, der, hash) !== true) {
            this.error("Untrustable Signderiva Seed");
            return (null);
        }

        this.info("Code version " + hash.substr(0, 8) + " is fully trustable");
        this.info("Magic: " + magic)
        this.info("Sender: " + sender.substr(0, 8 * 2))
        this.info("Hashes: " + hash.substr(0, 4 * 2) + " <> " + cHash.substr(0, 4 * 2))
        this.info("DER: " + der.substr(0, 8 * 2))

        return ({
            trust: trustedKey,
            magic: magic,
            sender: sender,
            hash: hash,
            der: der
        });
    }

    boot(memory, code) {
        const trustedCode = this._trustable(code)
        if (trustedCode === null) {
            this.error("Need to boot differently")
            return (false);
        }

        this.debug("Pivoting program to " + trustedCode.hash.substr(0, 4 * 2))
        eval(code)
    }
}

module.exports = signderivaDevice;
