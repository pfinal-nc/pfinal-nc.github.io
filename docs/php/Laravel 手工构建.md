---
title: Laravel 手工构建
date: 2019-01-16 10:00:02
author: PFinal南丞
tag:
 - PHP
 - Laravel 
description: 手工构建laravel 框架,详细介绍了从项目初始化到添加各个组件的完整过程。
keywords: Laravel, 构建, 手工, 框架, 手工构建, PHP
---


## 手工构建laravel框架
构建过程分为项目初始化,路由组件添加,控制器模块添加,模型组件添加和视图组件添加。

#### 项目初始化:

首先在服务器的web目录下创建一个lara文件夹,在根目录下创建一个 **composer.json**文件,内容如下:

```
{
   "require":{

   }
}
```
除过上面的方法以外 还可以 用 composer 初始化,然后运行 **composer update** 执行成功以后 lara 文件夹下 会自动生成自动加载文件目录如下:

```
lara
  |
  |--vendor
       |
       |--composer
            |
            |--autoload_classmap.php 
            ...
       |--autoload.php
  |--composer.json         

```

#### 添加路由组件

完成项目初始化后,将进行第一个组件的添加, 首先登陆 composer 的包 网站 找到 **route**组件,其中可以看到组件名 **illuminate/routing**组件的详细信息, 这个组件中也有一个composer.json文件 文件中有所依赖的其他组件,包括 **symfony/routing**等组件,但是该组件还有一个 **illuminate/events**组件没有包含,需要在添加路由组件时一起添加,所以修改 composer.json 文件如下:

```
{
   "require":{
      "illuminate/routing":"*"
      "illuminate/events":"*"
   }
}
```
修改后然后执行 compoer update 命令，然后就会看到在vendor 目录下多了该插件的目录,或者我们可以修改 composer.json文件,直接运行下面命令,也会完成组件的安装:

```
composer require "illuminate/routing":"*"
composer require "illuminate/events":"*"
```



在完成路由组件的添加后该如何使用呢? 首先需要添加两个文件,一个是路由文件,另外一个事服务器程序入口文件。按照laravel框架的架构, 我们在 lara目录下创建一个app目录, 该目录主要存储项目开发的文件, 在该目录下创建一个Http目录，该目录用户存储处理Http请求的文件,在http目录下在创建一个routes.php文件,该文件就是索要创建的路由文件,添加路由文件只要代码如下:

**routes.php**

```php
<?php
$app['route']->get('/',function(){
  return '<h1>路由成功</h1>'
})

```

创建程序入口文件,按照laravel框架架构,public下面 有一个 index.php:

**index.php**

```php
<?php
// 调用自动加载文件, 添加自动加载函数

require __DIR__.'/../vendor/autoload.php';
//实例化服务容器,注册事件,路由服务提供者

$app = new Illuminate\Container\Container;
with(new Illuminate\Events\EventServiceProvider($app))->register();
with(new Illuminate\Routing\RoutingServiceProvider($app))->register();

//加载路由
require __DIR__ .'/../routes/routes.php';

//实例化请求并分发处理请求
$request = Illuminate\Http\Request::createFromGlobals();
$response = $app['router']->dispatch($request);

//返回请求想要
$response->send();

```

完成上述两个文件的添加后,通过访问网站根目录就可以得到相应的路由响应.在laravel 框架中一些功能 的生成都需要服务容器来实现,即, **Illuminate\Container\Container** 类的实例, 服务容器用于服务注册和解析,也就是说向服务容器注册能够实现某些功能的实例或回调函数,当需要使用这个功能从服务器中获取相应的实例来完成.

#### 添加控制器模块

按照laravel 目录架构, 在Http目录下创建Controllers目录.为了实现文件自动加载,这里使用 psr-4 进行自动加载.修改composer.json文件如下:

```
{
    "require": {
        "illuminate/routing": "*",
        "illuminate/events": "*"
    },
	"authoload":{
		"psr-4":{
			"App\\":"app/"
		}
	}
}
```
修改完composer.json后, 执行命令 **composer dump-autoload** 更新自动加载文件.

然后在Controllers 目录下 新建 indexController 控制器文件,内容如下:

```php
<?php

namespace App\Http\Controllers;

class IndexController 
{
	public function index() {
		return '<h1>控制器成功</h1>';
	}
}
```
然后在路由文件中 **routes.php** 中添加一条路由配置,内容如下:

```php
<?php
$app['router']->get('/',function(){
	return 123;
});

$app['router']->get('welcom','App\Http\Controllers\IndexController@index');
```
然后通过访问这个路由就会得到响应。


#### 添加模型组件

模型组件相当于MVC中的M 主要实现数据处理功能, laravel 框架中的 模型组件是 **illuminate/database** 来完成的。同理, 安装 组件 修改 **composer.json**文件运行 **composer update** 或者通过 

```
composer require "illuminate/database":"*" 
```
来完成安装。

**illuminate/database** 组件主要用来操作数据库, 提供了两种数据库操作的方式:

- 查询构造器方式

- Eloquent ORM 方式

这里使用Eloquent ORM 方式, 通过该方式操作数据库非常简单。按照 laravel框架的目录架构, 在lara 目录下创建config 文件夹, 该文件夹用于存放整个应用程序的配置文件,在该文件夹下创建 **database.php** 文件,用于存储对数据库的配置信息,内容如下:

```php
<?php

return [
	'driver'=>'mysql',
	'host'=>'localhost',
	'database'=>'test',
	'username'=>'root',
	'password'=>'root',
	'charset'=>'utf8',
	'collation'=>'utf8_general_ci',
	'prefix'=>''
];
```

在完成数据库配置后需要启动 **Eloquent ORM** 模块,这部分工作在入口文件(**index.php**)中实现的,具体内容是:

```php
<?php
// 调用自动加载文件, 添加自动加载函数

require __DIR__.'/../vendor/autoload.php';
//实例化服务容器,注册事件,路由服务提供者

$app = new Illuminate\Container\Container;
with(new Illuminate\Events\EventServiceProvider($app))->register();
with(new Illuminate\Routing\RoutingServiceProvider($app))->register();


//启动 Eloquent ORM 模块并进行相关配置

$manager = new Illuminate\Database\Capsule\Manager();
//加入数据库配置文件
$manager->addConnection(require '../config/database.php');
$manager->bootEloquent();


//加载路由
require __DIR__ .'/../routes/routes.php';

//实例化请求并分发处理请求
$request = Illuminate\Http\Request::createFromGlobals();
$response = $app['router']->dispatch($request);

//返回请求想要
$response->send();

```

通过 addConnection() 函数完成数据库相关配置, 并通过 bootEloquent() 函数完成数据库 Eloquent ORM 模块的启动.在启动完成后,就可以操作数据库了。

Eloquent ORM 方式操作数据库需要两个步骤:

- 创建模型类

- 通过模型类的方法操作数据��。

##### 模型类创建

与laravel 框架目录一致， 在app目录下创建 Models目录 在里面创建一个模型类,代码如下:

```php
<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Menu extends Model 
{
	protected $table = "menus";
	public $timestamps = false;
}
```
模型创建完后, 操作数据库,查询数据, 修改  IndexController代码:

```php
<?php

namespace App\Http\Controllers;
use App\Models\Menu;
class IndexController  
{
	public function index() {
		$menu = Menu::first();
		$data = $menu->getAttributes();
		echo '<pre>';
		var_dump($data);
	}
}
```
在浏览器窗口访问,运行结果如下:

```php
array(10) {
  ["id"]=>
  int(1)
  ["name"]=>
  string(6) "系统"
  ["url"]=>
  string(11) "admin/menus"
  ["slug"]=>
  string(13) "system.manage"
  ["icon"]=>
  string(10) "fa fa-cogs"
  ["parent_id"]=>
  int(0)
  ["heightlight_url"]=>
  string(0) ""
  ["sort"]=>
  int(0)
  ["created_at"]=>
  string(19) "2017-08-15 13:07:48"
  ["updated_at"]=>
  string(19) "2017-08-15 13:07:48"
}
```
至此, 模型组件添加完成。


#### 添加视图组件

laravel 框架中的视图组件是 **illuminate/view**, 该组件可以将视图以模板的方式创建,在其他数控中可以调用,继承已经创建的模板。同理, 安装 组件 修改 **composer.json**文件运行 **composer update** 或者通过 

```
composer require "illuminate/view":"*" 
```
来完成安装。

视图组件的使用更需要四步:

- 添加视图模板文件和编译文件的存储路径

- 对视图进行相关配置和服务注册

- 使用视图文件

- 创建视图模板文件

按照laravel 框架目录结构,新建 **resources** 目录,在resources目录中新建 **views** 目录用来存放模板文件, 模板编译文件放在 **storage/framework/views/** 目录下.

接下来完成视图组件的相关配置和服务注册，同理,修改 入口文件 **index.php**,内容如下:

```php
<?php
// 调用自动加载文件, 添加自动加载函数

require __DIR__.'/../vendor/autoload.php';
//实例化服务容器,注册事件,路由服务提供者

$app = new Illuminate\Container\Container;
// 通过服务容器中的 setInstance() 静态方法 将服务容器实例添加为静态属性, 这样就可以在任何位置获取服务容器实例
Illuminate\Container\Container::setInstance($app);
with(new Illuminate\Events\EventServiceProvider($app))->register();
with(new Illuminate\Routing\RoutingServiceProvider($app))->register();


//启动 Eloquent ORM 模块并进行相关配置
$manager = new Illuminate\Database\Capsule\Manager();
//加入数据库配置文件
$manager->addConnection(require '../config/database.php');
$manager->bootEloquent();

//通过服务容器实例的instancce()方法 将服务名称为 config 和 Fluent的实例进行绑定,主要用于存储视图慕课的配置信息。
$app->instance('config',new Illuminate\Support\Fluent());
//配置模板编译目录路径
$app['config']['view.compiled'] = "D:\\phpStudy\\WWW\\test\\lara\\storage\\framework\\views";
$app['config']['view.paths'] = ["D:\\phpStudy\\WWW\\test\\lara\\resources\\views"];
with(new Illuminate\View\ViewServiceProvider($app))->register();
with(new Illuminate\Filesystem\FilesystemServiceProvider($app))->register();


//加载路由
require __DIR__ .'/../routes/routes.php';

//实例化请求并分发处理请求
$request = Illuminate\Http\Request::createFromGlobals();
$response = $app['router']->dispatch($request);

//返回请求想要
$response->send();

```

接下来使用一下模板, 在 **resouecs/views** 目录先新建一个 模板文件  **index.balde.php**, 然后去修改  **IndexController** 控制器,加载这个模板:

**IndexController.php** 代码如下:

```php
<?php

namespace App\Http\Controllers;
use App\Models\Menu;
class IndexController  
{
	public function index() {
		$menu = Menu::first();
		$data = $menu->getAttributes();
		$app = \Illuminate\Container\Container::getInstance();
		$factory = $app->make('view');
		return $factory->make('index')->with('data',$data);
	}
}
```

首先通过 getInstance() 静态方法获取服务容器实例, 然后通过容器获取服务名称 为 view 的实例对象即 为视图创建工厂类(Illuminate\View\Factory)实例, 接着通过视图创建工厂的make()方法来创建视图实例对象,其中参数维视图文件名称,最后通过视图实例的with() 方法添加数据。


**index.blade.php** 代码如下:

```html
<h1>这个是查询的数据</h1>
<pre>
{{ print_r($data) }}
```
至此, 通过几个简单的步骤 Laravel 框架的骨骼就出来了, 具体代码:

[代码地址](https://github.com/Neroxiezi/LaravelTechnicalDetails/tree/master/lara)

