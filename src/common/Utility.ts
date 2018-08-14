import * as http from 'http';
import * as util from 'util';
import * as os from "os";
import {spawn} from "child_process";

export interface SettingSchema {
    host: string;
    port: number;
    password: string;
    redis_host: string;
    redis_port: number;
}

/**
 * 通用工具库
 */
export namespace CommonTools {
    /**
     * 获取 IP
     *
     * @param {module:http.ClientRequest} req
     */
    export function getIP(req: http.ClientRequest) {
        let ipAddress;
        if (req.connection && req.connection.remoteAddress) {
            ipAddress = req.connection.remoteAddress;
        }

        if (!ipAddress && req.socket && req.socket.remoteAddress) {
            ipAddress = req.socket.remoteAddress;
        }
        return ipAddress;
    }

    /**
     * util.format()
     */
    export const format = util.format;

    /**
     * 将 callback 的方法转成 promise 方法
     *
     * @param {Function} fn
     * @param {any} receiver
     * @return {Function}
     */
    export function promisify(fn: Function, receiver: any): (...args) => Promise<any> {
        return (...args) => {
            return new Promise((resolve, reject) => {
                fn.apply(receiver, [...args, (err, res) => {
                    return err ? reject(err) : resolve(res);
                }]);
            });
        };
    }
}

/**
 * 数学函数工具库
 */
export namespace MathTools {
    /**
     * 获取随机数，范围 min <= x <= max
     *
     * @param {number} min
     * @param {number} max
     * @return {number}
     */
    export function getRandomFromRange(min: number, max: number): number {
        // min is bigger than max, exchange value
        if (min >= max) {
            min = min ^ max;
            max = min ^ max;
            min = min ^ max;
        }

        return Math.round(Math.random() * (max - min) + min);
    }
}

export namespace JsonTools {
    /**
     * 字符串转 json
     *
     * @param {string} str
     * @return {Object}
     */
    export function stringToJson(str: string): Object {
        return JSON.parse(str);
    }

    /**
     *json 转字符串
     *
     * @param {Object} obj
     * @return {string}
     */
    export function jsonToString(obj: Object): string {
        return JSON.stringify(obj);
    }

    /**
     * map 转换为 json
     *
     * @param {Map<any, any>} map
     * @return {string}
     */
    export function mapToJson(map: Map<any, any>): string {
        return JSON.stringify(JsonTools.mapToObj(map));
    }

    /**
     * json 转换为 map
     *
     * @param {string} str
     * @return {Map<any, any>}
     */
    export function jsonToMap(str: string): Map<any, any> {
        return JsonTools.objToMap(JSON.parse(str));
    }

    /**
     * map 转化为 obj
     *
     * @param {Map<any, any>} map
     * @return {Object}
     */
    export function mapToObj(map: Map<any, any>): Object {
        let obj = Object.create(null);
        for (let [k, v] of map) {
            obj[k] = v;
        }
        return obj;
    }

    /**
     * obj 转换为 map
     *
     * @param {Object} obj
     * @return {Map<any, any>}
     */
    export function objToMap(obj: Object): Map<any, any> {
        let strMap = new Map();
        for (let k of Object.keys(obj)) {
            strMap.set(k, obj[k]);
        }
        return strMap;
    }
}

/**
 * 分库分表工具库
 */
export namespace SharingTools {

    /**
     * 通过数量和分片 id 计算分片，如果没有分片 id，则默认为 0 号分片
     *
     * @param {number} count
     * @param {number} shardKey
     * @return {number}
     */
    export function getShardId(count: number, shardKey: number = null) {
        if (shardKey == null || shardKey > 0 || count <= 1) {
            return 0;
        }
        return shardKey % count;
    }
}

/**
 * 命令行工具库
 */
export namespace ShellTools {

    /**
     * 执行 shell
     *
     * @param {string} cmd
     * @param {string[]} args
     * @param {Function} cb
     */
    export function exec(cmd: string, args: string[], cb: (err: Error, stdout?: string, code?: number) => void) {
        let executed = false;
        let stdout = '';
        let stderr = '';

        let ch = spawn(cmd, args);
        ch.stdout.on('data', (d) => {
            stdout += d.toString();
        });

        ch.stderr.on('data', (d) => {
            stderr += d.toString();
        });

        ch.on('error', (err: Error) => {
            if (executed) return;
            // callback
            executed = true;
            cb(err);
        });

        ch.on('close', function (code, signal) {
            if (executed) return;

            // callback
            executed = true;
            if (stderr) {
                return cb(new Error(stderr));
            }

            cb(null, stdout, code);
        });
    }

    /**
     * 获取 pid 信息.
     * @param  {Number[]} pids
     * @param  {Function} cb
     */
    export function ps(pids: number[], cb: (err: Error, stat?: any) => void) {
        const pArg = pids.join(',');
        const args = ['-o', 'etime,pid,ppid,pcpu,time', '-p', pArg];

        exec('ps', args, (err: Error, stdout: string, code: number) => {
            if (err) return cb(err);
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
}