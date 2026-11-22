---
title: Ghostscript -dSAFER 逃逸 CVE-2026-125396 上传链自检
date: 2026-11-23 07:30:00
author: PFinal南丞
tags: [security, cve, ghostscript, upload, hardening]
description: 一个改名成 .png 的 EPS 文件就能把不可信输入送进 Ghostscript 解释器。本文按 Upload2Shell（CVE-2026-125396）拆开 -dSAFER 边界为何被内存破坏绕过，实测 Pillow 与 ImageMagick 两条上传链，并给出可运行的 Go 自检脚本与加固清单。
keywords:
  - ghostscript cve-2026-125396
  - dsafer 逃逸
  - 上传漏洞 rce
  - imagemagick policy
  - pillow eps
  - 图片缩略图安全
  - 攻击面收敛
  - 容器隔离
  - 安全加固
  - cve-2026-65640
---
# Ghostscript -dSAFER 逃逸 CVE-2026-125396：上传即执行的上传链自检

## 一、背景：一个 rename 就能到解释器

11 月 21 日 pwn.ai 公开了 Upload2Shell（CVE-2026-125396）。它不是又一个"点开附件"的漏洞，而是一条**从上传入口直达 Ghostscript 解释器内部**的链：

- 根因是 Ghostscript **Type 1 字体加载器的 use-after-free**，一个构造文档可以穿过 `-dSAFER` 沙箱，改写原生路径控制，以渲染进程身份执行攻击者指定的命令；
- 他们确认的落点包括 **Debian 13 CUPS**（匿名 IPP Print-Job 打到共享队列，直接在宿主机以 `lp` 执行）、**WordPress Core**（`upload_files` 权限，Author+ 默认具备，另有 CVE-2026-65640）、**Roundcube**（外部邮件附件在查看时被缩略，以 `www-data` 执行，5/5 成功）、MediaWiki、DokuWiki、Plesk、Elementor、Forminator、Mayan EDMS、ResourceSpace，以及 Google 的生产文档渲染链；
- 修复是 Ghostscript **10.08.0**（Artifex Bug 709684，9 月 8 日发布），Ubuntu 在 **USN-8949-1**（10 月 21 日）为七个发行版发布修复包，Debian 13 的当前修复版本是 `10.05.1~dfsg-1+deb13u3`。

站内 [NoisyTCP 那篇](/security/engineering/noisytcp-cve-2026-99288-linux-tcp-race-hardening-2026) 讲的是内核协议栈的竞态，[LMCache ZeroMQ 那篇](/security/offensive/lmcache-zeromq-unauth-rce-cve-2026-105192-2026) 讲的是"一个缓存库暴露的面"。今天这篇讲第三条最常见、也最容易被忽略的面：**文件上传 → 图像库 → 解释器**。

注意一个前提：本文不复现利用代码。原因很简单——这条链的防护重点不是"能不能打通"，而是"你的服务里到底有几扇门通向 gs"。所以下面全是**检测与实测**。

## 二、原理：`-dSAFER` 关的是文件操作，不是解释器的内存

Ghostscript 自 9.50 起默认开启 `-dSAFER`，它做的事很清楚：禁止 PostScript 代码读写任意文件、禁止 `%pipe%`、禁止 rename/delete，把解释器关进一个只读的笼子。这层防护已经挡住了绝大多数"恶意 PS 文件"。

问题在于它防的是**解释器的行为**，不是**解释器的状态**。Type 1 字体加载器里存在释放后使用：某个字体结构被释放后仍被引用，攻击者可以借此破坏解释器内部对象，把原本被 SAFER 拦住的路径控制"改写"成可用的原语——沙箱还在，但它脚下的逻辑已经被换掉了。

为什么偏偏是字体解析？因为 Type 1 字体在 Ghostscript 里不是"读取二进制数据"，而是**一段要被执行的小语言**：字形由加密的 charstring 描述，解释器得边解密边解释。这类代码路径解析逻辑密集、状态机复杂，历史上 ghostscript 的字体相关 CVE 一直占大头。`-dSAFER` 能约束"解释器能碰哪些文件"，但约束不了"解释器内部对象被写坏"——一旦结构体里的指针被换成攻击者可控的值，SAFER 就在错误的假设上继续运行。

这也解释了为什么 10 月那一批 Ubuntu 补丁是"同族三连"：

| 补丁 | 位置 | 性质 |
|---|---|---|
| CVE-2026-101258-1 | `psi/zfproc.c` | 过程数据源返回的字符串未拷进全局 VM，`restore` 后留下悬空指针（SAFER 逃逸） |
| CVE-2026-101258-2 | `base/gsshade.c` | 着色 /Function 数组成员只产出一个输出的校验缺失（堆溢出） |
| CVE-2026-103226 | `devices/vector/gdevpsfx.c` + `base/gxtype1.h` | pdfwrite 转 Type 1 字体时控制栈越界，`CS_CHECK_IPSTACK` 差一 |
| LP#2171528（无 CVE 号） | `Resource/Init/gs_fonts.ps` | `.putgstringcopy` 缺操作数类型校验，错误处理器可触达 `.forceput` |

我在测试机上核对的实际状态：

```
$ gs --version
9.55.0
$ zcat /usr/share/doc/ghostscript/changelog.Debian.gz | head -3
ghostscript (9.55.0~dfsg1-0ubuntu5.15) jammy-security; urgency=medium
 -- Charles Cochran <charles.cochran@canonical.com>  Tue, 20 Oct 2026 12:40:15 -0400
```

这里有个**版本对账的坑**：发行版回填补丁时，`gs --version` 永远显示 `9.55.0`，主版本号不会变。这台机的 `5.15` revision（10 月 20 日构建）已经带上了上面四个补丁，但 changelog 里**没有** `CVE-2026-125396` 这个串——因为 CVE 是 11 月 9 日才分配的。所以"看版本号判断是否修复"这件事对发行版包**根本不成立**，只能按 USN 的包版本清单 + changelog 的补丁条目逐条核。

## 三、链子在哪：三个嗅探点，实测给你的服务器拍张照

绝先把结论摆出来：在 2026 年的主流技术栈里，`gs` 出现在上传链末端的概率远高于你的直觉。WordPress 的 `upload_files`、Roundcube 的附件缩略、CUPS 的打印队列、DokuWiki 的 resize、Mayan 的邮件导入，这些功能看起来彼此无关，但都共享同一个"把不可信文件变成像素"的动作，而这个动作在 Linux 上十有八九落到 Ghostscript。

大多数服务不会直接调 gs，暴露发生在图像库的"格式嗅探"上：用户传 `photo.png`，库里看 magic bytes，发现是 `%!PS`，就按 EPS 处理并委派 gs。**扩展名完全不参与判断**。

先造一个测试样本（内容合法、只是画一条线，不含任何利用逻辑）：

```bash
printf '%%!PS-Adobe-3.0 EPSF-3.0\n%%%%BoundingBox: 0 0 200 200\nnewpath 10 10 moveto 190 190 lineto stroke\nshowpage\n' > probe.png
file probe.png
# probe.png: PostScript document text conforming DSC level 3.0, type EPS
```

三条路径在这台机器上的实测结果：

| 路径 | 拦截机制 | 实测结果 | 单次耗时 |
|---|---|---|---|
| ImageMagick `convert probe.png out.png` | `policy.xml` coder 白名单 | **拦下**，rc=1，报 `security policy 'PS'` | 30.4 ms（快速失败） |
| Pillow `Image.open("probe.png").load()` | 应用侧没有任何拦截 | **打通**，识别为 EPS 200×200，gs 进程被拉起 | 62.7 ms（进程内） |
| 直接 `gs -dSAFER ... probe.png` | 只有 SAFER | **成功渲染** | 73.9 ms，峰值 RSS 26.1 MB |

Pillow 那一条最关键。下面是从 gs 侧抓到的真实调用（我把 `gs` 包了一层 wrapper 记录参数）：

```
gs -q -g200x200 -r72.000000x72.000000 -dBATCH -dNOPAUSE -dSAFER -sDEVICE=ppmraw \
   -sOutputFile=/tmp/tmpvbcdj2_l -c 0 0 translate -f /…/probe.png -c showpage
```

看清楚：**`-dSAFER` 在，但解释器照样被不可信文件喂满了**。同一台机器上 `policy.xml` 已经禁了 `PS/PS2/PS3/EPS/PDF/XPS` 六个 coder，ImageMagick 那条门关得很紧；可 Pillow 根本不看 ImageMagick 的策略，它自己 `shutil.which("gs")` 找到 PATH 里的 gs 就起进程。

这就是很多团队"我已经禁了 EPS"的错觉来源：**你禁的是 ImageMagick 的门，不是解释器的门**。检查 policy 的命令：

```bash
python3 - <<'PY'
import re
s = open("/etc/ImageMagick-6/policy.xml").read()
for p in ["PS","PS2","PS3","EPS","PDF","XPS"]:
    m = re.search(r'<policy domain="coder" rights="([^"]+)" pattern="%s"' % p, s)
    print(f"coder {p}: {m.group(1) if m else '未声明(=允许)'}")
PY
# coder PS: none … coder XPS: none   （六个全禁）
grep -c 'command="&quot;gs&quot;' /etc/ImageMagick-6/delegates.xml
# 10   ← 光 delegates.xml 里就有 10 条命令会调起 gs
```

## 四、成本账：每张缩略图 60–74 ms、26 MB

这条链之所以危险，除了"上传不需要鉴权"，还因为它**便宜到吓人**：一次触发只花一个短命进程的时间。

| 并发 | 每张 CPU | 1000 张累计 | 常驻内存峰值 |
|---|---|---|---|
| 1 | 62–74 ms | 62–74 s | 26 MB |
| 5 | 62–74 ms | 约 6 分钟墙钟 | 约 130 MB |
| 10 | 62–74 ms | 约 3–7 分钟墙钟（2 核） | 约 260 MB |

反过来说，攻击者不需要任何"重"操作就能让渲染进程反复起落：一千张伪装图片就是一千次解释器初始化。生产上你甚至能在监控里看到"缩略图队列莫名变长"，那是被当成放大器的信号。

把这张表换算成钱更有感觉：一个日活 10 万、每天 3% 用户换头像的站点，每天约 3,000 次缩略图，其中若 1% 是伪装文件，就是 30 次解释器起落——攻击者只要 30 个并发请求，就能瞬时占掉约 26×30 ≈ 780 MB 内存、烧掉约 2 秒 CPU。单次看不出问题，量级一上来就是"缩略图队列雪崩"。

（上面是 2 核云主机、gs 9.55.0、200×200 样本的实测均值：gs 直连 73.9 ms、Pillow 进程内 62.7 ms、ImageMagick 拦下 30.4 ms、gs 子进程峰值 RSS 26.1 MB。更大的页面会线性变贵，但启动开销这一档不会变。）

## 五、可运行的自检：一个 Go 门禁脚本

与其每次上线人工核对，不如把它做成部署前的一道门。下面这段真跑通了，逻辑就三件事：版本对账、policy 状态、delegate 数量，外加 Pillow 插件探测。

```go
var fixedVersion = [3]int{10, 8, 0} // 上游修复基线：10.08.0

func gsVersion() (string, [3]int, error) {
    out, err := exec.Command("gs", "--version").Output()
    v := strings.TrimSpace(string(out))
    re := regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)`)
    var n [3]int
    if m := re.FindStringSubmatch(v); len(m) == 4 {
        for i := 1; i <= 3; i++ { n[i-1], _ = strconv.Atoi(m[i]) }
    }
    return v, n, err
}

func policyState(path string) map[string]string {
    res := map[string]string{}
    b, _ := os.ReadFile(path)
    re := regexp.MustCompile(`<policy domain="coder" rights="([^"]+)" pattern="([^"]+)"`)
    for _, m := range re.FindAllStringSubmatch(string(b), -1) { res[m[2]] = m[1] }
    return res
}
```

运行输出（本机真实结果）：

```
[版本] gs 9.55.0  修复基线 10.8.0  -> WARN
       注意：发行版回填补丁时版本号不变，必须对照 revision 与 changelog
[policy] PS 已禁 / PS2 已禁 / PS3 已禁 / EPS 已禁 / PDF 已禁 / XPS 已禁
[delegate] delegates.xml 中调用 gs 的命令条数: 10

| 路径 | 拦截方式 | 状态 |
|---|---|---|
| ImageMagick convert | policy coder | 已禁 PS 家族 |
| Pillow Image.open | 需应用侧白名单 | 插件在，会嗅探 EPS→gs |
| 应用直连 gs | -dSAFER（无法防内存破坏） | 版本低于修复基线 |
exit=1
```

把它接进流水线只要两行：镜像构建完跑一次，非零就 fail；线上再做成定时巡检，把结果推给告警通道。

```bash
# 构建阶段：没收敛就不出镜像
./guard > /tmp/gs-guard.txt 2>&1 || { cat /tmp/gs-guard.txt; exit 1; }
# 运行阶段：每周巡检一次，留档对比
0 3 * * 1 /opt/guard >> /var/log/gs-guard.log 2>&1 || echo "gs 门禁失败" | mail -s alert ops@example.com
```

这套判断的标准是：**三条路径里只要有一条开着，就不算收敛**。上面这台的结论是"IM 关了、Pillow 开着、版本待核"，所以退出码 1——门禁拦下，而不是打印一堆绿字让人误以为安全。

## 六、加固清单与四个坑

| # | 动作 | 具体做法 | 为什么必须做 |
|---|---|---|---|
| 1 | 升解释器 | gs 升到 10.08.0+；发行版按 USN-8949-1 的**包版本**核对，不看 `gs --version` | 根因在解释器内部，外围拦不住内存破坏 |
| 2 | 关 coder | `policy.xml` 里 `PS/PS2/PS3/EPS/PDF/XPS` 全设 `rights="none"` | 拦住 ImageMagick 这条门 |
| 3 | 单独治 Pillow | 上传前用 magic 白名单判定，只接受 PNG/JPEG/WebP/GIF；必要时卸载/禁用 `PIL.EpsImagePlugin` | Pillow 自己找 PATH 里的 gs，不受 IM policy 约束 |
| 4 | 审计 delegate | `magick -list delegate` 逐条看，删掉不需要的 gs 调用 | 本机 delegates.xml 就有 10 条 |
| 5 | 进程隔离 | 缩略图 worker 用只读 rootfs、独立用户、egress 白名单、seccomp/AppArmor | Plesk 案例里 AppArmor 拦住了 shell，但不能当唯一防线 |
| 6 | 收网络面 | CUPS 共享队列不匿名开放；文档导入源（POP3/邮件）限定发件人 | Debian 13 那条链的入口就是匿名 IPP Print-Job |
| 7 | 加观测 | 给 gs 子进程计数与耗时打点，缩略图队列长度异常告警 | "上传即执行"在生产里表现为渲染负载异常 |

如果业务确实必须处理 PDF（发票、简历、合同预览），路线不是"把 gs 调得更安全"，而是"减少 gs 的暴露方式"：把渲染放进一次性容器、限 30 秒超时、限制输出尺寸、只写临时目录；或者换一套解析器（例如 MuPDF 系的 `mutool`）分担负载。换解析器不是银弹——它只是把"gs 的 CVE"换成"另一套 CVE"，但能避免所有业务都压在同一个解释器上，这也是多租户场景里常见的做法。

四个坑，按踩到的概率排序：

1. **只按扩展名判断**。`.png` 里放 EPS，`file` 都会告诉你它是 PostScript，你的代码却只看了后缀。
2. **只在应用层禁后缀**。Pillow/Imagemagick 都会嗅探内容，改名绕过是零成本的。
3. **只升了 ImageMagick 没升 gs**。IM 6.9 + gs 9.55 照样委派，policy 只决定"要不要走到那一步"。
4. **版本号看错**。`9.55.0` 这个数字在这台机上是对的，但真正决定安全的是 `5.15` 这个 revision 和 changelog 里的补丁条目。反过来说，看到 `9.55.0` 就断言"没修"也是错的。

## 七、取舍：先缩面，再隔离，最后才谈监控

上传链的收敛顺序不该反过来：

- **缩面**永远是第一优先：不接受 PostScript 家族（PS/EPS/PDF/XPS），就减少了 90% 的风险，而且这类格式在"用户上传头像"的场景里毫无业务价值。
- **隔离**是第二层：确实要处理 PDF（比如发票、简历），就把转换放进一次性容器，只读挂载、无网络、限时限额，让"绕过"的收益低到不值得。
- **监控**是第三层，用来发现"你以为关了其实没关"的门——比如某个老服务还在用 Pillow 直接 `Image.open`。

如果要给一句可执行的结论：**把 `gs` 当成"不可信输入的最终消费者"，而不是"一个图片工具"**。它一旦出现在上传链的末端，前面所有基于后缀、MIME、Content-Type 的校验都是装饰品。

## 参考资料

- [Upload2Shell / CVE-2026-125396（pwn.ai 公开记录，含应用路径与时间线）](https://pwn.ai/upload2shell)
- [Ubuntu USN-8949-1：Ghostscript 修复包（七个发行版）](https://ubuntu.com/security/notices/USN-8949-1)
- [Ghostscript 官方下载页（10.08.0 修复版本）](https://ghostscript.com/releases/gsdnld.html)
- [Artifex Bug 709684：Type 1 字体加载器上游修复](https://bugs.ghostscript.com/show_bug.cgi?id=709684)
- 站内：[NoisyTCP CVE-2026-99288 内核 TCP 竞态加固](/security/engineering/noisytcp-cve-2026-99288-linux-tcp-race-hardening-2026)、[LMCache ZeroMQ 未授权 RCE](/security/offensive/lmcache-zeromq-unauth-rce-cve-2026-105192-2026)、[Next.js OG Image RCE](/security/offensive/nextjs-cve-2026-94545-og-image-rce-2026)、[安全工程目录](/security/engineering/)
