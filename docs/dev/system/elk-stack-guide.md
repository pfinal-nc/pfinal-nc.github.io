---
title: "ELK 日志系统实战指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 ELK Stack（Elasticsearch、Logstash、Kibana）日志系统，掌握日志收集、处理、存储和可视化的完整流程，构建企业级日志分析平台。"
keywords:
  - ELK
  - Elasticsearch
  - Logstash
  - Kibana
  - 日志系统
  - 日志分析
  - Filebeat
tags:
  - elk
  - elasticsearch
  - logging
  - devops
---

# ELK 日志系统实战指南

ELK Stack 是一套开源的日志分析解决方案，由 Elasticsearch、Logstash 和 Kibana 三个核心组件组成，帮助企业实现日志的集中收集、处理和可视化。

## 什么是 ELK Stack

### 核心组件

| 组件 | 功能 | 作用 |
|------|------|------|
| **Elasticsearch** | 搜索引擎 | 存储和检索日志数据 |
| **Logstash** | 数据处理管道 | 收集、处理和转发日志 |
| **Kibana** | 可视化平台 | 搜索、分析和可视化日志 |
| **Beats** | 数据发送器 | 轻量级日志收集器 |

### 数据流

```
┌──────────┐    ┌──────────┐    ┌───────────────┐    ┌──────────┐
│  App Log │───▶│ Filebeat │───▶│   Logstash    │───▶│   ES     │
│  Syslog  │    │          │    │ (Parse/Filter)│    │ (Store)  │
│  Docker  │    └──────────┘    └───────────────┘    └────┬─────┘
└──────────┘                                               │
                                                           ▼
                                                    ┌──────────┐
                                                    │  Kibana  │
                                                    │(Visual)  │
                                                    └──────────┘
```

## 快速部署

### Docker Compose 部署

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    networks:
      - elk

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: logstash
    volumes:
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
      - "5000:5000/tcp"
      - "5000:5000/udp"
      - "9600:9600"
    environment:
      LS_JAVA_OPTS: "-Xmx256m -Xms256m"
    networks:
      - elk
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - elk
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    container_name: filebeat
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    networks:
      - elk
    depends_on:
      - logstash

volumes:
  es-data:
    driver: local

networks:
  elk:
    driver: bridge
```

## Filebeat 配置

### 基础配置

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/*.log
    - /var/log/nginx/*.log
  fields:
    service: nginx
    environment: production
  fields_under_root: true
  multiline.pattern: '^\['
  multiline.negate: true
  multiline.match: after

- type: docker
  enabled: true
  containers.ids: '*'
  containers.path: "/var/lib/docker/containers"
  containers.stream: "all"
  processors:
    - add_docker_metadata:
        host: "unix:///var/run/docker.sock"

output.logstash:
  hosts: ["logstash:5044"]
  enabled: true

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

### Kubernetes 配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
    
    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch}:${ELASTICSEARCH_PORT:9200}']
      username: ${ELASTICSEARCH_USERNAME}
      password: ${ELASTICSEARCH_PASSWORD}
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
spec:
  selector:
    matchLabels:
      app: filebeat
  template:
    metadata:
      labels:
        app: filebeat
    spec:
      serviceAccountName: filebeat
      containers:
      - name: filebeat
        image: docker.elastic.co/beats/filebeat:8.11.0
        args: ["-c", "/etc/filebeat.yml", "-e"]
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: config
          mountPath: /etc/filebeat.yml
          subPath: filebeat.yml
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: filebeat-config
      - name: varlog
        hostPath:
          path: /var/log
```

## Logstash 配置

### 管道配置

```ruby
# logstash/pipeline/logstash.conf
input {
  beats {
    port => 5044
  }
  
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  # 解析 JSON 日志
  if [message] =~ "^\\{" {
    json {
      source => "message"
      target => "parsed"
    }
  }
  
  # Grok 解析 Nginx 日志
  if [service] == "nginx" {
    grok {
      match => { 
        "message" => '%{COMBINEDAPACHELOG}' 
      }
    }
    
    date {
      match => [ "timestamp", "dd/MMM/yyyy:HH:mm:ss Z" ]
      target => "@timestamp"
    }
    
    mutate {
      convert => {
        "response" => "integer"
        "bytes" => "integer"
      }
    }
  }
  
  # 解析应用日志
  if [service] == "app" {
    grok {
      match => {
        "message" => "%{TIMESTAMP_ISO8601:log_timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}"
      }
    }
    
    if [level] == "ERROR" {
      mutate {
        add_tag => ["error"]
      }
    }
  }
  
  # 添加 GeoIP 信息
  if [clientip] {
    geoip {
      source => "clientip"
      target => "geoip"
    }
  }
  
  # 删除无用字段
  mutate {
    remove_field => ["message", "host", "agent", "ecs", "input", "log"]
  }
}

output {
  # 根据服务类型路由到不同索引
  if [service] == "nginx" {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      index => "nginx-%{+YYYY.MM.dd}"
    }
  } else if [service] == "app" {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      index => "app-%{+YYYY.MM.dd}"
    }
  } else {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      index => "logs-%{+YYYY.MM.dd}"
    }
  }
  
  # 调试输出
  stdout {
    codec => rubydebug
  }
}
```

## Elasticsearch 配置

### 索引模板

```json
PUT _index_template/app-logs
{
  "index_patterns": ["app-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy",
      "index.lifecycle.rollover_alias": "app-logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "level": {
          "type": "keyword"
        },
        "service": {
          "type": "keyword"
        },
        "message": {
          "type": "text",
          "analyzer": "standard"
        },
        "trace_id": {
          "type": "keyword"
        },
        "user_id": {
          "type": "keyword"
        }
      }
    }
  }
}
```

### 生命周期策略

```json
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_primary_shard_size": "50gb",
            "max_age": "1d",
            "max_docs": 100000000
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Kibana 使用

### 索引模式创建

1. 进入 Kibana → Stack Management → Index Patterns
2. 点击 "Create index pattern"
3. 输入索引模式：`app-*`
4. 选择时间字段：`@timestamp`
5. 点击 "Create index pattern"

### Discover 搜索

```
# 基础搜索
level:ERROR

# 范围搜索
@timestamp:[now-1h TO now]

# 组合查询
service:nginx AND response:500

# 模糊搜索
message:"connection refused"

# 正则搜索
host:/web-[0-9]+/
```

### Dashboard 创建

```json
{
  "attributes": {
    "title": "Application Logs Dashboard",
    "hits": 0,
    "description": "",
    "panelsJSON": "[...]",
    "optionsJSON": "{...}",
    "version": 1,
    "timeRestore": false,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{...}"
    }
  }
}
```

## 应用集成

### Go 应用日志

```go
package main

import (
    "encoding/json"
    "log"
    "net"
    "os"
    "time"
)

type LogEntry struct {
    Timestamp string                 `json:"@timestamp"`
    Level     string                 `json:"level"`
    Message   string                 `json:"message"`
    Service   string                 `json:"service"`
    TraceID   string                 `json:"trace_id"`
    Fields    map[string]interface{} `json:"fields"`
}

func (e *LogEntry) ToJSON() []byte {
    data, _ := json.Marshal(e)
    return data
}

type LogstashWriter struct {
    conn net.Conn
}

func NewLogstashWriter(addr string) (*LogstashWriter, error) {
    conn, err := net.Dial("tcp", addr)
    if err != nil {
        return nil, err
    }
    return &LogstashWriter{conn: conn}, nil
}

func (w *LogstashWriter) Write(p []byte) (n int, err error) {
    return w.conn.Write(p)
}

func main() {
    // 连接到 Logstash
    writer, err := NewLogstashWriter("localhost:5000")
    if err != nil {
        log.Fatal(err)
    }
    defer writer.conn.Close()
    
    // 发送结构化日志
    entry := LogEntry{
        Timestamp: time.Now().Format(time.RFC3339),
        Level:     "INFO",
        Message:   "Application started",
        Service:   "my-service",
        TraceID:   "abc123",
        Fields: map[string]interface{}{
            "version": "1.0.0",
            "env":     "production",
        },
    }
    
    writer.Write(entry.ToJSON())
    writer.Write([]byte("\n"))
}
```

## 性能优化

### 1. 批量处理

```yaml
# filebeat.yml
output.elasticsearch:
  hosts: ["localhost:9200"]
  bulk_max_size: 500
  worker: 2
  flush_interval: 5s
```

### 2. 索引优化

```json
PUT /app-logs-2024.01.01/_settings
{
  "index": {
    "refresh_interval": "30s",
    "number_of_replicas": 0
  }
}
```

### 3. 硬件配置

| 组件 | CPU | 内存 | 磁盘 |
|------|-----|------|------|
| Elasticsearch | 8+ 核 | 32GB+ | SSD |
| Logstash | 4+ 核 | 8GB+ | SSD |
| Kibana | 2+ 核 | 4GB+ | - |

## 总结

ELK Stack 是构建企业级日志分析平台的强大工具，通过合理的架构设计和配置优化，可以处理海量日志数据。

---

**参考资源：**
- [Elasticsearch 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash 官方文档](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana 官方文档](https://www.elastic.co/guide/en/kibana/current/index.html)
