"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const PacketModel_1 = require("./model/PacketModel");
const AgentAction_1 = require("./action/AgentAction");
const debug = require('debug')('DEBUG:');
const TRY_FAIL_COUNT = 3; // 链接失败，尝试次数。
const TRY_FAIL_SLEEP = 3600000; // 链接失败，并且尝试次数达到上线，睡眠 3600 秒后再次发起请求。
const TRY_FAIL_TIMEOUT = 60000; // 链接失败过期时间，60秒
class Agent {
    constructor() {
        this._try = 0;
        this._locked = false;
        this._initialized = false;
    }
    /**
     * Agent 启动
     *
     * @param {string} host
     * @param {number} port
     * @param {string} secret
     * @param {string} name
     * @param {number} checkInterval 检查间隔：10 秒
     * @param {number} withHeartbeat 是否携带心跳包
     */
    start(host, port, secret, name = null, checkInterval = 10000, withHeartbeat = false) {
        this._options = {
            host: host,
            port: port,
            secret: secret,
            name: (!name) ? process.pid : name,
            checkInterval: checkInterval,
            withHeartbeat: withHeartbeat,
        };
        this._initialized = true;
        this._connect();
    }
    /**
     * 向中心节点发起链接
     *
     * @return {void}
     */
    _connect() {
        try {
            debug('[agent] connect start!');
            // 连接中心节点
            this._conn = new WebSocket(`ws://${this._options.host}:${this._options.port}`, {
                headers: {
                    name: this._options.name,
                    token: this._options.secret
                }
            });
            this._conn.on('open', () => {
                try {
                    debug('[agent] connect succeed!');
                    this._unlock();
                    this._heathCheck();
                }
                catch (e) {
                    debug(e);
                }
            });
            this._conn.on('message', (message) => {
                console.log(message);
                if (typeof message == 'number') {
                    console.log(message);
                    return;
                }
                try {
                    let packet = PacketModel_1.PacketModel.parse(message);
                    switch (packet.type) {
                        case 100 /* EXEC_SERVER_STAT */:
                            AgentAction_1.AgentAction.serverStat(this._conn);
                            break;
                        case 300 /* EXEC_HEAP_SNAPSHOT */:
                            AgentAction_1.AgentAction.heapSnapshot(this._conn);
                            break;
                        case 200 /* EXEC_CPU_PROFILER */:
                            AgentAction_1.AgentAction.cpuProfiler(this._conn);
                            break;
                    }
                }
                catch (e) {
                    debug(e);
                }
            });
            this._conn.on('error', (e) => {
                debug('[agent] connect error, msg:' + e.message);
            });
            this._conn.on('close', (code) => {
                debug('[agent] connect close, code:' + code);
                this._unlock();
                this._reconnect();
            });
        }
        catch (e) {
            debug('[agent] create connect error, msg:' + e.message);
        }
    }
    /**
     * 断线重连
     *
     * @private
     */
    _reconnect() {
        // 连接中，请勿重复创建连接
        if (this._locked == true) {
            return;
        }
        this._lock();
        // 超过重连次数，则进入睡眠
        let timeout = this._options.checkInterval;
        if (this._try > TRY_FAIL_COUNT) {
            this._try = 0;
            timeout = TRY_FAIL_SLEEP;
        }
        setTimeout(() => this._connect(), timeout);
    }
    /**
     * 连接健康检查
     *
     * @private
     */
    _heathCheck() {
        if (!this._conn || this._conn.readyState !== WebSocket.OPEN) {
            this._conn.close();
            return;
        }
        // 判断是否发送心跳包
        // if (this._options.withHeartbeat == true) {
        //     AgentAction.sendServerStat(this._conn);
        // }
        // 设置倒计时，准备下一次检测
        setTimeout(() => this._heathCheck(), this._options.checkInterval);
    }
    /**
     * 设置锁定，禁止重连
     *
     * @private
     */
    _lock() {
        this._locked = true;
        this._try++;
        this._tid = setTimeout(() => this._clear(), TRY_FAIL_TIMEOUT); // 超时清除
    }
    /**
     * 解除锁定
     *
     * @private
     */
    _unlock() {
        this._locked = false;
        clearTimeout(this._tid);
    }
    /**
     * 清除 Timeout
     *
     * @private
     */
    _clear() {
        this._try = 0;
        this._locked = false;
    }
}
exports.default = new Agent();
