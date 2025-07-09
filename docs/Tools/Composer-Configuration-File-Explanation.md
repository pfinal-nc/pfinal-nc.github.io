---
title: Composer Configuration File Explanation
date: 2022-07-04 17:34:31
tags:
    - PHP

description: Introduction to the basic concepts and usage of Composer configuration files, including file location, dependency management, package management, version control, etc.
author: PFinal Nancheng
keywords: Composer, configuration file, dependency management, package management, version control, AI, ai
---

# Composer Configuration File Explanation

### Installation

To install Composer, you only need to download the composer.phar executable file.

> curl -sS https://getcomposer.org/installer | php

To check if Composer is working properly, just run the PHAR with php:

> php composer.phar

This will return a list of executable commands.

**Note:** You can also run with the --check option without downloading Composer. For more information, use --help.

> curl -sS https://getcomposer.org/installer | php -- --help

### composer.json: Project Installation

To start using Composer in your project, you only need a composer.json file. This file contains the project's dependencies and some other metadata.

This JSON format is easy to write. It allows you to define nested structures.

**About the require Key**

The first thing (and often the only thing) you need to do is specify the value of the require key in the composer.json file. You just need to tell Composer which packages your project depends on.

```json
{
    "require": {
        "monolog/monolog": "1.0.*"
    }
}
```

You can see that require needs a package name (e.g., monolog/monolog) mapped to a version (e.g., 1.0.*).

- **Package Name**

The package name consists of the vendor name and the project name. This helps avoid naming conflicts.

It allows two different people to create libraries with the same name, which will be named like igorw/json and seldaek/json.

Here we need to introduce monolog/monolog. For a project with a unique name, we recommend doing this. It also allows you to add more related projects in the same namespace later. If you maintain a library, this makes it easy to split it into smaller parts.

- **Package Version**

In the example above, we introduced monolog version 1.0.*. This means any development branch starting from 1.0, matching 1.0.0, 1.0.2, or 1.0.20.

Version constraints can be specified in several ways.

> Name	Example	Description
>
> Exact version	1.0.2	You can specify the exact version of the package.
>
> Range	>=1.0 >=1.0,<2.0 >=1.0,<1.1|>=1.2	You can specify valid version ranges using comparison operators.
>
> Valid operators: >, >=, <, <=, !=.
>
> You can define multiple ranges separated by commas, which will be treated as a logical AND. A pipe | will be treated as a logical OR. AND has higher precedence than OR.
>
> Wildcard	1.0.*	You can use the wildcard * to specify a pattern. 1.0.* is equivalent to >=1.0,<1.1.
>
> Tilde operator	~1.2	This is very useful for projects following semantic versioning. ~1.2 is equivalent to >=1.2,<2.0.

**Next important version (tilde operator)**

~ The best way to explain is with an example: ~1.2 is equivalent to >=1.2,<2.0, while ~1.2.3 is equivalent to >=1.2.3,<1.3. As you can see, this is very useful for projects following semantic versioning.

A common usage is to mark the minimum version you depend on, like ~1.2 (allows any version above 1.2 but not including 2.0).

In theory, up to 2.0 there should be no backward compatibility issues, so this works well.

You may also see another usage, using ~ to specify the minimum version but allowing the last digit to increase.

Note: Although 2.0-beta.1 is technically earlier than 2.0, according to version constraint rules, ~1.2 will not install this version. As mentioned before, ~1.2 only allows the .2 part to change, but 1. is fixed.

- **Stability**

By default, only stable releases are considered.

If you want to get RC, beta, alpha, or dev versions, you can use the stability flag. You can set the minimum stability for all packages, not just for each dependency.

### Install Dependencies

To fetch the defined dependencies into your local project, just run the install command with composer.phar.

> php composer.phar install

Following the previous example, this will find the latest version of monolog/monolog and download it to the vendor directory.

It's a good habit to put third-party code into a specific directory like vendor.

If it's monolog, it will create vendor/monolog/monolog.

**Tip:** If you are using Git to manage your project, you may want to add vendor to your .gitignore file. You probably don't want to add all the code to your repository.

Another thing is that the install command will create a composer.lock file in your project's root directory.

### composer.lock - Lock File

After installing dependencies, Composer will write the exact versions installed into the composer.lock file. This locks the project to specific versions.

Please commit your application's composer.lock (and composer.json) to your repository.

This is very important because the install command will check if the lock file exists, and if so, it will download the specified versions (ignoring the definitions in composer.json).

This means anyone setting up the project will get exactly the same dependencies, reducing potential errors in deployment. Even if you work alone, you can safely reinstall the project within six months, even if many new versions have been released since then.

If there is no composer.lock file, Composer will read composer.json and create a lock file. This means if your dependencies have newer versions, you won't get any updates. To update your dependencies, use the update command. This will get the latest matching versions (according to your composer.json) and update the lock file.

> php composer.phar update

If you only want to install or update a single dependency, you can whitelist them:

> php composer.phar update monolog/monolog [...]

**Note:** For libraries, it's not always recommended to commit the lock file. See: Lock file for libraries.

### Packagist

Packagist is the main repository for Composer.

A Composer repository is basically a source of packages: it records where packages can be found. Packagist aims to be the central storage platform for everyone using Composer.

This means you can require any package from there.

When you visit the packagist website (packagist.org), you can browse and search for packages.

Any open-source project supporting Composer should publish its package on packagist. Although you don't have to publish on packagist to use Composer, it makes our programming life much easier.

### Autoloading

For library autoloading, Composer generates a vendor/autoload.php file. You can simply include this file to get free autoloading support.

> require 'vendor/autoload.php';

This makes it easy to use third-party code. For example, if your project depends on monolog, you can start using it like this, and it will be autoloaded automatically.

```php
<?php
$log = new Monolog\Logger('name');
$log->pushHandler(new Monolog\Handler\StreamHandler('app.log', Monolog\Logger::WARNING));

$log->addWarning('Foo');
```

You can add your own autoloader in the autoload field of composer.json.

```json
{
    "autoload": {
        "psr-4": {"Acme\\": "src/"}
    }
}
```

Composer will register a PSR-4 autoloader for the Acme namespace.

You can define a mapping from namespace to directory. At this point, src will be in your project's root directory, at the same level as vendor. For example, src/Foo.php should contain the Acme\Foo class.

After adding the autoload field, you should run install again to generate the vendor/autoload.php file.

Including this file will also return an instance of the autoloader, so you can store the return value in a variable and add more namespaces.

This is very useful for automatically loading class files in a test suite, for example.

```php
<?php
$loader = require 'vendor/autoload.php';
$loader->add('Acme\\Test\\', __DIR__);
```

Besides PSR-4 autoloading, classmap is also supported. This allows classes to be autoloaded even if they don't follow PSR-0. See Autoloading - Reference for details.

Note: Composer provides its own autoloader. If you don't want to use it, you can just include vendor/composer/autoload_*.php files, which return an associative array that you can use to configure your own autoloader. 