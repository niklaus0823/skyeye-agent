"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const PacketModel_1 = require("../model/PacketModel");
const Utility_1 = require("../common/Utility");
var AgentAction;
(function (AgentAction) {
    /**
     * 上报服务器状态
     *
     * @param {WebSocket} conn
     * @return {Promise<void>}
     */
    function serverStat(conn) {
        return Utility_1.ProfilerTools.serverStat()
            .then((stat) => {
            if (isConnClose(conn))
                return;
            conn.send(PacketModel_1.PacketModel.create(101 /* REPORT_SERVER_STAT */, { res: stat }).format());
        })
            .catch((err) => {
            console.log(err);
        });
    }
    AgentAction.serverStat = serverStat;
    /**
     * 内存快照
     *
     * @param {WebSocket} conn
     */
    function heapSnapshot(conn) {
        return Utility_1.ProfilerTools.heapSnapshot()
            .then((snapshot) => {
            if (isConnClose(conn))
                return;
            conn.send(PacketModel_1.PacketModel.create(301 /* REPORT_HEAP_SNAPSHOT */, { res: snapshot }).format());
        })
            .catch((err) => {
            console.log(err);
        });
    }
    AgentAction.heapSnapshot = heapSnapshot;
    /**
     * CPU Profiler 分析
     *
     * @param {WebSocket} conn
     * @param {PacketModel} packet
     */
    function cpuProfiler(conn, packet) {
        const body = packet.body;
        return Utility_1.ProfilerTools.cpuProfiler(body.timeout)
            .then((res) => {
            if (isConnClose(conn))
                return;
            conn.send(PacketModel_1.PacketModel.create(201 /* REPORT_CPU_PROFILER */, { res: res }).format());
        })
            .catch((err) => {
            console.log(err);
        });
    }
    AgentAction.cpuProfiler = cpuProfiler;
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
