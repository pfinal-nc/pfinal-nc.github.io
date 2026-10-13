---
title: "Chrome 155 默认启用 JPEG XL：jxl-rs 纯 Rust 解码器如何用内存安全赢回四年前输掉的战争"
date: 2026-10-12
tags:
  - rust
  - 前端开发
  - security
  - 性能优化
keywords:
  - JPEG XL
  - jxl-rs
  - Chrome 155
  - Rust 内存安全
  - 图像格式对比
  - AVIF
  - cjxl 无损转码
  - 图片性能优化
category: dev/fe
description: "Chrome 155 于 2026 年 10 月 6 日默认启用 JPEG XL，解码器是纯 Rust 编写的 jxl-rs。本文回顾这场格式战争的反转逻辑，拆解 jxl-rs 的内存安全架构与安全 SIMD 抽象层，并给出 Web 开发者的图像管线落地清单。"
---

# Chrome 155 默认启用 JPEG XL：jxl-rs 纯 Rust 解码器如何用内存安全赢回四年前输掉的战争

## 一场持续四年的反转剧

时间线值得完整看一遍：

- **2021 年 4 月**：Chrome 加入 JPEG XL 实验性支持
- **2022 年 12 月**：Chrome 以"生态兴趣不足"为由移除 JPEG XL，社区炸锅，联署请愿，格式联合开发者 Jon Sneyers 公开指控 Google 为保护自家 AVIF/WebP 利益而扼杀竞品
- **2023 年 6 月**：Safari 17 支持 JPEG XL
- **2026 年初**：JPEG XL 支持回到 Chromium 代码库，Chrome 145 以 flag 形式引入 Rust 解码器
- **2026 年 10 月 6 日**：Chrome 155 稳定版**默认启用** JPEG XL；Firefox 158（10 月中旬）跟进默认开启

四年前 Chrome 给出的官方理由是"生态兴趣不足"，但 2026 年真正的反转引擎有两个：**Interop 2026**（Apple/Google/Mozilla/Microsoft 四家浏览器厂商的协调互操作计划把 JPEG XL 列入调查项），以及一个更硬核的技术事实——**C++ 解码器的内存安全顾虑消失了，因为新解码器是 Rust 写的**。

这个故事里最有意思的不是格式本身，而是安全工程如何改变了浏览器厂商的决策函数。

## 为什么图像解码器是浏览器的头号攻击面

图像解码器直接处理来自网络的复杂二进制结构，跑在渲染器进程里，格式规范又极其复杂（熵编码、变换、色彩空间、渐进解码……），历史上是 CVE 重灾区：越界读取、堆溢出、释放后使用（UAF），几乎每个主流格式解码器都出过。

攻击模型也很简单：攻击者构造一张恶意图片放在网页里，用户打开页面，解码器进程被攻破。**不需要任何用户交互**，这比钓鱼链接的杀伤链短得多。

Chrome 过去几年的思路是把解码器全部进程隔离 + 逐步用内存安全语言重写。jxl-rs 就是这个战略在 JPEG XL 上的落地。

## jxl-rs 架构：内存安全与 SIMD 性能的兼容设计

纯 Rust 重写解码器最大的争议是性能——C++ 版 libjxl 用了大量手写 SIMD 优化，Rust 的安全边界（bounds check）会吃掉性能吗？jxl-rs 的答案是一个**安全 SIMD 抽象层**：

```
┌────────────────────────────────────────────────┐
│                 jxl-rs 解码管线                  │
│                                                │
│  ┌──────────┐  ┌────────────┐  ┌───────────┐   │
│  │ Bitstream│─▶│ Entropy    │─▶│ Transform │   │
│  │ Reader   │  │ Decoder    │  │ /Color    │   │
│  └──────────┘  │ (SIMD)     │  │ (SIMD)    │   │
│                └────────────┘  └───────────┘   │
│                      │                │        │
│                      ▼                ▼        │
│          ┌─────────────────────────────────┐   │
│          │  安全 SIMD 抽象层                │   │
│          │  - target_feature_11 稳定特性    │   │
│          │  - 无需 unsafe 的向量调用        │   │
│          └─────────────────────────────────┘   │
│                      │                         │
│                      ▼                         │
│          ┌─────────────────────────────────┐   │
│          │  unsafe 仅限少量已审计位置        │   │
│          │  （边界对齐、寄存器重解释）        │   │
│          └─────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

三个关键技术点：

1. **`target_feature_11` 稳定化**。Rust 1.85+ 稳定了该特性后，可以为不同 CPU 特性组合编译同一函数的多个版本，运行时按 CPU 支持分发（AVX2/AVX-512/NEON），调用 SIMD 时**不需要 unsafe**。对比 Go 1.27 的 SIMD GOEXPERIMENT（同样是"用安全的抽象替代手写汇编"），两大语言生态在这一年做出了相同的架构判断。

2. **性能移植自 libjxl**。jxl-rs 沿用了参考实现的跨区域处理管线和减少数据拷贝的策略，官方口径是速度与最优的内存不安全实现大致持平。Google 同时用 fuzzing 和 AI 辅助代码审查覆盖整个开发历史，**未发现任何内存安全漏洞**——这个"零内存安全 bug"的记录就是 Chrome 重新接纳它的安全论据。

3. **unsafe 面最小化**。整个解码器里 unsafe 被限制在少数经过审计的位置（主要是寄存器类型重解释和对齐操作），审计面积从"C++ 全量"收缩到"几十行 unsafe"。

## JPEG XL 到底强在哪：给开发者的数据

- **压缩率**：同等画质下比 JPEG 小 30%–50%
- **无损 JPEG 转码**：这是独家能力——把任意现有 JPEG 无损转成 JXL（约小 20%），且可以**逐比特还原**回原 JPEG，不需要浏览器支持就能先做存量压缩
- **渐进解码**：下载 1% 的数据就能渲染出可用预览，AVIF/WebP 都做不到这种细粒度
- **编码速度**：默认设置下比 AVIF 快约 100 倍
- **HDR**：原生支持
- **页面收益**：中位数网页从 JPEG 转 JXL 可省 450–550 KB

但不要无脑全站转 JXL。Google 官方建议是**双格式并存**：

| 场景 | 推荐 |
|---|---|
| 高保真摄影、无损归档、截图、文本密集图 | JPEG XL |
| 低码率有损缩略图、社交信息流 | AVIF（覆盖率仍 ~95% vs JXL 新扩到 ~85%） |
| 存量 JPEG 图库降本 | JXL 无损转码（零风险，可逆） |
| 需要最大兼容性的老接口 | WebP/JPEG |

## 落地：给图像管线加 JXL 支持

### 命令行批量转码（可逆方案）

```bash
# 安装 libjxl 工具集
brew install jpeg-xl          # macOS
# apt install libjxl-tools    # Debian/Ubuntu

# 无损转码：体积约减 20%，且 djxl 可完整还原原始 JPEG
cjxl --lossless_jpeg=1 photo.jpg photo.jxl

# 有损编码：距离 1（视觉无损）兼顾体积
cjxl -d 1.0 photo.jpg photo.jxl

# 校验可逆性
djxl photo.jxl restored.jpg
cmp photo.jpg restored.jpg && echo "bit-identical ✓"
```

### Web 端按能力分发

```html
<picture>
  <!-- Chrome 155+ / Safari 17+ / Firefox 158+ -->
  <source srcset="hero.jxl" type="image/jxl" />
  <!-- 兜底 AVIF，再兜底 JPEG -->
  <source srcset="hero.avif" type="image/avif" />
  <img src="hero.jpg" alt="Hero" width="1280" height="720" />
</picture>
```

内容协商方案（Nginx）：

```nginx
map $http_accept $img_ext {
    default                  "jpg";
    "~*image/avif"           "avif";
    "~*image/jxl"            "jxl";
}

server {
    location ~* ^/images/(.+)\.(jxl|avif|jpg)$ {
        # 按 Accept 头返回对应格式，缺文件自动回落 jpg
        try_files /images/$1.$img_ext /images/$1.jpg;
    }
}
```

### 用 Rust 代码直接调 jxl-rs 解码

```rust
// Cargo.toml: jxl-oxide = "*"   # 纯 Rust JPEG XL 解码库（与 jxl-rs 同一技术路线，版本以 crates.io 为准）
use jxl_oxide::Image;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data = std::fs::read("photo.jxl")?;
    let image = Image::parse(&data)?;
    println!("尺寸: {}x{}", image.width(), image.height());

    let render = image.render_frame(0)?;
    let buf = render.image_all_channels();
    // buf 是解码后的像素缓冲，可交给 image crate 编码 PNG/WebP
    Ok(())
}
```

### 一个坑：Node.js 生态暂时掉队

Sharp（Next.js 图像优化管线的底层）尚不支持 JPEG XL，这意味着多数 JS 构建链的动态图片优化会默认走 AVIF。Node 项目要产出 JXL 得外挂 `cjxl` 进程或等 Sharp 支持。这会是未来半年 JXL 渗透率的最大摩擦点。

## 安全视角：三个可迁移的经验

1. **内存安全叙事赢了**。四年前格式之争本质是商业利益之争，最后终结争论的是"解码器不再是内存安全漏洞来源"这个工程事实。浏览器、操作系统、语言解析器……所有解析不可信输入的位置都在重复这个剧本，Go 和 Rust 生态的动作时间点（Go 1.27 SIMD 抽象 / Chrome jxl-rs）已经在趋同。

2. **fuzzing + AI 审查是新的发布门槛**。jxl-rs 的"整个开发历史零内存安全 bug"结论不是人肉审计出来的，是持续 fuzzing + AI 辅助审查的产物。这个组合正在成为高性能解析器的标配验收流程。

3. **解码器必须默认沙盒 + 默认安全**。即便解码器是 Rust 的，Chrome 仍然把它放在渲染器沙盒里。内存安全是纵深防御的一层，不是全部——这个分层思路对任何处理不可信输入的服务端都适用。

## 结论

JPEG XL 的回归不是"格式复兴"那么简单：它证明了在浏览器这个高度对抗的环境里，**用内存安全语言重写关键攻击面 + 行业互操作协调**可以把一个被判死刑的技术拉回来。对开发者的行动项很朴素：存量 JPEG 图库现在就可以用 `cjxl --lossless_jpeg=1` 做无损降本（可逆、零风险）；新图片管线按场景在 JXL/AVIF 之间双轨分发；Node 生态用户盯紧 Sharp 的 JXL 支持进度。

## 参考资料

- Chrome for Developers 官方公告（2026-10-06）：https://developer.chrome.com/blog
- jxl-rs 仓库：https://github.com/jxl-rs/jxl-rs
- libjxl 参考实现：https://github.com/libjxl/libjxl
- JPEG XL 格式规范（ISO/IEC 18181）：https://jpeg.org/jpegxl/
- Rust target_feature_11 稳定公告：https://blog.rust-lang.org
- Interop 2026 计划：https://wpt.fyi/interop-2026
