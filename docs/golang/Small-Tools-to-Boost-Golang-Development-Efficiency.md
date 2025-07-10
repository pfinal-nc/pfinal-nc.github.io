---
title: Small Tools to Boost Golang Development Efficiency
date: 2024-11-09 11:31:32
tags:
    - golang
    - tools
description: Introduces some small tools that can improve Golang development efficiency, including gofumpt, goimports, gopls, etc., to help developers write higher-quality Go code.
author: PFinal南丞
keywords: Golang, tools, efficiency, improvement, small tools, code quality, development, programming, tools, auto-formatting, auto-import, code completion, AI
sticky: true
---

# Small Tools to Boost Golang Development Efficiency

At the end of the year, while quickly fixing bugs in some old projects and iterating updates more frequently, I found that the old projects were not deployed with Git but still used the original FTP drag-and-drop method. Since I develop locally on a Mac, every time I need to deploy code, I have to package the updated code into a .zip and send it to operations. However, the compressed files always contain .DS_Store files, which operations have to manually delete after extraction, and I've been complained about this many times. So before sending, I always run *ls -a* and manually delete .DS_Store files, which is a bit annoying. Therefore, I wrote a small tool to delete .DS_Store files and improve efficiency.

#### Effect

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202401250948067.png)

#### Implementation Idea

The implementation is simple: traverse all directories under the target project, find .DS_Store files, and delete them.

```go
// ... Go code unchanged ...
```

Used *filepath.Walk* to traverse the specified directory and delete .DS_Store files.

Previously, I also introduced using *terminal small tools for development*, and here I directly integrated it in.

Run *cobra-cli add*:

```shell
cobra-cli add pf_cd  # Add a pf_cd command
```

This generates a *pfCd.go* file, which you then modify:

```go
// ... Go code unchanged ...
```

When running **Run**, it checks whether a directory is specified. If not, it uses the current directory. No path validation is done here; you need to modify it according to your actual situation.

After completing these, you can run:

```shell
go install
```

Install it locally and enjoy using it. Also, add a help introduction for the tool, and add the pf_cd command to the pf_tools help introduction, as shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202401251059984.png)

#### Finally

This is just a simple introduction. For the specific implementation, you can check the source code:

https://github.com/PFinal-tool/pf_tools 