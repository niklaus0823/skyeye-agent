"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LibOs = require("os");
const LibFs = require("mz/fs");
const v8Profiler = require("v8-profiler");
const v8Analytics = require("v8-analytics");
const child_process_1 = require("child_process");
/**
 * 通用工具库
 */
var CommonTools;
(function (CommonTools) {
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
            let output = stdout.split(LibOs.EOL);
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
/**
 * 分析工具库
 */
var ProfilerTools;
(function (ProfilerTools) {
    /**
     * 获取服务器状态
     *
     * @return {Promise<any>}
     */
    function serverStat() {
        return new Promise((resolve, reject) => {
            ShellTools.ps([process.pid], (err, stat) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!stat.hasOwnProperty(process.pid)) {
                    reject(`process.pid not found, pid:${process.pid}`);
                    return;
                }
                resolve(stat[process.pid]);
            });
        });
    }
    ProfilerTools.serverStat = serverStat;
    /**
     * 导出内存快照
     *
     * @return {Promise<any>}
     */
    function heapSnapshot() {
        return new Promise((resolve, reject) => {
            let snapshot = v8Profiler.takeSnapshot();
            snapshot.export()
                .pipe(LibFs.createWriteStream(`/tmp/snapshot_${new Date().getTime()}.json`))
                .on('finish', () => {
                snapshot.delete;
                resolve();
            })
                .on('error', (err) => {
                reject(err);
            });
        });
    }
    ProfilerTools.heapSnapshot = heapSnapshot;
    /**
     * CPU Profiler 分析
     *
     * @param {number} timeout , default timeout 100000
     * @return {Promise<any>}
     */
    function cpuProfiler(timeout = 100000) {
        // 默认参数
        const LONG_FUNCTIONS_LIMIT = 5;
        const TOP_EXECUTING_FUNCTIONS = 5;
        const BAILOUT_FUNCTIONS_LIMIT = 10;
        return new Promise((resolve, reject) => {
            // 开始分析
            v8Profiler.startProfiling('', true);
            // 设置一个时间长度，到达结束时间，关闭分析并导出
            setTimeout(() => {
                let profiler = v8Profiler.stopProfiling('');
                let profilerResponse = {
                    longFunctions: v8Analytics(profiler, 500, false, true, { limit: LONG_FUNCTIONS_LIMIT }, filterFunction),
                    topExecutingFunctions: v8Analytics(profiler, 1, false, true, { limit: TOP_EXECUTING_FUNCTIONS }, filterFunction),
                    bailoutFunctions: v8Analytics(profiler, null, true, true, { limit: BAILOUT_FUNCTIONS_LIMIT }, filterFunction)
                };
                profiler.delete();
                resolve(profilerResponse);
            }, timeout);
        });
    }
    ProfilerTools.cpuProfiler = cpuProfiler;
    /**
     * 方法过滤
     *
     * @param {string} filePath
     * @param {string} funcName
     * @return {boolean}
     */
    function filterFunction(filePath, funcName) {
        //if filePath or funcName has ignore string
        let needIgnore = ['node_modules', 'anonymous'].some(fileName => {
            return Boolean(~(filePath.indexOf(fileName))) || Boolean(~(funcName.indexOf(fileName)));
        });
        //the string filePath must have
        let mustHave = ['/'].every(fileName => {
            return Boolean(~filePath.indexOf(fileName));
        });
        return !needIgnore && mustHave;
    }
})(ProfilerTools = exports.ProfilerTools || (exports.ProfilerTools = {}));
