const NodeJSDevice = require("./src/Device");
const NodeJSNetTcpServer = require("./src/NetTcpServer");

module.exports = {
    Device: NodeJSDevice,
    Net: {
        TCP: NodeJSNetTcpServer
    }
};
