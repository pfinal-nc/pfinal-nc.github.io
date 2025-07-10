---
title: Publish Personal Tools with Homebrew Tap
date: 2024-08-21 09:49:32
tags:
  - tools
description: Introduction to a tool for quickly creating Golang projects and distributing them via Homebrew Tap.
author: PFinal南丞
keywords: Publish Personal Tools with Homebrew Tap, golang, project creation, quick creation, tools, project, quick, AI, ai
---

# Publish Personal Tools with Homebrew Tap

## Background

Previously, I used Go's cobra/cobra library to develop a command-line tool, which greatly simplified many daily tasks. When colleagues saw this tool, they also wanted to try it. At first, I planned to distribute it directly via GitHub Actions, letting them download and use it themselves. However, since some colleagues have trouble accessing GitHub from within China and most of them are MacOS users, I decided to use the more convenient Homebrew for distribution. Homebrew is a very popular package manager on MacOS, making it easy to install and manage various software packages.

So, I decided to automate the tool's release using GitHub Actions and GoReleaser, and distribute it via Homebrew, so colleagues can simply run `brew install` to easily install and use the tool.

![CLI Example](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408211037928.png)

### Packaging with GitHub Actions

Before using GitHub Actions for packaging, we first need to create a tag for the project. This tag will be used to identify the version and trigger the GitHub Actions workflow.

#### Step 1: Tag the Project

Use the following commands to create a tag and push it to the remote repository:

```shell
git tag v1.0.0
git push origin v1.0.1
```

Now, our first version tag v1.0.0 is created and pushed to GitHub, ready for automated release.

#### Step 2: Configure GitHub Actions Workflow

Next, we need to create a GitHub Actions workflow configuration file (.yml) in the project to define how to build, test, and release the tool. Here is a sample configuration:

```yml
# This workflow will build a golang project
# For more information see: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-go

name: Go

on:
  push:
    branches: [ "master" ]
    tags:
      - 'v*.*.*'
  pull_request:
    branches: [ "master" ]

jobs:

  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        goos: [linux, darwin, windows]
        goarch: [amd64, arm64]

    steps:
    - uses: actions/checkout@v4

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: "1.22"

    - name: Build
      run: |
          mkdir -p ./dist/${{ matrix.goos }}_${{ matrix.goarch }}
          GOOS=${{ matrix.goos }} GOARCH=${{ matrix.goarch }} go build -o ./dist/${{ matrix.goos }}_${{ matrix.goarch }}/pf_tools-${{ matrix.goos }}_${{ matrix.goarch }}${{ matrix.goos == 'windows' && '.exe' || '' }} -v ./main.go
    - name: Test
      run: go test -v ./...
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: pf_tools-${{ matrix.goos }}_${{ matrix.goarch }}
        path: ./dist/${{ matrix.goos }}_${{ matrix.goarch }}/pf_tools*

  release:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - name: Download Linux artifacts
        uses: actions/download-artifact@v3
        with:
          name: pf_tools-linux_amd64
          path: ./dist/linux_amd64/

      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: pf_tools-darwin_amd64
          path: ./dist/darwin_amd64/

      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: pf_tools-darwin_arm64
          path: ./dist/darwin_arm64/

      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: pf_tools-windows_amd64
          path: ./dist/windows_amd64/

      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false

      - name: Upload Release Asset Linux
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./dist/linux_amd64/pf_tools-linux_amd64
          asset_name: pf_tools-linux_amd64
          asset_content_type: application/octet-stream

      - name: Upload Release Asset macOS amd
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./dist/darwin_amd64/pf_tools-darwin_amd64
          asset_name: pf_tools-darwin_amd64
          asset_content_type: application/octet-stream

      - name: Upload Release Asset macOS arm
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./dist/darwin_arm64/pf_tools-darwin_arm64
          asset_name: pf_tools-darwin_arm64
          asset_content_type: application/octet-stream

      - name: Upload Release Asset Windows
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./dist/windows_amd64/pf_tools-windows_amd64.exe
          asset_name: pf_tools-windows_amd64.exe
          asset_content_type: application/octet-stream
```

With this GitHub Actions configuration, we can automatically build, test, and release the tool for various platforms (Linux, macOS, Windows), and publish the built binaries to the corresponding Release version.

The final Release contains the following files:

```
pf_tools-linux_amd64
pf_tools-darwin_amd64
pf_tools-windows_amd64.exe
```

![Release Example](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408211047896.png)

### Publish to Homebrew

To allow other users to easily install and use our tool via Homebrew, we need to publish it to Homebrew.

#### Preparation

In the previous steps, we have generated the tool binaries for each platform. Next, we need to copy the download links for these files and create a Ruby formula file (.rb), which will be used to define how to install our tool in Homebrew.

![Homebrew Formula Example](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408211059511.png)

#### Create Homebrew Formula

Run the following command to create an initial Homebrew formula file:

```shell
brew create https://github.com/PFinal-tool/pf_tools/releases/download/v1.0.0/pf_tools-darwin_amd64
```
**PS:** If you get the error "No available tap homebrew/core.", it means homebrew/core is not installed. Run **brew tap --force homebrew/core** to install it.

After creating the formula, an initial .rb file will be generated, with content like this:

```rb
# Documentation: https://docs.brew.sh/Formula-Cookbook
#                https://rubydoc.brew.sh/Formula
# PLEASE REMOVE ALL GENERATED COMMENTS BEFORE SUBMITTING YOUR PULL REQUEST!
class PfTools < Formula
  desc "A command-line tool developed with Go"
  homepage ""
  url "https://github.com/PFinal-tool/pf_tools/releases/download/v1.0.0/pf_tools-darwin_amd64"
  sha256 "ea263aa15e0b5376d1238fbe3d9c394cda335679ab4a0f44467a5cd6eb03334b"
  license "NOASSERTION"

  # depends_on "cmake" => :build

  def install
    # Remove unrecognized options if they cause configure to fail
    # https://rubydoc.brew.sh/Formula.html#std_configure_args-instance_method
    system "./configure", "--disable-silent-rules", *std_configure_args
    # system "cmake", "-S", ".", "-B", "build", *std_cmake_args
  end

  test do
    # `test do` will create, run in and delete a temporary directory.
    #
    # This test will fail and we won't accept that! For Homebrew/homebrew-core
    # this will need to be a test that verifies the functionality of the
    # software. Run the test with `brew test pf_tools`. Options passed
    # to `brew install` such as `--HEAD` also need to be provided to `brew test`.
    #
    # The installed folder is not in the path, so use the entire path to any
    # executables being tested: `system bin/"program", "do", "something"`.
    system "false"
  end
end
```

This is a configuration file for a single platform. To support multiple platforms, we need to modify it:

```rb
class PfTools < Formula
  desc "A collection of command-line tools"
  homepage "https://github.com/PFinal-tool/pf_tools"
  version "1.0.1"
``` 