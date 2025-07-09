---
title: Python Version Management Tool - pyenv
date: 2023-04-27 22:10:20
author: PFinal Nancheng
tags: 
    - python
keywords: Python Version Management Tool pyenv, python, tool, python version management, pyenv tutorial, python environment configuration
description: Detailed introduction to pyenv, a powerful Python version management tool, including installation, configuration, version switching, virtual environment management, and other core functions to help developers easily manage multiple Python versions.
---

# Python Version Management Tool - pyenv: The Best Python Version Management Tool

### Preface

Previously, I always used virtualenv and virtualenvwrapper to manage Python virtual environments, but there was a problem: to create a virtual environment for a specific version, you must first install that Python version. For example, if I want to create a virtual environment based on Python 3.6, I must first install Python 3.6 (whether directly or from source, it's troublesome), and then create the virtual environment based on the installed version. Since I learned about pyenv, I hardly use the above tools anymore. (Note: pyenv is not very friendly to Windows platforms.)

### Introduction

> GitHub https://github.com/pyenv/pyenv

### Ubuntu Installation

#### Download

- Method 1 (slow):

```
    git clone https://github.com/yyuu/pyenv.git ~/.pyenv
```

- Method 2 (fast):

```
    curl -L https://raw.githubusercontent.com/pyenv/pyenv-installer/master/bin/pyenv-installer | bash
```

After executing the above, pyenv will be installed in the ~/.pyenv directory of the current user.

#### Edit .bashrc file

1. Open the .bashrc file

```
vim ~/.bashrc
```

2. Copy the following content to the end
```
export PYENV_ROOT=/root/.pyenv
export PATH=$PYENV_ROOT/bin:$PATH
export PATH=$PYENV_ROOT/shims:$PATH
eval "$(pyenv init -)"
```
3. Update the .bashrc file
```
source ~/.bashrc
```

#### Install Python dependencies

```
sudo apt-get install make build-essential libssl-dev zlib1g-dev
sudo apt-get install libbz2-dev libreadline-dev libsqlite3-dev wget curl
sudo apt-get install llvm libncurses5-dev libncursesw5-dev
sudo apt-get update
```
#### Test usage

Check if installation was successful

- Check current installed version

```
IN:
	pyenv --version
OUT:
	pyenv 1.2.27-34-gbba1289e
```
- Check all installed Python versions
```
IN:
	pyenv versions
OUT:
	* system (set by /root/.pyenv/version)
```
> Indicates only the system default version is currently installed

#### Install a specific Python version

- View all available versions
```
    pyenv install --list
``` 
- Install the desired version (here, Python 3.6.5)

```
IN:
	pyenv install 3.6.5
OUT:
  Downloading Python-3.6.5.tar.xz...
  -> https://www.python.org/ftp/python/3.6.5/Python-3.6.5.tar.xz
  Installing Python-3.6.5...
  Installed Python-3.6.5 to /root/.pyenv/versions/3.6.5
```
- Check all Python versions again

```
IN:
	pyenv versions
OUT:
  * system (set by /root/.pyenv/version)
    3.6.5
```
- Switch Python version

    There are three switching methods: global, local, shell*

    global: system-wide environment, always used until switched again

    local: current login environment, invalid after reboot, returns to current global environment

    shell: local (temporary) environment, invalid after closing the terminal, returns to current global environment

    pyenv global 3.6.5

- Uninstall a specific version

```
    pyenv uninstall 3.6.5
```

### Install virtualenv

- Download

> pyenv already helps us install it as a plugin. If not installed, you need to install it manually

```
    git clone https://github.com/pyenv/pyenv-virtualenv.git $(pyenv root)/plugins/pyenv-virtualenv
```

- Edit .bashrc file

```
    vim ~/.bashrc
```
- Copy the following content to the end
```
    eval "$(pyenv virtualenv-init -)"
```
- Update the .bashrc file

```
    source ~/.bashrc
```

### Create a virtual environment

- Usage: pyenv virtualenv 3.6.5 virtual_name (custom virtual environment name)

- Example: pyenv virtualenv 3.6.5 test

- Enter the virtual environment

```
   pyenv activate test
```
- Exit the virtual environment
```
   pyenv deactivate
```
- Delete the virtual environment

```
    pyenv uninstall test
```
Type yes to confirm

### Common commands

Usage: pyenv <command> [<parameter>]

```
Commands:
  commands    View all commands
  local       Set or show the local Python version (current directory and its subdirectories)
  global      Set or show the global Python version
  shell       Set or show the shell-specific Python version (current session)
  install     Install a specified Python version
  uninstall   Uninstall a specified Python version
  version     Show the current Python version and its local path
  versions    View all installed versions
  which       Show the installation path
```
### Issues

1. Switching not successful
If after switching, the Python version is still the system default, you need to configure the environment variable. At the end of ~/.zshrc or ~/.bash_profile, add:

```
if which pyenv > /dev/null;
  then eval "$(pyenv init -)";
fi
```

---- 