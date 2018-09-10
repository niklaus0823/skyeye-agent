import * as WebSocket from 'ws';
import {PacketModel} from '../model/PacketModel';
import {ProfilerTools} from '../common/Utility';

// 消息类型
export const enum API_TYPE {
    EXEC_SERVER_STAT = 100,  // 通知 Agent 上报服务器状态
    REPORT_SERVER_STAT = 101,  // 收集 Agent 上报的服务器状态
    EXEC_CPU_PROFILER = 200,  // 通知 Agent 上报 CPU_PROFILER  数据
    REPORT_CPU_PROFILER = 201,  // 收集 Agent 上报的 CPU_PROFILER  数据
    EXEC_HEAP_SNAPSHOT = 300,  // 通过 Agent 上报 HEAP_SNAPSHOT 数据
    REPORT_HEAP_SNAPSHOT = 301,  // 收集 Agent 上报的 HEAP_SNAPSHOT 数据
}

export namespace AgentAction {
    /**
     * 上报服务器状态
     *
     * @param {WebSocket} conn
     * @return {Promise<void>}
     */
    export function serverStat(conn: WebSocket) {
        ProfilerTools.serverStat()
            .then((stat) => {
                if (isConnClose(conn)) return;
                conn.send(PacketModel.create(API_TYPE.REPORT_SERVER_STAT, {code: 0, data: stat}).format());
            })
            .catch((err) => {
                console.log(err);
            });
    }

    /**
     * 内存快照
     *
     * @param {WebSocket} conn
     */
    export function heapSnapshot(conn: WebSocket) {
        ProfilerTools.heapSnapshot()
            .then((stat) => {
                if (isConnClose(conn)) return;
                conn.send(PacketModel.create(API_TYPE.REPORT_HEAP_SNAPSHOT, {code: 0, data: stat}).format());
            })
            .catch((err) => {
                console.log(err);
            });
    }

    /**
     * CPU Profiler 分析
     *
     * @param {WebSocket} conn
     */
    export function cpuProfiler(conn: WebSocket) {
        ProfilerTools.cpuProfiler()
            .then((res) => {
                if (isConnClose(conn)) return;
                conn.send(PacketModel.create(API_TYPE.REPORT_CPU_PROFILER, {code: 0, data: res}).format());
            })
            .catch((err) => {
                console.log(err);
            });
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