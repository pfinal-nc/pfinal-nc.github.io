---
title: Laravel-admin Special Routing Operations
date: 2022-07-04 15:29:24
tags:
    - PHP
    - Laravel
description: Special routing operations in Laravel-admin
author: PFinal南丞
keywords: PHP, process, thread, analysis, PHP process, PHP thread, PHP process thread, PHP process thread analysis, PHP process thread analysis
---

# Laravel-admin Special Routing Operations

#### Background

Recently, while refactoring a project, I implemented table partitioning for the previous database tables. The design structure is as follows:

```
apps                // Application table
app_channel_appuuid // Channel table (the table name is app_channel_ concatenated with the corresponding appuuid)
app_versions_appuuid // Version table (the table name is app_version_ concatenated with the corresponding appuuid)
```

As shown above, the entire routing no longer uses *resource* routes. The routes are as follows:

```
    // Channel management
    $router->get('/channel/{app_id?}', 'ChannelController@index')->name('channel');
    $router->get('/channel/{app_id}/create', 'ChannelController@create')->name('channel.create');
    $router->post('/channel/{app_id}', 'ChannelController@store')->name('channel.store');
    $router->get('/channel/{app_id}/{id}/edit', 'ChannelController@edit')->name('channel.edit');
    $router->put('/channel/{app_id}/{id}', 'ChannelController@update')->name('channel.update');
```

#### Modification (Edit/Add Operation Path)

Since the backend framework uses *laravel-admin*, the add and edit button paths are as shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722143932.png)

It was found that the specified app_id was not included. After searching the official documentation without finding a solution, I checked the source code and found a method in **Grid.php**:

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

Then, add the following line in the grid method of the controller:

```php
$grid->setResource(route('admin.channel') . '/' . $app_info->id);
```

The path will then be correct:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722144356.png)

#### Modification (Delete Operation)

The delete operation provided by **laravel-admin** is not suitable here, so it was disabled first:

```php
$actions->disableDelete();
```

Then, a custom delete operation was created:

```shell
php artisan admin:action Channel\DeleteAppChannel --grid-row --name="Delete"
```

```php
namespace App\Admin\Actions\Channel;

use Encore\Admin\Actions\RowAction;
use Illuminate\Database\Eloquent\Model;

class DeleteAppChannel extends RowAction
{
    public $name = 'Delete';

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

Here, a problem was encountered: since the model's table is dynamically concatenated, directly operating like this would result in the table not being found. So, the following change was made: add an app_Info property to the DeleteAppChannel class and a method:

```php
public function setAppId($app_info): static
{
    $this->app_info = $app_info;
    return $this;
}
```

Then modify the grid as follows:

```php
$obj = new DeleteAppChannel();
$actions->add($obj->setAppId($app_info));
```

Specifying the table name in the model within handle did not work well. After checking the source code, it was found that the system's delete operation uses **pajax** to pass the specified model and key for the operation, as shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722145722.png)

Through reflection, the _model and _key parameters are used to query and delete the corresponding data. The final solution was to see if app_uuid could also be passed during this process, so that the corresponding table name could be specified during the query. Without modifying the framework code, the following method was found:

```php
/**
 * @return array
 */
public function parameters()
{
    return ['_model' => $this->getModelClass()];
}
```

> This method is in **GridAction**. **RowAction** inherits from **GridAction**, and the custom action inherits from **RowAction**.

So, override **parameters** in the custom **DeleteAppChannel** method:

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

This passes the corresponding app's app_uuid:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220722150533.png)

Finally, override the **retrieveModel** method in **RowAction** to specify the model's table:

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