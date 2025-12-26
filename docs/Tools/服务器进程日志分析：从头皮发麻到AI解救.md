---
title: 服务器进程日志分析：从头皮发麻到AI解救
date: 2025-12-26 11:10:00
tags:
  - 工具
  - Shell
  - Linux
  - 服务器监控
  - AI
description: 维护Web服务器时，面对密密麻麻的进程信息头皮发麻？这篇文章教你用Shell脚本记录服务器状态，配合AI分析，轻松搞定进程分析、性能监控、卡顿排查等问题。
author: PFinal南丞
keywords: 服务器监控, 进程分析, Shell脚本, Linux命令, 性能优化, AI辅助分析, 服务器卡顿
---

# 服务器进程日志分析：从头皮发麻到AI解救

## 写在前面

最近在维护一台老的 **Web服务器**，每次查看进程的时候，`ps aux` 一敲，屏幕上刷出来密密麻麻一大堆进程信息，看得我头皮发麻。尤其是那些超长的命令参数，看着就让人心烦。想着总不能每次都这么痛苦吧，于是决定整点东西来解决这个问题。

## 解决思路

既然每次都要看这些进程信息，那不如写个脚本，把执行结果记录下来，顺便统计一下执行时间和退出码，方便后续分析。说干就干，我写了下面这个脚本：

```bash
command="$@"
log_file="command_execution_$(date "+%Y%m%d_%H%M%S").log"
echo "========================================" | tee -a "$log_file"
echo "时间: $(date)" | tee -a "$log_file"
echo "命令: $command" | tee -a "$log_file"
echo "========================================" | tee -a "$log_file"
# 使用Bash内置计时器
start_time=$SECONDS
# 使用临时文件避免子shell问题
temp_file=$(mktemp)
eval "$command" 2>&1 | tee "$temp_file"
exit_code=${PIPESTATUS[0]}
# 将输出追加到日志文件
cat "$temp_file" >> "$log_file"
rm "$temp_file"
duration=$((SECONDS - start_time))
echo "========================================" | tee -a "$log_file"
echo "退出码: $exit_code" | tee -a "$log_file"
echo "耗时: ${duration}秒" | tee -a "$log_file"
```

这个脚本的功能很简单：把任意命令的执行过程记录下来，包括执行时间、命令本身、完整输出、退出码和耗时。一目了然，该有的信息都有了。

## 实战使用

把脚本往服务器上一丢，起个好记的名字，比如 `命令执行监控.sh`，然后运行一下：

```bash
./命令执行监控.sh ps aux 
```

执行完毕后，脚本会自动生成一个带时间戳的日志文件，打开一看，格式整整齐齐：

```
========================================
时间: 2025年12月26日 星期五 11时10分09秒 CST
命令: ps aux
========================================
USER               PID  %CPU %MEM      VSZ    RSS   TT  STAT STARTED      TIME COMMAND
pfinal           47294  18.2  2.0 1494420072 338416   ??  R    11:01上午   0:47.08 /Applications/Trae CN.app/Contents/Frameworks/Trae CN Helper (Renderer).app/Contents/MacOS/Trae CN Helper (Renderer) --type=renderer --user-data-dir=/Users/pfinal/Library/Application Support/Trae CN --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --app-path=/Applications/Trae CN.app/Contents/Resources/app --enable-sandbox --enable-blink-features=HighlightAPI --js-flags=--max-old-space-size=8192 --disable-blink-features=FontMatchingCTMigration,StandardizedBrowserZoom, --lang=zh-CN --num-raster-threads=4 --enable-zero-copy --enable-gpu-memory-buffer-compositor-resources --enable-main-frame-before-activation --renderer-client-id=8 --time-ticks-at-unix-epoch=-1763549045983093 --launch-time-ticks=3169034948987 --shared-files --field-trial-handle=1718379636,r,1980764242391010435,4761999176824767603,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EstablishGpuChannelAsync,PdfUseShowSaveFilePicker,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma --disable-features=CalculateNativeWinOcclusion,FontationsLinuxSystemFonts,MacWebContentsOcclusion,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TimeoutHangingVideoCaptureStarts --variations-seed-version --vscode-window-config=vscode:8765d1cc-a06f-493a-a7f5-1893d3c1f3a0 --seatbelt-client=92
_windowserver      158  12.5  0.5 44512404  82920   ??  Ss   191125  3232:13.57 /System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer -daemon
pfinal           35223  12.5 17.2 8634410808 2880396   ??  Ss   161225  2030:45.83 /Applications/OrbStack.app/Contents/Frameworks/OrbStack Helper.app/Contents/MacOS/OrbStack Helper vmgr -build-id 1763632535 -handoff
pfinal           47538  11.0  0.5 1492622204  85000   ??  S    11:01上午   0:30.20 /Applications/Trae CN.app/Contents/Frameworks/Trae CN Helper (Plugin).app/Contents/MacOS/Trae CN Helper (Plugin) --type=utility --utility-sub-type=node.mojom.NodeService --lang=zh-CN --service-sandbox-type=none --dns-result-order=ipv4first --experimental-network-inspection --inspect-port=0 --vscode-crash-reporter-process-type=extensionHost --user-data-dir=/Users/pfinal/Library/Application Support/Trae CN --standard-schemes=vscode-webview,vscode-file --enable-sandbox --secure-schemes=vscode-webview,vscode-file --cors-schemes=vscode-webview,vscode-file --fetch-schemes=vscode-webview,vscode-file --service-worker-schemes=vscode-webview --code-cache-schemes=vscode-webview,vscode-file --shared-files --field-trial-handle=1718379636,r,1980764242391010435,4761999176824767603,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EstablishGpuChannelAsync,PdfUseShowSaveFilePicker,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma --disable-features=CalculateNativeWinOcclusion,FontationsLinuxSystemFonts,MacWebContentsOcclusion,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TimeoutHangingVideoCaptureStarts --variations-seed-version
pfinal           47288   9.6  0.4 67993920  65248   ??  S    11:01上午   0:09.56 /Applications/Trae CN.app/Contents/Frameworks/Trae CN Helper (GPU).app/Contents/MacOS/Trae CN Helper (GPU) --type=gpu-process --user-data-dir=/Users/pfinal/Library/Application Support/Trae CN --gpu-preferences=UAAAAAAAAAAgAAAEAAAAAAAAAAAAAAAAAABgAAEAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAIAAAAAAAAAAgAAAAAAAAA --shared-files --field-trial-handle=1718379636,r,1980764242391010435,4761999176824767603,262144 --enable-features=DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EstablishGpuChannelAsync,PdfUseShowSaveFilePicker,ScreenCaptureKitPickerScreen,ScreenCaptureKitStreamPickerSonoma --disable-features=CalculateNativeWinOcclusion,FontationsLinuxSystemFonts,MacWebContentsOcclusion,ScreenAIOCREnabled,SpareRendererForSitePerProcess,TimeoutHangingVideoCaptureStarts --variations-seed-version --seatbelt-client=33

............

========================================
退出码: 0
耗时: 0秒
```

## 问题又来了

好了，现在日志是有了，也规整了。但问题是，这玩意儿看起来还是密密麻麻一大片啊！那些超长的命令参数，各种 CPU、内存占用数据，进程状态...看着看着又开始头疼，瞬间没有分析的心情了。

## 服务器卡顿？来套组合拳

说到服务器卡顿，光看进程可不够。遇到服务器响应慢的时候，我一般会用一套组合拳来排查问题。配合前面那个脚本，把这些命令的输出都记录下来，然后统一丢给 AI 分析，简直不要太爽。

### 1. 看看资源占用情况

首先用 `top` 或者 `htop` 实时看看资源使用情况，哪个进程在吃CPU，哪个进程在吃内存：

```bash
./命令执行监控.sh "top -b -n 1"
```

这个命令会抓取一次快照，不用盯着屏幕刷新。记录下来慢慢看，香！

### 2. 看看网络连接

服务器卡顿，很多时候是网络连接出了问题。用 `netstat` 或者 `ss` 看看当前有多少连接：

```bash
./命令执行监控.sh "netstat -antp"
# 或者用更现代的 ss 命令
./命令执行监控.sh "ss -antp"
```

看看有没有大量的 `TIME_WAIT` 或者 `CLOSE_WAIT` 状态的连接，有时候就是这些玩意儿把服务器拖慢的。

### 3. 检查磁盘空间

磁盘满了也会导致各种奇怪的问题，用 `df` 看看磁盘使用情况：

```bash
./命令执行监控.sh "df -h"
```

如果某个分区已经用了 100%，那八成就是它的锅。

### 4. 看看内存使用

内存不够用的时候，系统就会开始疯狂 swap，卡得不行：

```bash
./命令执行监控.sh "free -m"
```

看看 swap 用了多少，如果 swap 用得很高，那就该考虑加内存或者优化程序了。

### 5. 检查磁盘 IO

有时候服务器卡，是因为磁盘 IO 太高。用 `iostat` 看看：

```bash
./命令执行监控.sh "iostat -x 1 5"
```

这会每秒输出一次，连续输出 5 次。看看 `%util` 这一列，如果接近 100%，磁盘 IO 就是瓶颈了。

### 6. 看看哪些文件被打开了

有时候程序会打开大量文件句柄，用 `lsof` 可以看看：

```bash
./命令执行监控.sh "lsof -nP | wc -l"
# 或者看看某个进程打开了哪些文件
./命令执行监控.sh "lsof -p [PID]"
```

如果打开的文件数量超级多，可能就是文件句柄泄漏了。

### 7. 看看系统日志

系统日志里经常藏着各种线索，用 `dmesg` 看看内核日志：

```bash
./命令执行监控.sh "dmesg -T | tail -100"
```

有时候会看到 OOM（Out of Memory）之类的错误信息，一看就知道问题在哪。

### 8. 看看 Web 服务器的错误日志

如果是 Nginx 或者 Apache，直接看错误日志：

```bash
./命令执行监控.sh "tail -n 200 /var/log/nginx/error.log"
# 或者
./命令执行监控.sh "tail -n 200 /var/log/apache2/error.log"
```

日志里的报错信息往往最直接，能快速定位问题。

### 9. 看看 TCP 连接统计

想知道有多少连接处于各种状态，可以用这个：

```bash
./命令执行监控.sh "netstat -an | awk '/^tcp/ {print \$6}' | sort | uniq -c"
```

这会统计各种 TCP 连接状态的数量，一目了然。

### 10. 看看虚拟内存统计

用 `vmstat` 可以看到系统的整体运行状态：

```bash
./命令执行监控.sh "vmstat 1 5"
```

这会每秒输出一次，连续输出 5 次。可以看到 CPU、内存、IO 等各方面的统计数据。

## 一键收集，批量分析

有了前面这个脚本，我甚至写了个更狠的，把这些命令一次性全部执行并记录下来：

```bash
#!/bin/bash
timestamp=$(date "+%Y%m%d_%H%M%S")
report_dir="server_analysis_${timestamp}"
mkdir -p "$report_dir"

echo "开始收集服务器信息..."

# 定义监控脚本路径
monitor_script="./命令执行监控.sh"

# 进程信息
$monitor_script "ps aux --sort=-%cpu | head -20" > /dev/null
mv command_execution_*.log "$report_dir/01_top_cpu_processes.log"

# CPU和内存
$monitor_script "top -b -n 1" > /dev/null
mv command_execution_*.log "$report_dir/02_top_snapshot.log"

# 网络连接
$monitor_script "ss -antp" > /dev/null
mv command_execution_*.log "$report_dir/03_network_connections.log"

# 磁盘使用
$monitor_script "df -h" > /dev/null
mv command_execution_*.log "$report_dir/04_disk_usage.log"

# 内存使用
$monitor_script "free -m" > /dev/null
mv command_execution_*.log "$report_dir/05_memory_usage.log"

# IO 统计
$monitor_script "iostat -x 1 5" > /dev/null
mv command_execution_*.log "$report_dir/06_io_stats.log"

# 系统日志
$monitor_script "dmesg -T | tail -100" > /dev/null
mv command_execution_*.log "$report_dir/07_kernel_logs.log"

# TCP 连接统计
$monitor_script "netstat -an | awk '/^tcp/ {print \$6}' | sort | uniq -c" > /dev/null
mv command_execution_*.log "$report_dir/08_tcp_stats.log"

# 虚拟内存统计
$monitor_script "vmstat 1 5" > /dev/null
mv command_execution_*.log "$report_dir/09_vmstat.log"

echo "信息收集完成！所有日志保存在: $report_dir"
echo "现在可以把整个目录打包发给 AI 分析了！"
```

执行一次，所有数据全部到手，整整齐齐地放在一个目录里。然后把这个目录打个包，统统丢给 AI，让它帮我综合分析。

## AI 时代的解法

不过还好，现在是 **AI 时代**！这种时候就该让 AI 大显身手了。我直接把这些日志文件往 **ChatGPT** 或者 **Claude** 里面一丢，让它帮我分析。

结果呢？AI 把这堆东西分析得是头头是道：
- 哪些进程占用资源最多
- 网络连接是否存在异常
- 磁盘和内存使用情况如何
- IO 是否存在瓶颈
- 系统日志里有没有关键错误
- 还能给出针对性的优化建议

原本需要一个个命令去看，一个个数据去对比分析的工作，现在变成了喝杯咖啡的功夫就能搞定的事儿。AI 甚至还能告诉你："你的服务器有 327 个 TIME_WAIT 连接，建议调整一下内核参数..."，专业得不行。

## 总结

从最开始看到进程列表就头皮发麻，到现在轻轻松松让 AI 帮忙分析，这个流程可以说是相当舒服了。脚本负责记录，命令负责采集，AI 负责分析，我只需要坐等结果就行。

服务器卡顿不可怕，可怕的是不知道从哪下手。有了这套组合拳，再配合 AI 的分析能力，什么 **进程分析**、**性能瓶颈**、**资源占用** 都不在话下。

这就是工具的力量，这就是 **AI 时代**的便利。再也不用担心服务器上那一大堆进程信息了，香得很！

---
 
> 代码是我的语言，终端是我的世界。  
> 
> **PFinalClub** · 写于上海某个加班的深夜  
> 一个用代码偷懒的专业户 | 公众号：PFinalClub  
> 2025.12.26 

