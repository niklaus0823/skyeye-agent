import * as WebSocket from 'ws';
import * as v8Profiler from 'v8-profiler';
import * as v8Analytics from 'v8-analytics';
import {PacketModel} from '../model/packet/PacketModel';
import {API_TYPE} from '../const/CommandConst';
import {ShellTools} from '../common/Utility';

const EXEC_HEARTBEAT_TIME = 60 * 1000;
const EXEC_CPU_PROFILER_TIME = 30 * 1000;
const FUNCTIONS_ANALYSIS = {
    LONG_FUNCTIONS_LIMIT: 5,
    TOP_EXECUTING_FUNCTIONS: 5,
    BAILOUT_FUNCTIONS_LIMIT: 10
};

export namespace AgentAction {
    /**
     * 上报服务器状态
     *
     * @param {WebSocket} conn
     * @return {Promise<void>}
     */
    export function sendServerStat(conn: WebSocket) {
        if (isConnClose(conn)) return;

        // 获取服务器状态
        ShellTools.ps([process.pid], (err, stat) => {
            if (isConnClose(conn)) return;

            if (err) {
                console.log(err);
            } else {
                // {
                //   pid: 727,             // PID
                //   ppid: 312,            // PPID
                //   cpu: 10.0,            // percentage (from 0 to 100*vcore)
                //   ctime: 867000,        // ms user + system time
                //   elapsed: 6650000,     // ms since the start of the process
                //   timestamp: 864000000  // ms since epoch
                // }
                conn.send(PacketModel.create(API_TYPE.REPORT_SERVER_STAT, stat[process.pid]).format());
            }
        });

    }

    /**
     * 上报内存堆栈
     *
     * @param {WebSocket} conn
     */
    export function sendHeapSnapshot(conn: WebSocket) {
        if (isConnClose(conn)) return;

        let snapshot = v8Profiler.takeSnapshot();
        snapshot.export((err, res) => {
            if (isConnClose(conn)) return;

            if (err) {
                console.log(err);
            } else {
                snapshot.delete();
                conn.send(PacketModel.create(API_TYPE.REPORT_HEAP_SNAPSHOT, {data: res}).format());
            }
        });
    }

    /**
     * 开始 CPU Profiler
     *
     * @param {WebSocket} conn
     */
    export function startCpuProfiler(conn: WebSocket) {
        if (isConnClose(conn)) return;

        v8Profiler.startProfiling('', true);
        setTimeout(() => stopCpuProfiler(conn), EXEC_CPU_PROFILER_TIME);
    }

    /**
     * 结束 CPU Profiler，并上报
     *
     * @param {WebSocket} conn
     */
    function stopCpuProfiler(conn: WebSocket) {
        if (isConnClose(conn)) return;

        let profiler = v8Profiler.stopProfiling('');
        let res = {
            longFunctions: v8Analytics(profiler, 500, false, true, {limit: FUNCTIONS_ANALYSIS.LONG_FUNCTIONS_LIMIT}, filterFunction),
            topExecutingFunctions: v8Analytics(profiler, 1, false, true, {limit: FUNCTIONS_ANALYSIS.TOP_EXECUTING_FUNCTIONS}, filterFunction),
            bailoutFunctions: v8Analytics(profiler, null, true, true, {limit: FUNCTIONS_ANALYSIS.BAILOUT_FUNCTIONS_LIMIT}, filterFunction)
        };
        profiler.delete();
        conn.send(PacketModel.create(API_TYPE.REPORT_CPU_PROFILER, {data: res}).format());
    }

    /**
     * 方法过滤
     *
     * @param {string} filePath
     * @param {string} funcName
     * @return {boolean}
     */
    function filterFunction(filePath: string, funcName: string) {
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
    function isConnClose(conn: WebSocket) {
        if (conn == null || conn.readyState !== WebSocket.OPEN) {
            conn.close();
            return true;
        } else {
            return false;
        }
    }
}