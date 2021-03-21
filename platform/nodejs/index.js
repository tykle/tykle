const NodeJSDevice = require("./src/Device");
const NodeJSNetTcpServer = require("./src/NetTcpServer");
const NodeJSNetMcast = require("./src/NetMcast");

module.exports = {
    Device: NodeJSDevice,
    Net: {
        TCP: NodeJSNetTcpServer,
        MCAST: NodeJSNetMcast
    }
};
