"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const usage = require("pidusage");
const v8Profiler = require("v8-profiler");
const v8Analytics = require("v8-analytics");
const PacketModel_1 = require("../model/packet/PacketModel");
const EXEC_HEARTBEAT_TIME = 60 * 1000;
const EXEC_CPU_PROFILER_TIME = 30 * 1000;
const FUNCTIONS_ANALYSIS = {
    LONG_FUNCTIONS_LIMIT: 5,
    TOP_EXECUTING_FUNCTIONS: 5,
    BAILOUT_FUNCTIONS_LIMIT: 10
};
var AgentAction;
(function (AgentAction) {
    /**
     * 上报服务器状态
     *
     * @param {WebSocket} conn
     * @return {Promise<void>}
     */
    function sendServerStat(conn) {
        if (isConnClose(conn))
            return;
        // 获取服务器状态
        usage(process.pid, (err, stat) => {
            if (isConnClose(conn))
                return;
            if (err) {
                console.log(err);
            }
            else {
                // {
                //   cpu: 10.0,            // percentage (from 0 to 100*vcore)
                //   memory: 357306368,    // bytes
                //   ppid: 312,            // PPID
                //   pid: 727,             // PID
                //   ctime: 867000,        // ms user + system time
                //   elapsed: 6650000,     // ms since the start of the process
                //   timestamp: 864000000  // ms since epoch
                // }
                // Fixme in OSX, cpu percentage is wrong. maybe it will < 0
                console.log(stat);
                if (stat.cpu < 0 || stat.cpu > 100) {
                    stat.cpu = 100; // cpu 繁忙，所以
                }
                conn.send(PacketModel_1.PacketModel.create(101 /* REPORT_SERVER_STAT */, stat).format());
            }
        });
    }
    AgentAction.sendServerStat = sendServerStat;
    /**
     * 上报内存堆栈
     *
     * @param {WebSocket} conn
     */
    function sendHeapSnapshot(conn) {
        if (isConnClose(conn))
            return;
        let snapshot = v8Profiler.takeSnapshot();
        snapshot.export((err, res) => {
            if (isConnClose(conn))
                return;
            if (err) {
                console.log(err);
            }
            else {
                snapshot.delete();
                conn.send(PacketModel_1.PacketModel.create(301 /* REPORT_HEAP_SNAPSHOT */, { data: res }).format());
            }
        });
    }
    AgentAction.sendHeapSnapshot = sendHeapSnapshot;
    /**
     * 开始 CPU Profiler
     *
     * @param {WebSocket} conn
     */
    function startCpuProfiler(conn) {
        if (isConnClose(conn))
            return;
        v8Profiler.startProfiling('', true);
        setTimeout(() => stopCpuProfiler(conn), EXEC_CPU_PROFILER_TIME);
    }
    AgentAction.startCpuProfiler = startCpuProfiler;
    /**
     * 结束 CPU Profiler，并上报
     *
     * @param {WebSocket} conn
     */
    function stopCpuProfiler(conn) {
        if (isConnClose(conn))
            return;
        let profiler = v8Profiler.stopProfiling('');
        let res = {
            longFunctions: v8Analytics(profiler, 500, false, true, { limit: FUNCTIONS_ANALYSIS.LONG_FUNCTIONS_LIMIT }, filterFunction),
            topExecutingFunctions: v8Analytics(profiler, 1, false, true, { limit: FUNCTIONS_ANALYSIS.TOP_EXECUTING_FUNCTIONS }, filterFunction),
            bailoutFunctions: v8Analytics(profiler, null, true, true, { limit: FUNCTIONS_ANALYSIS.BAILOUT_FUNCTIONS_LIMIT }, filterFunction)
        };
        profiler.delete();
        conn.send(PacketModel_1.PacketModel.create(201 /* REPORT_CPU_PROFILER */, { data: res }).format());
    }
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
    /**
     * 检查链接状态
     *
     * @return {boolean}
     */
    function isConnClose(conn) {
        if (conn == null || conn.readyState !== WebSocket.OPEN) {
            conn.close();
            return true;
        }
        else {
            return false;
        }
    }
})(AgentAction = exports.AgentAction || (exports.AgentAction = {}));
