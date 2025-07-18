---
title: PHP 大杀器之生成器
date: 2022-05-04 15:29:24
tags:
    - PHP
description: PHP 大杀器之生成器
author: PFinal南丞
keywords: PHP, 生成器, 解析, PHP生成器, PHP生成器解析, PHP生成器解析, PHP 大杀器之生成器, PHP生成器编程, PHP yield关键字, PHP内存优化, PHP迭代器, PHP生成器教程, PHP生成器最佳实践, PHP生成器应用, PHP生成器性能优化, PHP生成器内存管理, PHP生成器实战, PHP生成器技术
---

# PHP 大杀器之生成器

生成器和迭代器有点类似，但是与标准的PHP迭代器不同，PHP生成器不要求类实现Iterator接口，从而减轻了类的开销和负担。生成器会根据需求每次计算并产出需要迭代的值，这对应用的性能有很大的影响：试想假如标准的PHP迭代器经常在内存中执行迭代操作，这要预先计算出数据集，性能低下；如果要使用特定方式计算大量数据，如操作Excel表数据，对性能影响更甚。此时我们可以使用生成器，即时计算并产出后续值，不占用宝贵的内存空间。

生成器也是一个函数,不同的是这个函数的返回值是依次返回,而不是只返回一个单独的值.或者,换句话说,生成器使你能更方便的实现了迭代器接口.


### 实例1:

```php
function crange($number) {
    $data = [];
    for($i=0;$i<$number;$i++) {
        $data[] = time();
    }
    return $data;
}

```
上面是一个普通的生成数组的函数,我们调用 *crange(10)* 也是正常,但是如果我们传递的参数是*crange(10000000)*的时候就会发现,如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220704161236.png)

内存崩了,解决这个问题,优化一下:

```php
   function crange($number){
        for($i=0;$i<$number;$i++){
            yield $i;
        }
    }

```
如上代码所示,使用关键字 *yield*。

```php
  $data = crange(10000000);
  //var_dump($data);  在调用函数的时候 就会返回一个 Generator 的对象
  //用foreach进行遍历，每次遍历都会隐式调用current()、next()、key()、valid()等方法。（Generator类中的方法）
  foreach($data as $num) {
      var_dump($num);
  }
```
上面函数毫无压力的打印出结果，因为生成器每次只需要为一个整数分配内存。

### 实例2:

```php
//生成一个键值对
$input = <<<EOF
1;PHP-全世界最好的语言
2;Python-这个没得说了
3;Ruby-我不认识他
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

### 实例3：

```php
//生成一个有1000000个值为null的数组
function xrange($number) {
    for($i=1;$i<=$number;$i++) {
        yield $i;
    }
}
$data = xrange(10000000);
foreach($data as $k=>$val) {
     echo $val."\n";
}
// 这里在xrange和range函数的效果相同，均是产生了一个可迭代的变量，但是不同的是， range 函数有点像ORM里面常说的 预加载 ，而xrange则是 懒加载 只是等到迭代到那个点才会产生对应的值，因此xrange并不需要分配大块内存来存放变量，大大节约了内存，提升效率。
```

上面几个实例,看了的文都会说,大爷的,没啥实际意义,接下来我们看看下面几个例子:

### 实例4:

```php
//读取日志文件
/**
 * 读取日志文件
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
//上面这个函数,常规的没有啥问题,一旦 error.log 日志文件非常大的时候就会炸掉

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
//使用 下面这个函数读取,速度就会贼溜
```