Skyeye
=========================
Process monitor for Node.js, Only support for Node 8+.

# Skyeye-cli

Based on v8-profiler-node8@5.7.0, Solved the v8-profiler segment fault error in node 8.x

Now also Supported node 10.x

## Install

```bash
node -v // 8.11.1 , Only support for Node 8+
npm install skyeye-cli -g
```

## How to use
1. Configure the central node server information

```bash
skyeye config

# prompt: host:  (0.0.0.0) 
# prompt: port:  (8080) // Register Server Port = 8081
# prompt: password:  (1q2w3e4r) 
# prompt: redis_host:  (127.0.0.1) 
# prompt: redis_port:  (6379) 
```

2. Start the central node server
> When you run this command, the **WebSockt Server** and **Register Server** are started

```bash
skyeye start

# Start WebSocket Server！PID:719
# Start Register Server！PID:720
```

3. Get the Agent secret key

```bash
curl http://127.0.0.1:8081/127.0.0.1/1533038565835/19561612

# AgentIp = 127.0.0.1
# Timestamp = 1533038565835
# Token = md5(1q2w3e4r,127.0.0.1,1533038565835)
# http://127.0.0.1:8081/${AgentIp}/${Timestamp}/${Token}
# {"code":0,"token":"bd864703"}
```

# Skyeye-agent

## Install

```bash
npm install skyeye-agent --save
```

> Error reporting during installation like：**g++: command not found** ，please install gcc，gcc+，gcc-c++ first