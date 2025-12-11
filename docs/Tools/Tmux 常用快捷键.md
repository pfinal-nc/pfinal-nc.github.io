---
title: "Tmux 常用快捷键 - 完整使用指南"
date: 2022-03-13 15:46:00
keywords: Tmux, 常用快捷键, 工具
tag:
  - 工具
sticky: true
description: Tmux 常用快捷键
descriptionHTML: '
<span style="color:var(--description-font-color);">Tmux 常用快捷键</span>
<pre style="background-color: #292b30; padding: 15px; border-radius: 10px;" class="shiki material-theme-palenight"><code>
    <span class="line"><span style="color:#FFCB6B;">tmux</span><span style="color:#A6ACCD;"> </span><span style="color:#C3E88D;">new</span><span style="color:#A6ACCD;"> </span><span style="color:#C3E88D;">-s pfinal</span></span>
</code>
</pre>'
---

# Tmux 常用快捷键

```
# 新建会话
tmux new -s pfinal
# 查看会话
ctrl+b s
# 重命名会话
Ctrl+b $

# 创建窗口
ctrl+b c
# 切换到2号窗口
ctrl+b 2
# 重命名窗口
ctrl+b ,
# 关闭窗口
ctrl+b &

# 水平拆分出一个新窗格
ctrl+b %
# 垂直拆分窗格
ctrl+b "
# 切换到下一个窗格
ctrl+b o
# 关闭窗格
ctrl+b x
```



|                     |                                          |          |
| ------------------- | ---------------------------------------- | -------- |
| 命令                | 说明                                     | 快捷键   |
| tmux new -s         | 创建会话                                 |          |
| tmux detach         | 退出当前会话，会话进程仍然在后台运行     | Ctrl+b d |
| tmux ls             | 查看当前所有的 会话                      | Ctrl+b s |
| tmux attach -t      | 重新接入某个已存在的会话                 |          |
| tmux kill-session   | 杀死某个会话                             |          |
| tmux switch -t      | 切换会话                                 |          |
| tmux rename-session | 重新命名会话                             | Ctrl+b $ |
| tmux at -d          | 重绘窗口，在不同屏幕上保持窗口为最小尺寸 |          |



## 窗口管理

窗口属于会话，窗口包含多个窗格

| 命令                  | 说明           | 快捷键   |
| --------------------- | -------------- | -------- |
| tmux new-window -n    | 创建新窗口     | Ctrl+b c |
| tmux select-window -t | 切换窗口       |          |
| tmux rename-window    | 重命名当前窗口 | Ctrl+b , |

切换窗口快捷键

| 快捷键   | 说明                                              |
| -------- | ------------------------------------------------- |
| Ctrl+b p | 切换到上一个窗口（按照状态栏上的顺序）            |
| Ctrl+b n | 切换到下一个窗口                                  |
| Ctrl+b   | 切换到指定编号的窗口，number 是状态栏上的窗口编号 |
| Ctrl+b w | 从列表中选择窗口                                  |
| ctrl+b & | 关闭当前窗口                                      |
| ctrl+b x | 删除窗口                                          |



**拆分窗格**

| 命令                 | 说明             |
| -------------------- | ---------------- |
| tmux split-window -h | 划分左右两个窗格 |
| tmux split-window    | 划分上下两个窗格 |

**移动窗格**

| 命令                | 说明               |
| ------------------- | ------------------ |
| tmux select-pane -U | 光标切换到上方窗格 |
| tmux select-pane -D | 光标切换到下方窗格 |
| tmux select-pane -L | 光标切换到左边窗格 |
| tmux select-pane -R | 光标切换到右边窗格 |
| tmux swap-pane -U   | 当前窗格上移       |
| tmux swap-pane -D   | 当前窗格下移       |

**窗格快捷键**

| 快捷键            | 说明                                       |
| ----------------- | ------------------------------------------ |
| Ctrl+b %          | 划分左右两个窗格                           |
| Ctrl+b "          | 划分上下两个窗格                           |
| Ctrl+b ;          | 切换到上一个窗格                           |
| Ctrl+b o          | 光标切换到下一个窗格                       |
| Ctrl+b {          | 当前窗格左移                               |
| Ctrl+b }          | 当前窗格右移                               |
| Ctrl+b Ctrl+o     | 当前窗格上移                               |
| Ctrl+b Alt+o      | 当前窗格下移                               |
| Ctrl+b x          | 关闭当前窗格                               |
| Ctrl+b !          | 将当前窗格拆分为一个独立窗口               |
| Ctrl+b z          | 当前窗格全屏显示，再使用一次会变回原来大小 |
| Ctrl+b q          | 显示窗格编号                               |
| Ctrl+b Alt+方向键 | 调整窗格大小                               |





