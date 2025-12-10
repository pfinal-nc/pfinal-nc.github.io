---
title: "如何掌握Laravel-admin特殊路由操作 - PHP 开发完整指南"
date: 2022-07-04 15:29:24
tags:
    - PHP
    - Laravel
description: Laravel-admin特殊路由操作
author: PFinal南丞
keywords: PHP, 进程, 线程, 解析, PHP进程, PHP线程, PHP进程线程, PHP进程线程解析, PHP进程线程解析, Laravel-admin特殊路由操作, Laravel-admin路由配置, Laravel-admin分表设计, Laravel-admin动态路由, Laravel-admin自定义操作, Laravel-admin Grid操作, Laravel-admin删除操作, Laravel-admin路由优化, Laravel-admin最佳实践, Laravel-admin教程
---

# Laravel-admin特殊路由操作

#### 背景

最近在重构项目, 针对之前的数据库表做了 分表设计 设计结构如下:

```
apps 应用表
app_channel_appuuid   渠道表 (渠道表的表名是 app_channel_拼接对应的 appuuid 生成)
app_versions_appuuid  版本表(版本表的表名是 app_version_拼接对应的appuuid 生成)
```

结构如上所示,所以整个路由不在使用 *resource*路由,路由如下:

```
	// 渠道管理
    $router->get('/channel/{app_id?}', 'ChannelController@index')->name('channel');
    $router->get('/channel/{app_id}/create', 'ChannelController@create')->name('channel.create');
    $router->post('/channel/{app_id}', 'ChannelController@store')->name('channel.store');
    $router->get('/channel/{app_id}/{id}/edit', 'ChannelController@edit')->name('channel.edit');
    $router->put('/channel/{app_id}/{id}', 'ChannelController@update')->name('channel.update');
```



#### 修改 (编辑添加操作路径)

由于后台框架使用的是 *laravel-admin*  增加按钮和编辑按钮的路径是如下图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722143932.png)

发现没有带上 指定的 app_id, 搜索官方文档 未找到有效的说明,翻看源码 在 **Grid.php** 找到了一个方法:

```php
/**
     * Set resource path for grid.
     *
     * @param string $path
     *
     * @return $this
     */
    public function setResource($path)
    {
        $this->resourcePath = $path;

        return $this;
    }
```

然后在 控制器的 grid 方法中加一行:

```php
$grid->setResource(route('admin.channel') . '/' . $app_info->id);
```

路径就会正确:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722144356.png)



#### 修改(删除操作)

**laravel-admin** 提供的删除操作,在这里不太适用,所以先屏蔽掉了

```php
$actions->disableDelete();
```

然后自定义了一个删除操作:

```shell
php artisan admin:action Channel\\DeleteAppChannel --grid-row --name="删除"
```

```php
namespace App\Admin\Actions\Channel;

use Encore\Admin\Actions\RowAction;
use Illuminate\Database\Eloquent\Model;

class DeleteAppChannel extends RowAction
{
    public $name = '删除';

    public function handle(Model $model)
    {
        // $model ...

        return $this->response()->success('Success message.')->refresh();
    }
}
```

```php
$grid->actions(function ($actions) {
    $actions->add(new DeleteAppChannel);
});
```

在这里遇到一个问题, 就是由于 model 对应的表示动态拼接的,所以 如果直接这样操作,就会出现 表找不到的情况, 所以做了如下改动,给DeleteAppChannel 类加了一个 属性  app_Info  并且加了一个方法:

```php
 public function setAppId($app_info): static
 {
        $this->app_info = $app_info;
        return $this;
  }
```

然后修改 grid 如下:

```php
 $obj = new DeleteAppChannel();
 $actions->add($obj->setAppId($app_info));
```

然后在 handle 的 model 里指定 表名 发现不太行, 最后只能 翻源码, 发现 系统提供的删除 是通过 **pajax**  传递指定的 model 然后传递指定 key 来操作的, 传递参数如下图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722145722.png)

然后 通过 反射操作  先通过  _model 参数的值 和  _key 的值进行了 查询操作, 查询对应的数据 然后删除的,最后想的办法是  在这个 传递的时候 能否把  app_uuid 也传递过去 然后 查询的时候 指定一下 对应的表名, 在不修改 框架代码的情况下 找到了如下的方法:

```php
/**
     * @return array
     */
    public function parameters()
    {
        return ['_model' => $this->getModelClass()];
    }

```

> 该方法在  **GridAction** 中, 然后 **RowAction** 继承了 **GridAction**，然后自定义的操作又继承了  **RowAction** 

所以在自定义的 **DeleteAppChannel** 方法中重写了一下 **parameters**

```php
public function parameters(): array
    {
        $arr = parent::parameters();
        if ($this->app_info) {
            $arr['app_uuid'] = $this->app_info->uuid;
        }
        return $arr;
    }
```

传递了一下对应APP 的 app_uuid传递过去

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722150533.png)

最后重写了一下 **RowAction** 中的 **retrieveModel** 方法,指定一下model对应的表:

```php
 /**
     * @param Request $request
     *
     * @return mixed
     */
    public function retrieveModel(Request $request): mixed
    {
        if (!$key = $request->get('_key')) {
            return false;
        }
        $modelClass = str_replace('_', '\\', $request->get('_model'));
        if ($this->modelUseSoftDeletes($modelClass)) {
            return $modelClass::withTrashed()->findOrFail($key);
        }
        if ($app_uuid = $request->get('app_uuid')) {
            $obj = new $modelClass;
            $obj->setTable('app_channel_' . $app_uuid);
            return $obj->findOrFail($key);
        }
        return $modelClass::findOrFail($key);
    }
```





