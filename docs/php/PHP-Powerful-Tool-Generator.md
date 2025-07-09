---
title: PHP Powerful Tool - Generator
date: 2022-05-04 15:29:24
tags:
    - PHP
description: PHP Powerful Tool - Generator
author: PFinal南丞
keywords: PHP, generator, analysis, PHP generator, PHP generator analysis, PHP generator analysis
---

# PHP Powerful Tool - Generator

Generators are similar to iterators, but unlike standard PHP iterators, PHP generators do not require a class to implement the Iterator interface, thus reducing class overhead and burden. Generators calculate and yield the value to be iterated each time as needed, which greatly impacts application performance: imagine if a standard PHP iterator frequently performs iteration operations in memory, it needs to precompute the dataset, resulting in poor performance; if you need to compute a large amount of data in a specific way, such as operating on Excel data, the performance impact is even greater. At this time, we can use generators to compute and yield subsequent values on demand, without occupying precious memory space.

A generator is also a function, but the difference is that the return value of this function is returned one by one, not just a single value. In other words, generators make it easier for you to implement the iterator interface.


### Example 1:

```php
function crange($number) {
    $data = [];
    for($i=0;$i<$number;$i++) {
        $data[] = time();
    }
    return $data;
}

```
The above is a normal function to generate an array. Calling *crange(10)* is fine, but if you call *crange(10000000)*, you will find:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220704161236.png)

Memory crashes. To solve this, optimize as follows:

```php
   function crange($number){
        for($i=0;$i<$number;$i++){
            yield $i;
        }
    }

```
As shown above, use the keyword *yield*.

```php
  $data = crange(10000000);
  //var_dump($data);  When calling the function, it returns a Generator object
  //Use foreach to iterate, each iteration implicitly calls current(), next(), key(), valid(), etc. (methods in the Generator class)
  foreach($data as $num) {
      var_dump($num);
  }
```
The above function prints results effortlessly, because the generator only needs to allocate memory for one integer at a time.

### Example 2:

```php
//Generate key-value pairs
$input = <<<EOF
1;PHP-The best language in the world
2;Python-Needless to say
3;Ruby-I don't know it
EOF;
function input_parser($input) {
    foreach (explode("\n", $input) as $line) {
        $fields = explode(';', $line);
        $id = array_shift($fields);
        yield $id => $fields;
    }
}

foreach (input_parser($input) as $id => $fields) {
    echo "$id:\n";
    echo "    $fields[0]\n";
}
```

### Example 3:

```php
//Generate an array with 10,000,000 null values
function xrange($number) {
    for($i=1;$i<=$number;$i++) {
        yield $i;
    }
}
$data = xrange(10000000);
foreach($data as $k=>$val) {
     echo $val."\n";
}
// Here, xrange and range functions have the same effect, both produce an iterable variable, but the difference is that the range function is like preloading in ORM, while xrange is lazy loading, only generating the value when iterated to that point, so xrange does not need to allocate large memory to store variables, greatly saving memory and improving efficiency.
```

After reading the above examples, you may think they are not very practical. Let's look at the following examples:

### Example 4:

```php
//Read log file
/**
 * Read log file
 * @param $path
 */
function get_log($path)
{
    $result = fopen($path,'a+');
    try {
        while (!feof($result)) {
            $line = fgets($result);
            var_dump($line);
        }
    } finally {
        fclose($result);
    }
}

get_log('./error.log');
//The above function is fine in general, but if the error.log file is very large, it will crash

function get_log_y($path)
{
    $result = fopen($path,'a+');
    try {
        while (!feof($result)) {
            yield fgets($result);
        }
    } finally {
        fclose($result);
    }
}

$data = get_log_y('./error.log');
foreach ($data as $val) {
    echo $val;
}
//Using the function below to read is much faster
``` 