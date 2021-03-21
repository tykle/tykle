#!/usr/bin/env node

const sc = require('subcommander');
const chalk = require('chalk');
const { crc32 } = require('crc');

function rrdfs(chan) {
    const rec = 120;
    var track = crc32(chan);
    var r = (track >> 16) & 0xff;
    var g = (track >> 8) & 0xff;
    var b = (track >> 0) & 0xff;

    if (r < rec) r = rec + r;
    if (g < rec) g = rec + g;
    if (b < rec) b = rec + b;

    // console.log(r, g, b)
    return (chalk.rgb(r, g, b));
}

console.pretty = function (msg) {
    const step = 2;

    function rec(list, level) {
        level = level || 0;
        level++;
        try {
            // write 
            for (var k in list) {
                const item = list[k];
                if (typeof item != "object" && typeof item != "function") {
                    console.log(`${' '.repeat(step * level)} ${rrdfs(item.constructor.name)(k)}: ${item}`);
                }
            }

            for (var k in list) {
                const item = list[k];
                if (typeof item == "object") {
                    if (item instanceof Array) {
                        console.log(`${' '.repeat(step * level)} ${rrdfs('array')(k+'[]')}`);
                        rec(item, level);
                    }
                    else if (item) {
                        switch (item.constructor.name) {
                            case 'Buffer':
                                console.log(`${' '.repeat(step * level)} ${rrdfs(item.constructor.name)(k)}: ${rrdfs(item.toString("hex"))(item.toString("hex"))}`);
                                break;
                            default:
                                console.log(`${' '.repeat(step * level)} ${rrdfs(item.constructor.name)(k)}`);
                                rec(item, level);
                                break;
                        }

                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    }
    rec(msg);
}

require("./run")
require("./wallet")
require("./lcd")
require("./discovery")

sc.parse()