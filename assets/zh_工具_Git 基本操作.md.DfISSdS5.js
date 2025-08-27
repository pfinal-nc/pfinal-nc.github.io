import{_ as a,c as n,o as p,a6 as e}from"./chunks/framework.BgU7Y2dv.js";const u=JSON.parse('{"title":"Git 基本操作","description":"Git 基本操作","frontmatter":{"title":"Git 基本操作","date":"2022-08-23T22:08:16.000Z","tags":["工具","Git"],"description":"Git 基本操作","author":"PFianl 南丞","keywords":"Git, 操作, 版本控制, 编程, Git基本操作","head":[["meta",{"name":"keywords","content":"Git, 操作, 版本控制, 编程, Git基本操作"}]]},"headers":[],"relativePath":"zh/工具/Git 基本操作.md","filePath":"zh/工具/Git 基本操作.md","lastUpdated":1752052166000}'),i={name:"zh/工具/Git 基本操作.md"};function l(t,s,c,o,d,h){return p(),n("div",{"data-pagefind-body":!0},s[0]||(s[0]=[e(`<h1 id="git-基本操作" tabindex="-1">Git 基本操作 <a class="header-anchor" href="#git-基本操作" aria-label="Permalink to &quot;Git 基本操作&quot;">​</a></h1><h4 id="获取与创建项目命令" tabindex="-1">获取与创建项目命令 <a class="header-anchor" href="#获取与创建项目命令" aria-label="Permalink to &quot;获取与创建项目命令&quot;">​</a></h4><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>    git init</span></span></code></pre></div><p>用 git init 在目录中创建新的 Git 仓库。 你可以在任何时候、任何目录中这么做，完全是本地化的。 在目录中执行 git init，就可以创建一个 Git 仓库了。比如我们创建 runoob 项目：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ mkdir runoob</span></span>
<span class="line"><span>$ cd runoob/</span></span>
<span class="line"><span>$ git init</span></span>
<span class="line"><span>Initialized empty Git repository in /Users/tianqixin/www/runoob/.git/</span></span>
<span class="line"><span># 在 /www/runoob/.git/ 目录初始化空 Git 仓库完毕。</span></span></code></pre></div><p>现在你可以看到在你的项目中生成了 .git 这个子目录。 这就是你的 Git 仓库了，所有有关你的此项目的快照数据都存放在这里。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ls -a</span></span>
<span class="line"><span>.	..	.git</span></span></code></pre></div><p>git clone 使用 git clone 拷贝一个 Git 仓库到本地，让自己能够查看该项目，或者进行修改。 如果你需要与他人合作一个项目，或者想要复制一个项目，看看代码，你就可以克隆那个项目。 执行命令：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span> git clone [url]</span></span></code></pre></div><p>[url] 为你想要复制的项目，就可以了。 例如我们克隆 Github 上的项目：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git clone git@github.com:schacon/simplegit.git</span></span>
<span class="line"><span>Cloning into &#39;simplegit&#39;...</span></span>
<span class="line"><span>remote: Counting objects: 13, done.</span></span>
<span class="line"><span>remote: Total 13 (delta 0), reused 0 (delta 0), pack-reused 13</span></span>
<span class="line"><span>Receiving objects: 100% (13/13), done.</span></span>
<span class="line"><span>Resolving deltas: 100% (2/2), done.</span></span>
<span class="line"><span>Checking connectivity... done.</span></span></code></pre></div><p>克隆完成后，在当前目录下会生成一个 simplegit 目录： $ cd simplegit/ $ ls README Rakefile lib 上述操作将复制该项目的全部记录。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ ls -a</span></span>
<span class="line"><span>.        ..       .git     README   Rakefile lib</span></span>
<span class="line"><span>$ cd .git</span></span>
<span class="line"><span>$ ls</span></span>
<span class="line"><span>HEAD        description info        packed-refs</span></span>
<span class="line"><span>branches    hooks       logs        refs</span></span>
<span class="line"><span>config      index       objects</span></span></code></pre></div><p>默认情况下，Git 会按照你提供的 URL 所指示的项目的名称创建你的本地项目目录。 通常就是该 URL 最后一个 / 之后的项目名称。如果你想要一个不一样的名字， 你可以在该命令后加上你想要的名称。</p><hr><h3 id="基本快照" tabindex="-1">基本快照 <a class="header-anchor" href="#基本快照" aria-label="Permalink to &quot;基本快照&quot;">​</a></h3><p>Git 的工作就是创建和保存你的项目的快照及与之后的快照进行对比。本章将对有关创建与提交你的项目的快照的命令作介绍。</p><p>git add git add 命令可将该文件添加到缓存，如我们添加以下两个文件：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ touch README</span></span>
<span class="line"><span>$ touch hello.php</span></span>
<span class="line"><span>$ ls</span></span>
<span class="line"><span>README		hello.php</span></span>
<span class="line"><span>$ git status -s</span></span>
<span class="line"><span>?? README</span></span>
<span class="line"><span>?? hello.php</span></span>
<span class="line"><span>$</span></span></code></pre></div><p>git status 命令用于查看项目的当前状态。</p><p>接下来我们执行 git add 命令来添加文件：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git add README hello.php</span></span></code></pre></div><p>现在我们再执行 git status，就可以看到这两个文件已经加上去了。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git status -s</span></span>
<span class="line"><span>A  README</span></span>
<span class="line"><span>A  hello.php</span></span>
<span class="line"><span>$</span></span></code></pre></div><p>新项目中，添加所有文件很普遍，我们可以使用 git add .</p><p>命令来添加当前项目的所有文件。</p><p>现在我们修改 README 文件：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ vim README</span></span></code></pre></div><p>在 README 添加以下内容：# Runoob Git 测试，然后保存退出。</p><p>再执行一下 git status：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git status -s</span></span>
<span class="line"><span>AM README</span></span>
<span class="line"><span>A  hello.php</span></span></code></pre></div><p>当你要将你的修改包含在即将提交的快照里的时候，需要执行 git add。</p><p>git status</p><p>git status 以查看在你上次提交之后是否有修改。</p><p>我演示该命令的时候加了 -s</p><p>参数，以获得简短的结果输出。如果没加该参数会详细输出内容：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git status</span></span>
<span class="line"><span>On branch master</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Initial commit</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Changes to be committed:</span></span>
<span class="line"><span>  (use &quot;git rm --cached &lt;file&gt;...&quot; to unstage)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>	new file:   README</span></span>
<span class="line"><span>	new file:   hello.php</span></span></code></pre></div><p>git diff</p><p>执行 git diff 来查看执行 git status 的结果的详细信息。</p><p>git diff 命令显示已写入缓存与已修改但尚未写入缓存的改动的区别。</p><p>git diff 有两个主要的应用场景。</p><ul><li>尚未缓存的改动：git diff</li><li>查看已缓存的改动： git diff --cached</li><li>查看已缓存的与未缓存的所有改动：git diff HEAD</li><li>显示摘要而非整个 diff：git diff --stat</li><li>在 hello.php 文件中输入以下内容：</li></ul><p>在 hello.php 文件中输入以下内容：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>&lt;?php</span></span>
<span class="line"><span>    echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>?&gt;</span></span></code></pre></div><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git status -s</span></span>
<span class="line"><span>A  README</span></span>
<span class="line"><span>AM hello.php</span></span>
<span class="line"><span>$ git diff</span></span>
<span class="line"><span>diff --git a/hello.php b/hello.php</span></span>
<span class="line"><span>index e69de29..69b5711 100644</span></span>
<span class="line"><span>--- a/hello.php</span></span>
<span class="line"><span>+++ b/hello.php</span></span>
<span class="line"><span>@@ -0,0 +1,3 @@</span></span>
<span class="line"><span>+&lt;?php</span></span>
<span class="line"><span>+echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>+?&gt;</span></span></code></pre></div><p>git status 显示你上次提交更新后的更改或者写入缓存的改动， 而 git diff 一行一行地显示这些改动具体是啥。 接下来我们来查看下 git diff --cached 的执行效果：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git add hello.php </span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ git status -s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>A  README</span></span>
<span class="line"><span>A  hello.php</span></span>
<span class="line"><span>$ git diff --cached</span></span>
<span class="line"><span>diff --git a/README b/README</span></span>
<span class="line"><span>new file mode 100644</span></span>
<span class="line"><span>index 0000000..8f87495</span></span>
<span class="line"><span>--- /dev/null</span></span>
<span class="line"><span>+++ b/README</span></span>
<span class="line"><span>@@ -0,0 +1 @@</span></span>
<span class="line"><span>+# Runoob Git 测试</span></span>
<span class="line"><span>diff --git a/hello.php b/hello.php</span></span>
<span class="line"><span>new file mode 100644</span></span>
<span class="line"><span>index 0000000..69b5711</span></span>
<span class="line"><span>--- /dev/null</span></span>
<span class="line"><span>+++ b/hello.php</span></span>
<span class="line"><span>@@ -0,0 +1,3 @@</span></span>
<span class="line"><span>+&lt;?php</span></span>
<span class="line"><span>+echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>+?&gt;</span></span></code></pre></div><p>git commit</p><p>使用 git add 命令将想要快照的内容写入缓存区， 而执行 git commit 将缓存区内容添加到仓库中。 Git 为你的每一个提交都记录你的名字与电子邮箱地址，所以第一步需要配置用户名和邮箱地址。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git config --global user.name &#39;runoob&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ git config --global user.email test@runoob.com</span></span></code></pre></div><p>接下来我们写入缓存，并提交对 hello.php 的所有改动。在首个例子中，我们使用 -m 选项以在命令行中提供提交注释。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git add hello.php</span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ git status -s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>A  README</span></span>
<span class="line"><span>A  hello.php</span></span>
<span class="line"><span>$ $ git commit -m &#39;第一次版本提交&#39;</span></span>
<span class="line"><span>[master (root-commit) d32cf1f] 第一次版本提交</span></span>
<span class="line"><span> 2 files changed, 4 insertions(+)</span></span>
<span class="line"><span> create mode 100644 README</span></span>
<span class="line"><span> create mode 100644 hello.php</span></span></code></pre></div><p>现在我们已经记录了快照。如果我们再执行 git status:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git status</span></span>
<span class="line"><span></span></span>
<span class="line"><span># On branch master</span></span>
<span class="line"><span>nothing to commit (working directory clean)</span></span></code></pre></div><p>以上输出说明我们在最近一次提交之后，没有做任何改动，是一个&quot;working directory clean：干净的工作目录&quot;。 如果你没有设置 -m 选项，Git 会尝试为你打开一个编辑器以填写提交信息。 如果 Git 在你对它的配置中找不到相关信息，默认会打开 vim。屏幕会像这样：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># Please enter the commit message for your changes. Lines starting</span></span>
<span class="line"><span># with &#39;#&#39; will be ignored, and an empty message aborts the commit.</span></span>
<span class="line"><span># On branch master</span></span>
<span class="line"><span># Changes to be committed:</span></span>
<span class="line"><span>#   (use &quot;git reset HEAD &lt;file&gt;...&quot; to unstage)</span></span>
<span class="line"><span>#</span></span>
<span class="line"><span># modified:   hello.php</span></span>
<span class="line"><span>#</span></span>
<span class="line"><span>~</span></span>
<span class="line"><span>~</span></span>
<span class="line"><span>&quot;.git/COMMIT_EDITMSG&quot; 9L, 257C</span></span></code></pre></div><p>如果你觉得 git add 提交缓存的流程太过繁琐，Git 也允许你用 -a 选项跳过这一步。命令格式如下：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>git commit -a</span></span></code></pre></div><p>我们先修改 hello.php 文件为以下内容：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>&lt;?php</span></span>
<span class="line"><span>echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>?&gt;</span></span></code></pre></div><p>再执行以下命令：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>git commit -am &#39;修改 hello.php 文件&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[master 71ee2cb] 修改 hello.php 文件</span></span>
<span class="line"><span> 1 file changed, 1 insertion(+)</span></span></code></pre></div><p>git reset HEAD</p><p>git reset HEAD 命令用于取消已缓存的内容。</p><p>我们先改动文件 README 文件，内容如下：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># Runoob Git 测试</span></span>
<span class="line"><span># 南城嘚吧嘚</span></span></code></pre></div><p>hello.php 文件修改为：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>&lt;?php</span></span>
<span class="line"><span>echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>echo &#39;南城嘚吧嘚&#39;;</span></span>
<span class="line"><span>?&gt;</span></span></code></pre></div><p>现在两个文件修改后，都提交到了缓存区，我们现在要取消其中一个的缓存，操作如下：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git status -s</span></span>
<span class="line"><span></span></span>
<span class="line"><span> M README</span></span>
<span class="line"><span> M hello.php</span></span>
<span class="line"><span>$ git add .</span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ git status -s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>M  README</span></span>
<span class="line"><span>M  hello.pp</span></span>
<span class="line"><span>$ git reset HEAD -- hello.php </span></span>
<span class="line"><span></span></span>
<span class="line"><span>Unstaged changes after reset:</span></span>
<span class="line"><span>M	hello.php</span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ git status -s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>M  README</span></span>
<span class="line"><span> M hello.php</span></span></code></pre></div><p>现在你执行 git commit，只会将 README 文件的改动提交，而 hello.php 是没有的。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git commit -m &#39;修改&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[master f50cfda] 修改</span></span>
<span class="line"><span> 1 file changed, 1 insertion(+)</span></span>
<span class="line"><span>$ git status -s</span></span>
<span class="line"><span> M hello.php</span></span></code></pre></div><p>可以看到 hello.php 文件的修改并为提交。</p><p>这时我们可以使用以下命令将 hello.php 的修改提交：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git commit -am &#39;修改 hello.php 文件&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[master 760f74d] 修改 hello.php 文件</span></span>
<span class="line"><span></span></span>
<span class="line"><span> 1 file changed, 1 insertion(+)</span></span>
<span class="line"><span>$ git status</span></span>
<span class="line"><span>On branch master</span></span>
<span class="line"><span>nothing to commit, working directory clean</span></span></code></pre></div><p>简而言之，执行 git reset HEAD 以取消之前 git add 添加，但不希望包含在下一提交快照中的缓存。</p><p>git rm</p><p>git rm 会将条目从缓存区中移除。这与 git reset HEAD 将条目取消缓存是有区别的。</p><p>&quot;取消缓存&quot;的意思就是将缓存区恢复为我们做出修改之前的样子。</p><p>默认情况下，git rm file 会将文件从缓存区和你的硬盘中（工作目录）删除。</p><p>如果你要在工作目录中留着该文件，可以使用 git rm --cached： 如我们删除 hello.php文件：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git rm hello.php </span></span>
<span class="line"><span></span></span>
<span class="line"><span>rm &#39;hello.php&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>$ ls</span></span>
<span class="line"><span></span></span>
<span class="line"><span>README</span></span></code></pre></div><p>不从工作区中删除文件：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>$ git rm --cached README </span></span>
<span class="line"><span>rm &#39;README&#39;</span></span>
<span class="line"><span>$ ls</span></span>
<span class="line"><span>README</span></span></code></pre></div><p>git mv</p><p>git mv 命令做得所有事情就是 git rm --cached 命令的操作， 重命名磁盘上的文件，然后再执行 git add 把新文件添加到缓存区。</p><p>我们先把刚移除的 README 添加回来：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git add README</span></span></code></pre></div><p>然后对其重名:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>$ git mv README  README.md</span></span>
<span class="line"><span>$ ls</span></span>
<span class="line"><span>README.md</span></span></code></pre></div><p>s</p>`,91)]))}const r=a(i,[["render",l]]);export{u as __pageData,r as default};
