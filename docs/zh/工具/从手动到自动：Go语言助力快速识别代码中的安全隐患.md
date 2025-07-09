---
title: 从手动到自动：Go语言助力快速识别代码中的安全隐患
date: 2024-10-10 09:08:02
tags:
  - 工具
  - golang
description: 从手动到自动：Go语言助力快速识别代码中的安全隐患
author: PFinal南丞
keywords: 从手动到自动：Go语言助力快速识别代码中的安全隐患, 工具, golang, 文件, 搜索, 工具, 安全, 自动化, 代码审查, 安全测试,AI,ai
---

# 从手动到自动：Go语言助力快速识别代码中的安全隐患

## 背景

在维护旧的`PHP`项目时，常常需要在项目文件中查找一些`敏感词`，比如以下这些内容:

```
user=
password=
key=
ssh-
ldap:
mysqli_connect
sk-
pass=
pwd=
eval

```

为了简化这一过程，我使用`Go`语言编写了一个小工具，用来自动化提取关键词。工具的工作原理非常简单，通过快速遍历机器上的所有文件，寻找其中包含特定敏感词的文件内容。这个工具不仅可以加快开发和维护过程中的敏感信息筛查，还可以作为内网安全测试的辅助工具，帮助识别潜在的安全漏洞。
## 代码实现

下面是核心功能的代码片段。它包含两个主要功能：一个用于遍历目录，找到指定文件扩展名的文件；另一个用于在文件中查找特定的关键词并返回匹配的行。

```go

func searchFiles(directory string, extensions []string) ([]string, error) {
	var files []string
	err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			for _, extension := range extensions {
				if strings.HasSuffix(info.Name(), extension) {
					files = append(files, path)
					break
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}

func searchContent(filePath string, content string) ([][]string, error) {
	var matchingLines [][]string
	file, err := os.Open(filePath)
	if err != nil {
		return nil, errors.New("[-] Error opening file " + filePath)
	}
	defer func(file *os.File) {
		_ = file.Close()
	}(file)

	scanner := bufio.NewScanner(file)
	lineNum := 1
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, content) {
			matchingLines = append(matchingLines, []string{fmt.Sprint(lineNum), line})
		}
		lineNum++
	}
	if err := scanner.Err(); err != nil {
		return nil, errors.New("[-] Error reading file " + filePath)
	}
	return matchingLines, nil
}

```


## 工具使用

该工具已经在`GitHub`上开源，用户可以通过以下链接进行下载和使用：

下载地址: https://github.com/PFinal-tool/pf_find

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202410101806197.png)


![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202410101804205.png)

工具使用非常简单，以下是一个使用示例：

```shell

./pf_find -n .txt,.ini,.yaml,.php,.jsp,.java,.xml,.sql -c "password=" -d ~/www/crm/
 
```

其中：
- `-n`：指定要搜索的文件扩展名，例如`.txt`、`.php`、`.xml`等。
- `-c`：指定要查找的关键词，比如`password=`。
- `-d`：指定要搜索的目录。

当程序执行完毕后，所有找到的结果会被记录到名为`findout.txt`的文本文件里。每条记录都包含了文件路径、相关行号以及具体的匹配内容，便于进一步分析

```php

[+] File Path: www/jianxin/App/Lib/ORG/Tcpdf/tcpdf.php
[=] Line Rows: 2
[~] In Line 13404: public function setSignature($signing_cert='', $private_key='', $private_key_password='', $extracerts='', $cert_type=2, $info=array(), $approval='') {
[~] In Line 13507: public function setTimeStamp($tsa_host='', $tsa_username='', $tsa_password='', $tsa_cert='') {

[+] File Path: www/jianxin/App/Runtime/Cache/d089722c00dd89ed9c5a16e06d674647.php
[=] Line Rows: 1
[~] In Line 1659: url: "<?php echo U('user/reset_password');?>&id="+user_id+'&new_password='+new_pass,

[+] File Path: www/jianxin/invoice/InvoiceOpenApi/Protocol/InvoiceClient.php
[=] Line Rows: 1
[~] In Line 92: $data          = "timestamp={$timestamp}&password={$password}&method={$method}&grant_type=password&client_secret={$client_secret}&version={$version}&client_id={$client_id}&username={$username}";

```

小工具用起来还是很方便的.

## 扩展用途

除了常规的敏感信息查找之外，这款小工具还有着广泛的应用场景。尤其是在网络安全领域，它可以帮助红队成员或是内部安全团队在进行渗透测试时快速定位潜在的风险点。通过对目标主机上存储的各种文档和配置文件进行细致检查，可以揭示出不少未被注意到的安全隐患，如硬编码的凭据、不安全的API调用等。因此，对于提升整体IT环境的安全性来说，这样一个简单但高效的辅助工具有着不可忽视的价值。
