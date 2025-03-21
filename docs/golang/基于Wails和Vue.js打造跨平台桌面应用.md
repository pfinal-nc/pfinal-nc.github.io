---
title: 用Wails和Vue.js打造跨平台桌面应用程序
date: 2024-08-28 10:14:02
tags:
  - golang
  - Wails
description: 用Wails和Vue.js打造跨平台桌面应用程序
author: PFinal南丞
keywords: 用Wails和Vue.js打造跨平台桌面应用程序, Wails, Vue.js, 跨平台桌面应用程序, 抖音, 直播
---
# 用Wails和Vue.js打造跨平台桌面应用程序

## 背景

最近在观看抖音直播时，我发现了一位专注编程的主播，他在录制视频时使用了一个自制的桌面计时工具。这个工具非常实用，每当直播到达半小时左右，主播就会暂停录制并保存视频。这不仅帮助他有效管理直播时间，也让他的工作流程更加有条不紊。作为一名长期从事开发的程序员，这一巧妙的工具引起了我的兴趣，于是我决定动手开发一个类似的桌面计时应用。经过一番摸索，我使用 Wails 框架顺利完成了这个项目。下面是最终实现效果：

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408280920573.png)


## 项目实现

#### 项目地址

在开始详细介绍实现过程之前，先给出项目的 GitHub 地址 `https://github.com/PFinal-tool/pf_clock`
可以在这里找到完整的源码和使用说明。

#### 使用 Wails 进行开发

在过去的项目中，我已经多次使用 `Wails` 开发桌面应用，因此对这个框架的使用已经非常熟悉。`Wails` 是一个非常适合开发跨平台桌面应用的框架，结合了 `Go` 语言的强大后端功能和现代前端框架的灵活性。如果你还不熟悉 `Wails`，可以参考我之前写的相关文章，里面有详细的介绍和使用示例。

#### 创建项目

首先，我们使用 Wails 生成一个新项目。在命令行中运行以下命令：

```shell
wails init -n clock -t vue
```
`PS:` 这里的 `-n` 参数用于指定项目的名称，`-t` 参数用于选择前端框架，这里选择的是 `Vue.js`。

由于前端需要使用 `tailwindcss` 所以需要安装一下 `tailwindcss`

```shell

cd frontend
npx tailwindcss init -p
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest

```

#### 项目结构

项目的目录结构如下所示：

```
README.md    app.go       build        config.json  frontend     go.mod       go.sum       main.go      node_modules wails.json

```

其中，`frontend` 文件夹包含了前端代码，采用 `Vue.js` 进行开发；`main.go` 是项目的主入口，负责 `Wails` 的初始化和项目启动。

#### `main.go` 修改:

在 `main.go` 文件中，进行了如下修改：

```go
package main

import (
	"embed"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	wr "github.com/wailsapp/wails/v2/pkg/runtime"
	"runtime"
)

//go:embed all:frontend/dist
var assets embed.FS    // 嵌入前端资源

//go:embed build/appicon.png
var icon []byte       // 嵌入程序的图标

func main() {
	app := NewApp()
	AppMenu := menu.NewMenu()    // 创建菜单 
	ColckMenu := AppMenu.AddSubmenu("File") // 创建文件菜单

	ColckMenu.AddText("退出", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		wr.Quit(app.ctx)
	}) // 增加了 退出菜单

	if runtime.GOOS == "darwin" {
		AppMenu.Append(menu.EditMenu()) 
	}

	err := wails.Run(&options.App{
		Title:  "clock",
		Width:  450,
		Height: 175,
		Menu:   AppMenu, // reference the menu above
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Frameless:        true,
		DisableResize:    true,
		AlwaysOnTop:      true,
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 0},  // 这里设置了背景颜色为透明,但是Wails v2 没有怎么生效
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			TitleBar:             nil,
			Appearance:           "",
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			Preferences:          nil,
			DisableZoom:          false,
			About: &mac.AboutInfo{
				Title:   "PFClock",
				Message: "PFinalClub Clock",
				Icon:    icon,
			},
			OnFileOpen: nil,
			OnUrlOpen:  nil,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

```

#### 前端修改

为前端引入了 `tailwindcss`，并进行了相关配置。`tailwind.config.js` 和 `style.css` 文件分别修改如下：

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
const { addDynamicIconSelectors } = require('@iconify/tailwind')
export default {
  content: ['./index.html','./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    addDynamicIconSelectors()
  ],
}

```

`style.css`:

```css
/* ./src/index.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

....

```

至此,基本工作准备的差不多了, 就可以开始开发功能了.

#### 功能开发

##### 后端开发

在 `app.go` 中增加了配置文件的加载逻辑：

```go

type ClockConfig struct {
	ClockBgColor   string `json:"clock_bg_color"`
	ClockTextColor string `json:"clock_text_color"`
}

type TextConfig struct {
	BgColor     string `json:"text_bg_color"`
	TextColor   string `json:"text_color"`
	TextContent string `json:"text_content"`
}

// 配置结构体
type Config struct {
	ClockConfig
	TextConfig
}

func (a *App) initConfig() {
	configPath := "config.json"
	confg, err := a.loadDictsFromEmbedFS(configPath)
	if err != nil {
		fmt.Println(err)
	}
	a.Config = confg
}

func (a *App) loadDictsFromEmbedFS(fileName string) (Config, error) {
	fmt.Println(fileName)
	var config Config
	data, err := defaultDicts.ReadFile(fileName)
	if err != nil {
		return config, err
	}

	err = json.Unmarshal(data, &config)
	if err != nil {
		return config, err
	}
	fmt.Println(config)
	return config, err
}

func (a *App) GetAppConfig() Config {
	return a.Config
}

```
如上所示, 增加了一个 `Config` 结构体, 用于存储配置信息. 然后增加了一个 `initConfig` 方法, 用于初始化配置信息. 然后增加了一个 `loadDictsFromEmbedFS` 方法, 用于从嵌入的文件系统中读取配置信息.

`config.json` 文件内容如下:

```json
{
  "clock_bg_color":"#FFFFFF",
  "clock_text_color":"#00000",
  "text_bg_color":"#1ab394",
  "text_color":"red",
  "text_content":"PFinalClub专业的技术社区"
}
```

如上所示, 配置了 `clock_bg_color` 和 `clock_text_color` 和 `text_bg_color` 和 `text_color` 和 `text_content` 等配置信息.

##### 前端开发

使用 `Vue` 组件实现了定时器功能，组件包括 `ClockSetter.vue`、`FlipClock.vue` 和 `Flipper.vue`。核心代码在 `App.vue` 中实现:

基础的功能 `App.vue`:

```js
<template>
  <div id="app" @dblclick="toggleTimer" @keydown="handleKeydown" tabindex="0">
    <FlipClock ref="flipClockRef"></FlipClock>
    <ClockSetter :appConfig="appConfig"></ClockSetter>
  </div>
</template>

<script>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { GetAppConfig } from '../wailsjs/go/main/App';
import ClockSetter from './components/ClockSetter.vue';
import FlipClock from './components/FlipClock.vue';

export default {
  name: 'App',
  components: {
    FlipClock,
    ClockSetter
  },
  setup() {
    const appConfig = reactive({});
    const lastKey = ref('');
    const flipClockRef = ref(null);
    const isFlipClockMounted = ref(false); // Flag to check if FlipClock is mounted

    // 这里异步 读取了 app.go 中的 GetAppConfig 方法, 获取配置信息
    GetAppConfig().then(config => {
      Object.assign(appConfig, config);
    }).catch(error => {
      console.error('Error fetching config:', error);
    });

    const start = () => {
      if (flipClockRef.value && isFlipClockMounted.value) {
        console.log('FlipClock is mounted and ready to start');
        flipClockRef.value.start();
      } else {
        console.error('FlipClock component is not yet mounted.');
        console.log('flipClockRef.value:', flipClockRef.value);
      }
    };

    const resetFlipClock = () => {
      if (flipClockRef.value && isFlipClockMounted.value) {
        console.log('Resetting FlipClock');
        flipClockRef.value.reset();
      }
    };

    const handleKeydown = (event) => {
      if (event.key === 's') {
        start();
      } else if (event.key === 'p') {
        flipClockRef.value.pause();
      } else if (event.key === 'r') {
        resetFlipClock();
      }
      lastKey.value = event.key;
    };

    onMounted(async () => {
      await nextTick(); // Wait for the DOM to update
      console.log(flipClockRef.value)
      document.getElementById('app').focus();
      window.addEventListener('keydown', handleKeydown);
      isFlipClockMounted.value = true;
      console.log('App mounted');
    });

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown);
    });

    return {
      appConfig,
      lastKey,
      flipClockRef,
      start,
      resetFlipClock
    };
  }
}
</script>

```

至此 核心的代码已经完成, 剩下的就是一些细节的调整和完善.


#### 运行与打包

```shell
wails dev
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408280952361.png)

效果没毛病.也能够翻页计时. 

最后，通过以下命令将项目打包为可执行文件：

```shell
wails build  --mac 

wails build -platform darwin/arm64 -o pf_clock_arm64 -- mac

wails build -platform windows/amd64 -o pf_clock.exe -- windows

wails build -platform linux/amd64 -o pf_clock_linux -- linux

```
