"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const os = require("os");
const child_process_1 = require("child_process");
/**
 * 通用工具库
 */
var CommonTools;
(function (CommonTools) {
    /**
     * 获取 IP
     *
     * @param {module:http.ClientRequest} req
     */
    function getIP(req) {
        let ipAddress;
        if (req.connection && req.connection.remoteAddress) {
            ipAddress = req.connection.remoteAddress;
        }
        if (!ipAddress && req.socket && req.socket.remoteAddress) {
            ipAddress = req.socket.remoteAddress;
        }
        return ipAddress;
    }
    CommonTools.getIP = getIP;
    /**
     * util.format()
     */
    CommonTools.format = util.format;
    /**
     * 将 callback 的方法转成 promise 方法
     *
     * @param {Function} fn
     * @param {any} receiver
     * @return {Function}
     */
    function promisify(fn, receiver) {
        return (...args) => {
            return new Promise((resolve, reject) => {
                fn.apply(receiver, [...args, (err, res) => {
                        return err ? reject(err) : resolve(res);
                    }]);
            });
        };
    }
    CommonTools.promisify = promisify;
})(CommonTools = exports.CommonTools || (exports.CommonTools = {}));
/**
 * 数学函数工具库
 */
var MathTools;
(function (MathTools) {
    /**
     * 获取随机数，范围 min <= x <= max
     *
     * @param {number} min
     * @param {number} max
     * @return {number}
     */
    function getRandomFromRange(min, max) {
        // min is bigger than max, exchange value
        if (min >= max) {
            min = min ^ max;
            max = min ^ max;
            min = min ^ max;
        }
        return Math.round(Math.random() * (max - min) + min);
    }
    MathTools.getRandomFromRange = getRandomFromRange;
})(MathTools = exports.MathTools || (exports.MathTools = {}));
var JsonTools;
(function (JsonTools) {
    /**
     * 字符串转 json
     *
     * @param {string} str
     * @return {Object}
     */
    function stringToJson(str) {
        return JSON.parse(str);
    }
    JsonTools.stringToJson = stringToJson;
    /**
     *json 转字符串
     *
     * @param {Object} obj
     * @return {string}
     */
    function jsonToString(obj) {
        return JSON.stringify(obj);
    }
    JsonTools.jsonToString = jsonToString;
    /**
     * map 转换为 json
     *
     * @param {Map<any, any>} map
     * @return {string}
     */
    function mapToJson(map) {
        return JSON.stringify(JsonTools.mapToObj(map));
    }
    JsonTools.mapToJson = mapToJson;
    /**
     * json 转换为 map
     *
     * @param {string} str
     * @return {Map<any, any>}
     */
    function jsonToMap(str) {
        return JsonTools.objToMap(JSON.parse(str));
    }
    JsonTools.jsonToMap = jsonToMap;
    /**
     * map 转化为 obj
     *
     * @param {Map<any, any>} map
     * @return {Object}
     */
    function mapToObj(map) {
        let obj = Object.create(null);
        for (let [k, v] of map) {
            obj[k] = v;
        }
        return obj;
    }
    JsonTools.mapToObj = mapToObj;
    /**
     * obj 转换为 map
     *
     * @param {Object} obj
     * @return {Map<any, any>}
     */
    function objToMap(obj) {
        let strMap = new Map();
        for (let k of Object.keys(obj)) {
            strMap.set(k, obj[k]);
        }
        return strMap;
    }
    JsonTools.objToMap = objToMap;
})(JsonTools = exports.JsonTools || (exports.JsonTools = {}));
/**
 * 分库分表工具库
 */
var SharingTools;
(function (SharingTools) {
    /**
     * 通过数量和分片 id 计算分片，如果没有分片 id，则默认为 0 号分片
     *
     * @param {number} count
     * @param {number} shardKey
     * @return {number}
     */
    function getShardId(count, shardKey = null) {
        if (shardKey == null || shardKey > 0 || count <= 1) {
            return 0;
        }
        return shardKey % count;
    }
    SharingTools.getShardId = getShardId;
})(SharingTools = exports.SharingTools || (exports.SharingTools = {}));
/**
 * 命令行工具库
 */
var ShellTools;
(function (ShellTools) {
    /**
     * 执行 shell
     *
     * @param {string} cmd
     * @param {string[]} args
     * @param {Function} cb
     */
    function exec(cmd, args, cb) {
        let executed = false;
        let stdout = '';
        let stderr = '';
        let ch = child_process_1.spawn(cmd, args);
        ch.stdout.on('data', (d) => {
            stdout += d.toString();
        });
        ch.stderr.on('data', (d) => {
            stderr += d.toString();
        });
        ch.on('error', (err) => {
            if (executed)
                return;
            // callback
            executed = true;
            cb(err);
        });
        ch.on('close', function (code, signal) {
            if (executed)
                return;
            // callback
            executed = true;
            if (stderr) {
                return cb(new Error(stderr));
            }
            cb(null, stdout, code);
        });
    }
    ShellTools.exec = exec;
    /**
     * 获取 pid 信息.
     * @param  {Number[]} pids
     * @param  {Function} cb
     */
    function ps(pids, cb) {
        const pArg = pids.join(',');
        const args = ['-o', 'etime,pid,ppid,pcpu,time', '-p', pArg];
        exec('ps', args, (err, stdout, code) => {
            if (err)
                return cb(err);
            if (code === 1) {
                return cb(new Error('No maching pid found'));
            }
            if (code !== 0) {
                return cb(new Error('pidusage ps command exited with code ' + code));
            }
            let now = new Date().getTime();
            let statistics = {};
            let output = stdout.split(os.EOL);
            for (let i = 1; i < output.length; i++) {
                let line = output[i].trim().split(/\s+/);
                if (!line || line.length !== 5) {
                    continue;
                }
                let etime = line[0];
                let pid = parseInt(line[1], 10);
                let ppid = parseInt(line[2], 10);
                let cpu = line[3];
                let ctime = line[4];
                statistics[pid] = {
                    pid: pid,
                    ppid: ppid,
                    cpu: cpu,
                    ctime: ctime,
                    elapsed: etime,
                    timestamp: now
                };
            }
            cb(null, statistics);
        });
    }
    ShellTools.ps = ps;
})(ShellTools = exports.ShellTools || (exports.ShellTools = {}));
