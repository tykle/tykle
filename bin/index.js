#!/usr/bin/env node

const sc = require('subcommander');

console.pretty = function (msg) {
    console.log(msg)
}

require("./run")
require("./wallet")
require("./lcd")

sc.parse()