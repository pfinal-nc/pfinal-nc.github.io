---
title: Laravel Manual Build
date: 2019-01-16 10:00:02
author: PFinal南丞
tag:
    - PHP
    - Laravel 
description: Manually building the Laravel framework, detailing the complete process from project initialization to adding each component.
keywords: Laravel, build, manual, framework, manual build, PHP
---

# Laravel Manual Build

## Manually Building the Laravel Framework
The construction process is divided into project initialization, adding routing components, adding controller modules, adding model components, and adding view components.

#### Project Initialization:

First, create a `lara` folder in the web directory of your server, and create a **composer.json** file in the root directory with the following content:

```
{
   "require":{

   }
}
```
Besides the above method, you can also initialize with composer, then run **composer update**. After successful execution, the `lara` folder will automatically generate the autoload directory as follows:

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

#### Adding Routing Components

After completing project initialization, the first component to add is the routing component. First, log in to the composer package website and find the **route** component. You will see the component name **illuminate/routing** and its details. This component also has a composer.json file listing dependencies, including **symfony/routing** and others. However, it does not include **illuminate/events**, so you need to add it as well. Modify the composer.json file as follows:

```
{
   "require":{
      "illuminate/routing":"*"
      "illuminate/events":"*"
   }
}
```
After modification, run the composer update command. You will see the plugin directory added under vendor. Alternatively, you can modify the composer.json file and run the following commands to install the components:

```
composer require "illuminate/routing":"*"
composer require "illuminate/events":"*"
```

After adding the routing component, how do you use it? First, add two files: a routing file and a server entry file. According to the Laravel framework structure, create an `app` directory under `lara` to store project files. In this directory, create an `Http` directory for handling HTTP requests, and then create a `routes.php` file for routes. The code is as follows:

**routes.php**

```php
<?php
$app['route']->get('/',function(){
  return '<h1>Route Success</h1>';
});
```

Create the entry file, typically `index.php` under the `public` directory:

**index.php**

```php
<?php
// Load the autoload file
require __DIR__.'/../vendor/autoload.php';
// Instantiate the service container and register event and routing service providers
$app = new Illuminate\Container\Container;
with(new Illuminate\Events\EventServiceProvider($app))->register();
with(new Illuminate\Routing\RoutingServiceProvider($app))->register();
// Load routes
require __DIR__ .'/../routes/routes.php';
// Instantiate the request and dispatch
$request = Illuminate\Http\Request::createFromGlobals();
$response = $app['router']->dispatch($request);
// Send the response
$response->send();
```

After adding these two files, you can access the root directory of the website to get the corresponding route response. In Laravel, some features are implemented via the service container, i.e., an instance of **Illuminate\Container\Container**. The service container is used for service registration and resolution, meaning you register instances or callbacks that provide certain features, and retrieve them from the container when needed.

#### Adding Controller Module

According to the Laravel directory structure, create a `Controllers` directory under `Http`. To enable autoloading, use psr-4. Modify composer.json as follows:

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
After modification, run **composer dump-autoload** to update the autoload files.

Then, create an `IndexController` in the `Controllers` directory:

```php
<?php

namespace App\Http\Controllers;

class IndexController 
{
    public function index() {
        return '<h1>Controller Success</h1>';
    }
}
```
Then add a route in **routes.php**:

```php
<?php
$app['router']->get('/',function(){
    return 123;
});

$app['router']->get('welcom','App\Http\Controllers\IndexController@index');
```
Now, accessing this route will give a response.

#### Adding Model Component

The model component, corresponding to the M in MVC, mainly handles data. In Laravel, the model component is **illuminate/database**. Similarly, install the component by modifying **composer.json** and running **composer update**, or:

```
composer require "illuminate/database":"*" 
```

The **illuminate/database** component is mainly for database operations and provides two ways:

- Query Builder
- Eloquent ORM

Here, we use Eloquent ORM, which makes database operations very simple. According to the Laravel structure, create a `config` folder under `lara` for configuration files, and a **database.php** file for database config:

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

After configuring the database, you need to start the **Eloquent ORM** module, which is done in the entry file (**index.php**):

```php
<?php
// Load the autoload file
require __DIR__.'/../vendor/autoload.php';
// Instantiate the service container and register event and routing service providers
$app = new Illuminate\Container\Container;
with(new Illuminate\Events\EventServiceProvider($app))->register();
with(new Illuminate\Routing\RoutingServiceProvider($app))->register();
// Start Eloquent ORM and configure
$manager = new Illuminate\Database\Capsule\Manager();
$manager->addConnection(require '../config/database.php');
$manager->bootEloquent();
// Load routes
require __DIR__ .'/../routes/routes.php';
// Instantiate the request and dispatch
$request = Illuminate\Http\Request::createFromGlobals();
$response = $app['router']->dispatch($request);
// Send the response
$response->send();
```

The `addConnection()` function completes the database configuration, and `bootEloquent()` starts the Eloquent ORM module. After starting, you can operate the database.

Eloquent ORM requires two steps:

- Create a model class
- Operate data via the model class

##### Creating a Model Class

Following the Laravel structure, create a `Models` directory under `app` and a model class:

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

After creating the model, operate the database and modify the `IndexController`:

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

Accessing in the browser, the result is:

```php
array(10) {
  ["id"]=>
  int(1)
  ["name"]=>
  string(6) "System"
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

The model component is now added.

#### Adding View Component

The view component in Laravel is **illuminate/view**, which allows you to create views as templates. Similarly, install the component by modifying **composer.json** and running **composer update**, or:

```
composer require "illuminate/view":"*" 
```

Using the view component involves four steps:

- Add storage paths for view template files and compiled files
- Configure and register view services
- Use view files
- Create view template files

Following the Laravel structure, create a `resources` directory, and under it a `views` directory for templates. Compiled templates go in `storage/framework/views/`.

Next, configure and register the view component in the entry file **index.php**:

```php
<?php
// Load the autoload file
require __DIR__.'/../vendor/autoload.php';
// Instantiate the service container and register event and routing service providers
$app = new Illuminate\Container\Container;
// Set the service container instance as a static property for global access
Illuminate\Container\Container::setInstance($app);
with(new Illuminate\Events\EventServiceProvider($app))->register();
with(new Illuminate\Routing\RoutingServiceProvider($app))->register();
// Start Eloquent ORM and configure
$manager = new Illuminate\Database\Capsule\Manager();
$manager->addConnection(require '../config/database.php');
$manager->bootEloquent();
// Bind config and Fluent instances for view configuration
$app->instance('config',new Illuminate\Support\Fluent());
// Set template compile and view paths
$app['config']['view.compiled'] = "D:\\phpStudy\\WWW\\test\\lara\\storage\\framework\\views";
$app['config']['view.paths'] = ["D:\\phpStudy\\WWW\\test\\lara\\resources\\views"];
with(new Illuminate\View\ViewServiceProvider($app))->register();
with(new Illuminate\Filesystem\FilesystemServiceProvider($app))->register();
// Load routes
require __DIR__ .'/../routes/routes.php';
// Instantiate the request and dispatch
$request = Illuminate\Http\Request::createFromGlobals();
$response = $app['router']->dispatch($request);
// Send the response
$response->send();
```

Next, use a template. First, create a template file **index.blade.php** in `resources/views`, then modify the **IndexController** to load this template:

**IndexController.php**:

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

First, get the service container instance via `getInstance()`, then get the view factory (`Illuminate\View\Factory`) from the container, create a view instance with `make()`, and pass data with `with()`.

**index.blade.php**:

```html
<h1>This is the queried data</h1>
<pre>
{{ print_r($data) }}
```

With these simple steps, the skeleton of the Laravel framework is complete. For the full code:

[Code Address](https://github.com/Neroxiezi/LaravelTechnicalDetails/tree/master/lara) 