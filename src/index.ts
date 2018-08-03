import * as WebSocket from 'ws';
import {PacketModel} from './model/packet/PacketModel';
import {API_TYPE} from './const/CommandConst';
import {AgentAction} from './action/AgentAction';

const debug = require('debug')('DEBUG:Agent');

const TRY_FAIL_COUNT = 3; // 链接失败，尝试次数。
const TRY_FAIL_TIMEOUT = 60000; // 链接失败过期时间，60秒
const TRY_FAIL_SLEEP = 3600000; // 链接失败，并且尝试次数达到上线，睡眠 3600 秒后再次发起请求。

interface AgentOptions {
    host: string,
    port: number,
    secret: string,
    name: string,
    checkInterval: number,
    withHeartbeat: boolean,
}

class Agent {
    private _initialized: boolean;
    private _conn: WebSocket;
    private _options: AgentOptions;
    private _tryCount: number;
    private _tryConnecting: boolean;

    // private _lockProfiling: boolean;
    // private _heathCheckTimeoutObj: any;
    // private _lockConnectingTimeoutObj: any;

    constructor() {
        this._initialized = false;
        this._tryCount = 0;
        this._tryConnecting = false;

        // this._lockConnecting = false;
        // this._lockProfiling = false;
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
    public start(host: string, port: number, secret: string, name: string = 'agent', checkInterval: number = 10000, withHeartbeat: boolean = true) {
        this._options = {
            host: host,
            port: port,
            secret: secret,
            name: name + '-' + process.pid,
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
    private _connect() {
        try {
            debug('[skyeye-agent] connect start!');

            this._conn = new WebSocket(`ws://${this._options.host}:${this._options.port}`, {
                headers: {
                    name: this._options.name,
                    token: this._options.secret
                }
            });

            this._conn.on('open', () => {
                try {
                    debug('[skyeye-agent] connect succeed!');
                    this._heathCheck();
                } catch (e) {
                    debug(e);
                }
            });

            this._conn.on('message', (message: string | number) => {
                if (typeof message == 'number') {
                    console.log(message);
                    return;
                }

                try {
                    let packet = PacketModel.parse(message);
                    switch (packet.type) {
                        case API_TYPE.EXEC_SERVER_STAT:
                            AgentAction.sendServerStat(this._conn);
                            break;
                        case API_TYPE.EXEC_HEAP_SNAPSHOT:
                            AgentAction.sendHeapSnapshot(this._conn);
                            break;
                        case API_TYPE.EXEC_CPU_PROFILER:
                            AgentAction.startCpuProfiler(this._conn);
                            break;
                    }
                } catch (e) {
                    debug(e);
                }
            });

            this._conn.on('error', (e) => {
                debug('[skyeye-agent] connect error, msg:' + e.message);
                this._reconnect();
            });

            this._conn.on('close', (code, msg) => {
                debug('[skyeye-agent] connect close, code:' + code + ', msg' + msg);
                this._reconnect();
            });
        } catch (e) {
            debug('[skyeye-agent] create connect error, msg:' + e.message);
            this._reconnect();
        }
    }

    /**
     * 断线重连
     *
     * @private
     */
    private _reconnect() {
        // 避免重复连接
        debug('[skyeye-agent] reconnect start, try:' + this._tryCount);
        if (this._tryConnecting == true) {
            return;
        }
        this._tryCount++;
        this._tryConnecting = true;

        // 没连接上会一直重连，设置延迟避免请求过多
        let _this = this;
        let timeout = (this._tryCount > TRY_FAIL_COUNT) ? TRY_FAIL_SLEEP : this._options.checkInterval;

        setTimeout(() => {
            _this._tryConnecting = false;
            _this._connect();
        }, timeout);

        // tryCount 60 秒清空
        setTimeout(() => {
            _this._tryCount = 0;
            _this._tryConnecting = false;
        }, TRY_FAIL_TIMEOUT);
    }

    /**
     * 连接健康检查
     *
     * @private
     */
    private _heathCheck() {
        if (!this._conn || this._conn.readyState !== WebSocket.OPEN) {
            this._conn.close();
            return;
        }

        // 判断是否发送心跳包
        if (this._options.withHeartbeat == true) {
            AgentAction.sendServerStat(this._conn);
        }

        // 设置倒计时，准备下一次检测
        setTimeout(() => this._heathCheck(), this._options.checkInterval);
    }
}

export default new Agent();