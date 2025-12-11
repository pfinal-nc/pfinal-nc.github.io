---
title: "如何开发和使用 基于Wails的抖音直播 工具 - 完整实战指南"
date: 2024-10-18 11:06:22
tags:
    - golang
    - Wails
description: 基于Wails的抖音直播工具
author: PFinal南丞
keywords: 基于Wails的抖音直播工具, golang, Wails, 抖音, 直播, 工具, 桌面应用
---

# 基于Wails的抖音直播工具


​	最近在刷抖音的时候, 发现有很多的 无人直播的直播间, 但是 经常有 发弹幕 没有人回应,或者 进入没有欢迎语, 于是尝试着做一个小工具,来辅助直播.

<!--more-->

## 项目介绍

​	基于Wails 框架, 开发的一个抖音直播工具, 主要功能是

- 进入直播间
- 自动监听人员的进入
- 自动监听弹幕
- 自动监听礼物
- 自动监听关注

## 项目结构

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202402221811105.png)

## 项目原理

通过抖音网页版弹幕数据抓取 , 然后通过Wails 框架将数据渲染到前端, 实现自动监听弹幕, 礼物, 关注等功能.

核心代码如下:

```go


func (d *DouyinLiveWebFetcher) connectWebSocket() {
	d.RoomID()
	wss := "wss://webcast3-ws-web-lq.douyin.com/webcast/im/push/v2/?" +
		"app_name=douyin_web&version_code=180800&webcast_sdk_version=1.3.0&update_version_code=1.3.0" +
		"&compress=gzip" +
		"&internal_ext=internal_src:dim|wss_push_room_id:" + d.roomID +
		"|wss_push_did:" + d.roomID +
		"|dim_log_id:202302171547011A160A7BAA76660E13ED|fetch_time:1676620021641|seq:1|wss_info:0-1676" +
		"620021641-0-0|wrds_kvs:WebcastRoomStatsMessage-1676620020691146024_WebcastRoomRankMessage-167661" +
		"9972726895075_AudienceGiftSyncData-1676619980834317696_HighlightContainerSyncData-2&cursor=t-1676" +
		"620021641_r-1_d-1_u-1_h-1" +
		"&host=https://live.douyin.com&aid=6383&live_id=1" +
		"&did_rule=3&debug=false&endpoint=live_pc&support_wrds=1&" +
		"im_path=/webcast/im/fetch/&user_unique_id=" + d.roomID +
		"&device_platform=web&cookie_enabled=true&screen_width=1440&screen_height=900&browser_language=zh&" +
		"browser_platform=MacIntel&browser_name=Mozilla&" +
		"browser_version=5.0%20(Macintosh;%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit/537.36%20(KHTML,%20" +
		"like%20Gecko)%20Chrome/110.0.0.0%20Safari/537.36&" +
		"browser_online=true&tz_name=Asia/Shanghai&identity=audience&room_id=" + d.roomID +
		"&heartbeatDuration=0&signature=00000000"
	dialer := websocket.DefaultDialer
	header := http.Header{"Cookie": []string{fmt.Sprintf("ttwid=%s", d.Ttwid())}, "User-Agent": []string{d.userAgent}}
	c, _, err := dialer.Dial(wss, header)
	if err != nil {
		log.Fatal("WebSocket connection error: ", err)
	}
	defer func(c *websocket.Conn) {
		_ = c.Close()
	}(c)
	d.ws = c
	d.wsOnOpen()
	d.wsLoop()
}


```

由于网页直播间使用的 是 connectWebSocket 进行通信的 所以 用 go 构造了一个 socket 服务用来连接 直播间的 socket 通信, 并且解析消息, 消息的结构做了一个 **protobuf** 文件

```proto
syntax = "proto3";
package lib;
option go_package = "../lib";
message Response {
  repeated Message messagesList = 1;
  string cursor = 2;
  uint64 fetchInterval = 3;
  uint64 now = 4;
  string internalExt = 5;
  uint32 fetchType = 6;
  map<string, string> routeParams = 7;
  uint64 heartbeatDuration = 8;
  bool needAck = 9;
  string pushServer = 10;
  string liveCursor = 11;
  bool historyNoMore = 12;
}

message Message{
  string method = 1;
  bytes payload = 2;
  int64 msgId = 3;
  int32 msgType = 4;
  int64 offset = 5;
  bool needWrdsStore = 6;
  int64 wrdsVersion = 7;
  string wrdsSubKey = 8;
}

```
然后生成成 消息结构体 来进行消息的解析 

## 项目截图

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202402221614497.png)


效果如上图所示

## 后续

目前项目只是实现了 基本的监听, 后续会继续完善下面的功能

- [ ] 弹幕发送
- [ ] 入场欢迎的语音 
- [ ] 直播间的礼物感谢功能

### 项目地址

https://github.com/pfinal-nc/pf_douying/tree/master

