import{_ as a,c as d,o as e,a6 as r}from"./chunks/framework.B5rgnJXo.js";const P=JSON.parse('{"title":"TCP/IP HTTP学习","description":"学习TCP/IP HTTP协议","frontmatter":{"title":"TCP/IP HTTP学习","date":"2020-06-09T11:31:32.000Z","tags":["TCP/IP","HTTP"],"description":"学习TCP/IP HTTP协议","keywords":"TCP/IP,HTTP","author":"PFinal南丞"},"headers":[],"relativePath":"php/TCP-IP-HTTP学习.md","filePath":"php/TCP-IP-HTTP学习.md","lastUpdated":1741944848000}'),p={name:"php/TCP-IP-HTTP学习.md"};function i(l,t,n,s,o,c){return e(),d("div",{"data-pagefind-body":!0},t[0]||(t[0]=[r(`<h1 id="tcp-ip-http学习" tabindex="-1">TCP/IP HTTP学习 <a class="header-anchor" href="#tcp-ip-http学习" aria-label="Permalink to &quot;TCP/IP HTTP学习&quot;">​</a></h1><h4 id="计算机网络体系结构分层" tabindex="-1">计算机网络体系结构分层 <a class="header-anchor" href="#计算机网络体系结构分层" aria-label="Permalink to &quot;计算机网络体系结构分层&quot;">​</a></h4><table tabindex="0"><thead><tr><th>层级</th><th>名称</th></tr></thead><tbody><tr><td>7</td><td>应用层</td></tr><tr><td>6</td><td>表示层</td></tr><tr><td>5</td><td>会话层</td></tr><tr><td>4</td><td>传输层</td></tr><tr><td>3</td><td>网络层</td></tr><tr><td>2</td><td>数据链路层</td></tr><tr><td>1</td><td>物理层</td></tr><tr><td>------</td><td>--------------</td></tr></tbody></table><ul><li>OSI 参考模型中定义了每一层的作用</li><li>定义每一层作用的是协议</li><li>协议是约定,其具体内容为规范</li><li>日常使用的是遵循各个协议具体规范的产品和通信手段</li></ul><table tabindex="0"><thead><tr><th>OSI七层模型</th><th>TCP/IP概念层模型</th><th>功能</th><th>TCP/IP协议族群</th></tr></thead><tbody><tr><td>应用层</td><td>应用层</td><td>文件传输,电子邮件,文件服务,虚拟终端</td><td>TFTP，HTTP,SNMP，FTP，SMTP，DNS,Telnet</td></tr><tr><td>表示层</td><td></td><td>数据格式化,代码转化,数据加密</td><td>没有协议</td></tr><tr><td>会话层</td><td></td><td>解除或建立别的接点的联系</td><td>没有协议</td></tr><tr><td>传输层</td><td>传输层</td><td>提供端对端的接口</td><td>TCP,UDP</td></tr><tr><td>网络层</td><td>网络层</td><td>为数据包选择路由</td><td>IP，ICMP，RIP，OSPF，BGP，IGMP</td></tr><tr><td>数据链路层</td><td>链路层</td><td>传输有地址的帧以及错误检测功能</td><td>SLIP，CSLIP，PPP，ARP，RARP，MTU</td></tr><tr><td>物理层</td><td></td><td>以二进制数据形式在物理媒体上传输数据</td><td>ISO2110,IEEE802,IEEE802.2</td></tr></tbody></table><blockquote><p>OSI 参考模型注重“通信协议必要的功能是什么”，而 TCP/IP 则更强调“在计算机上实现协议应该开发哪种程序”</p></blockquote><p>每个分层中， 都会对所发送的数据附加一个首部, 在这个首部中包含了该层必要的信息,如发送的目标地址以及协议的相关信息,通常,为协议提供的信息为包首部,所要发送的内容为数据,在下一层的角度看,从上一层收到的包全部都被认为是本层的数据.</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220629173938.jpeg" alt=""></p><p>网络中传输的数据包由两部分组成:一部分是协议所要用到的首部，另一部分是上一层传过来的数据。首部的结构由协议的具体规范详细定义,在数据包的首部，明确标明了协议应该如何读取数据。</p><h4 id="数据处理流程" tabindex="-1">数据处理流程 <a class="header-anchor" href="#数据处理流程" aria-label="Permalink to &quot;数据处理流程&quot;">​</a></h4><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220629173952.jpeg" alt=""></p><p>1， 应用程序处理</p><p>首先应用程序会进行编码处理, 这些编码相当于OSI的表示层功能; 编码转化后, 邮件不一定发上被发送出去,这种何时建立通信连接何时发送数据的管理功能</p><p>2, TCP 模块的处理</p><p>TCP 根据应用的指示，负责建立连接、发送数据以及断开连接。TCP 提供将应用层发来的数据顺利发送至对端的可靠传输。为了实现这一功能，需要在应用层数据的前端附加一个 TCP 首部。</p><p>3, IP 模块的处理</p><p>IP 将 TCP 传过来的 TCP 首部和 TCP 数据合起来当做自己的数据，并在 TCP 首部的前端加上自己的 IP 首部。IP 包生成后，参考路由控制表决定接受此 IP 包的路由或主机。</p><p>4, 网络接口（以太网驱动）的处理</p><p>从 IP 传过来的 IP 包对于以太网来说就是数据。给这些数据附加上以太网首部并进行发送处理，生成的以太网数据包将通过物理层传输给接收端。</p><h4 id="tcp-三次握手与四次挥手" tabindex="-1">TCP 三次握手与四次挥手 <a class="header-anchor" href="#tcp-三次握手与四次挥手" aria-label="Permalink to &quot;TCP 三次握手与四次挥手&quot;">​</a></h4><p>三次握手 是指建立一个 TCP 连接时,需要客户端和服务器总共发送3个包.它的目的是链接服务器指定端口,建立TCP链接, 并同步李兰姐双方的序列号和确认好,交换TCP窗口大小信息.在 socket 编程中，客户端执行 connect() 时。将触发三次握手.</p><ul><li><h4 id="第一次握手-syn-1-seq-x" tabindex="-1">第一次握手(SYN=1,seq=x): <a class="header-anchor" href="#第一次握手-syn-1-seq-x" aria-label="Permalink to &quot;第一次握手(SYN=1,seq=x):&quot;">​</a></h4><p>客户端发送一个 TCP的 SYN 标志位置1的包, 指明客户端打算连接的服务器的端口, 以及初始序号 X，保存在包头的序列号（Sequence Number）字段里。</p><p>发送完毕后，客户端进入 SYN_SEND 状态。</p></li><li><h4 id="第二次握手-syn-1-ack-1-seq-y-acknum-x-1" tabindex="-1">第二次握手(SYN=1,ACK=1,seq=y,ACKnum = x+1) <a class="header-anchor" href="#第二次握手-syn-1-ack-1-seq-y-acknum-x-1" aria-label="Permalink to &quot;第二次握手(SYN=1,ACK=1,seq=y,ACKnum = x+1)&quot;">​</a></h4><p>服务器发回确认包(ACK)应答,即 SYN 标志位和 ACK 标志位均为1。服务器端选择自己 ISN 序列号，放到 Seq 域里，同时将确认序号(Acknowledgement Number)设置为客户的 ISN 加1，即X+1。 发送完毕后，服务器端进入 SYN_RCVD 状态。</p></li><li><h4 id="第三次握手-ack-1-acknum-y-1" tabindex="-1">第三次握手(ACK=1，ACKnum=y+1) <a class="header-anchor" href="#第三次握手-ack-1-acknum-y-1" aria-label="Permalink to &quot;第三次握手(ACK=1，ACKnum=y+1)&quot;">​</a></h4><p>客户端再次发送确认包(ACK), SYN 标志位为0, ACK 标志位为 1, 并且把服务器发来 ACK的序号字段 +1 放在确认字段中发送给对方, 并且在数据段放写 ISN的 +1</p><p>发送完毕后，客户端进入 ESTABLISHED 状态，当服务器端接收到这个包时，也进入 ESTABLISHED 状态，TCP 握手结束。</p></li></ul><p>TCP 的连接的拆除需要发送四个包，因此称为四次挥手，客户端或服务器均可主动发起挥手动作，在 socket 编程中，任何一方执行 close() 操作即可产生挥手操作。</p><ul><li><h4 id="第一次挥手-fin-1-seq-x" tabindex="-1">第一次挥手(FIN=1，seq=x) <a class="header-anchor" href="#第一次挥手-fin-1-seq-x" aria-label="Permalink to &quot;第一次挥手(FIN=1，seq=x)&quot;">​</a></h4><p>假设客户端想要关闭连接，客户端发送一个 FIN 标志位置为1的包，表示自己已经没有数据可以发送了，但是仍然可以接受数据。</p><p>发送完毕后，客户端进入 FIN_WAIT_1 状态。</p></li><li><h4 id="第二次挥手-ack-1-acknum-x-1" tabindex="-1">第二次挥手(ACK=1，ACKnum=x+1) <a class="header-anchor" href="#第二次挥手-ack-1-acknum-x-1" aria-label="Permalink to &quot;第二次挥手(ACK=1，ACKnum=x+1)&quot;">​</a></h4><p>服务器端确认客户端的 FIN 包，发送一个确认包，表明自己接受到了客户端关闭连接的请求，但还没有准备好关闭连接。</p><p>发送完毕后，服务器端进入 CLOSE_WAIT 状态，客户端接收到这个确认包之后，进入 FIN_WAIT_2 状态，等待服务器端关闭连接。</p></li><li><h4 id="第三次挥手-fin-1-seq-y" tabindex="-1">第三次挥手(FIN=1，seq=y) <a class="header-anchor" href="#第三次挥手-fin-1-seq-y" aria-label="Permalink to &quot;第三次挥手(FIN=1，seq=y)&quot;">​</a></h4><p>服务器端准备好关闭连接时，向客户端发送结束连接请求，FIN 置为1。</p><p>发送完毕后，服务器端进入 LAST_ACK 状态，等待来自客户端的最后一个ACK。</p></li><li><h4 id="第四次挥手-ack-1-acknum-y-1" tabindex="-1">第四次挥手(ACK=1，ACKnum=y+1) <a class="header-anchor" href="#第四次挥手-ack-1-acknum-y-1" aria-label="Permalink to &quot;第四次挥手(ACK=1，ACKnum=y+1)&quot;">​</a></h4><p>客户端接收到来自服务器端的关闭请求，发送一个确认包，并进入 TIME_WAIT状态，等待可能出现的要求重传的 ACK 包。</p><p>服务器端接收到这个确认包之后，关闭连接，进入 CLOSED 状态。</p><p>客户端等待了某个固定时间（两个最大段生命周期，2MSL，2 Maximum Segment Lifetime）之后，没有收到服务器端的 ACK ，认为服务器端已经正常关闭连接，于是自己也关闭连接，进入 CLOSED 状态。</p></li></ul><h4 id="tcp-首部" tabindex="-1">TCP 首部 <a class="header-anchor" href="#tcp-首部" aria-label="Permalink to &quot;TCP 首部&quot;">​</a></h4><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220629174009.jpg" alt=""></p><p>TCP 是面向字节流的，在一个 TCP 连接中传输的字节流中的每个字节都按照顺序编号。</p><p>1、第一个4字节</p><p>（1）源端口，16位；发送数据的源进程端口</p><p>（2）目的端口，16位；接收数据的进程端口</p><p>2、第二个4字节与第三个4字节</p><p>（1）序号，32位；代表当前TCP数据段第一个字节占整个字节流的相对位置；</p><p>（2）确认号，32位；代表接收端希望接收的数据序号，为上次接收到数据报的序号+1，当ACK标志位为1时才生效。</p><p>3、第四个4字节</p><p>（1）数据偏移，4位；实际代表TCP首部长度，最大为60字节。</p><p>（2）保留 占 0.5 个字节 (4 位)。保留为今后使用，但目前应置为 0。</p><p>（3）6个标志位，每个标志位1位；</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>    SYN，为同步标志，用于数据同步；</span></span>
<span class="line"><span>    ACK，为确认序号，ACK=1时确认号才有效；</span></span>
<span class="line"><span>    FIN，为结束序号，用于发送端提出断开连接；</span></span>
<span class="line"><span>    URG，为紧急序号，URG=1是紧急指针有效；</span></span>
<span class="line"><span>    PSH，指示接收方立即将数据提交给应用层，而不是等待缓冲区满；</span></span>
<span class="line"><span>    RST，重置连接。</span></span></code></pre></div><p>（4）窗口值，16位；标识接收方可接受的数据字节数</p><p>4、第五个4字节</p><p>（1）校验和，16位；用于检验数据完整性。</p><p>（2）紧急指针，16位；只有当URG标识位为1时，紧急指针才有效。紧急指针的值与序号的相加值为紧急数据的最后一个字节位置。用于发送紧急数据。</p><h4 id="http" tabindex="-1">HTTP <a class="header-anchor" href="#http" aria-label="Permalink to &quot;HTTP&quot;">​</a></h4><p>HTTP 协议构建于 TCP/IP 协议之上，是一个应用层协议，默认端口号是 80 用于 HTTP 协议交互的信息被称为 HTTP 报文。请求端（客户端）的 HTTP 报文叫做请求报文，响应端（服务器端）的叫做响应报文。</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220629174030.jpg" alt=""></p><p>报文的首部内容由以下数据组成</p><p><em>请求行</em>---包含用于请求的方法，请求 URI 和 HTTP 版本。</p><p><em>状态行</em>---包含表明响应结果的状态码，原因短语和 HTTP 版本。</p><p><em>首部字段</em>---包含表示请求和响应的各种条件和属性的各类首部。</p><p>报文都是默认ASCII文本</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220629174045.jpg" alt=""></p><ul><li><ol><li>请求方法: HTTP 定义了与服务器交互的不同方法，GET和POST是最常见的HTTP方法，除此以外还包括DELETE、HEAD、OPTIONS、PUT、TRACE。</li></ol></li><li><ol start="2"><li>为请求对应的URL地址</li></ol></li><li><ol start="3"><li>是协议名称及版本号</li></ol></li><li><p>4） HTTP的报文头</p><table tabindex="0"><thead><tr><th>首部字段</th><th>解释</th></tr></thead><tbody><tr><td>Accept</td><td>告诉服务器能够发送哪些媒体类型</td></tr><tr><td>Accept-Charset</td><td>优先的字符集</td></tr><tr><td>Accept-Encoding</td><td>优先的内容编码</td></tr><tr><td>Accept-Language</td><td>优先的自然语言</td></tr><tr><td>Authorization</td><td>web认证信息</td></tr><tr><td>Expect</td><td>期待服务器的特定行为</td></tr><tr><td>From</td><td>用户的电子邮箱地址</td></tr><tr><td>Host</td><td>请求资源所在服务器</td></tr><tr><td>If-Match</td><td>比较实体标记(ETag)</td></tr><tr><td>If-Modified-Since</td><td>比较资源的更新时间</td></tr><tr><td>If-None-Match</td><td>比较实体标记(与If-Match相反)</td></tr><tr><td>If-Range</td><td>资源未更新时发送实体Byte的范围请求</td></tr><tr><td>If-Unmodified-Since</td><td>比较资源的更新时间(与If-Modified-Since相反)</td></tr><tr><td>Max-Forwards</td><td>最大传输逐跳数</td></tr><tr><td>Proxy-Authorization</td><td>代理服务器要求客户端的认证信息</td></tr><tr><td>Range</td><td>实体的字节范围要求</td></tr><tr><td>Referer</td><td>对请求中URL的原始获取方</td></tr><tr><td>TE</td><td>传输编码的优先级</td></tr><tr><td>User-Agent</td><td>HTTP客户端程序的信息</td></tr></tbody></table></li><li><p>If-Match：只有当 If-Match 字段值跟 ETag 值匹配一致时，服务器才会接受请求</p><ul><li>它会告知服务器匹配资源所用的实体标记（ETag）值，这时服务器无法使用弱ETag值</li><li>仅当两者一致时才会执行请求，否则返回412 Precondition Failed的响应</li><li>还可以使用 * 号指定If-Match的字段值，如果这样的话，那么服务器将会忽略ETag的值，只要资源存在就处理请求。</li></ul></li><li><p>If-Modified-Since</p><p>若资源更新时间确实在此字段指定时间之后的话，则处理该请求，否则返回304 Not Modified 用于确认代理或客户端拥有本地资源的有效性，若想获取资源的更新日期时间的话可以通过确认首部字段Last-Modified来确定</p></li><li><p>If-None-Match</p><p>只有在 If-None-Match 的字段值与ETag值不一致时, 才可以处理该请求,与前文中提到的 If-Match作用相反</p></li><li><p>If-Range</p><p>他告知服务器若指定的If-Range字段值（ETag值或者时间）和请求资源的ETag值或时间一致时，则作为范围请求处理，否则，返回全体资源</p></li><li><p>If-Unmodified-Since</p><p>指定的请求资源只有在字段值内指定的日期时间之后未发生更新，才会执行这个请求，否则，返回412 Precondition Failed状态响应，与If-Modified-Since作用相反</p></li><li><p>Max-Forwards</p><p>每次请求转发时数值减一，直到0时返回响应有可能这个请求经过了多台服务器代理转发，如果突然间请求出现了什么问题导致转发失败，而客户端不知道，此时就可以用此属性来定位问题，这个时候我们就可以掌握一个出问题的转发路径，从而方便进一步的排查问题。</p></li><li><p>Range</p><ul><li>对于只需要获取部分资源的范围请求，Range字段可以指定获取资源范围Range: bytes=10001-20000</li><li>例子中表示请求获取从第10001字节到20000字节的资源</li><li>服务器处理请求后会返回206 Partial Content的响应。无法处理时，则会返回状态码200 OK的响应及其全部资源</li></ul></li></ul><h4 id="响应报文首部" tabindex="-1">响应报文首部 <a class="header-anchor" href="#响应报文首部" aria-label="Permalink to &quot;响应报文首部&quot;">​</a></h4><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220629174121.jpg" alt=""></p><table tabindex="0"><thead><tr><th>首部字段名</th><th>解释</th></tr></thead><tbody><tr><td>Accept-Ranges</td><td>是否接受字节范围请求</td></tr><tr><td>Age</td><td>推算资源创建经过时间</td></tr><tr><td>ETag</td><td>资源的匹配信息</td></tr><tr><td>Location</td><td>令客户端重定向至指定URL</td></tr><tr><td>Proxy-Authenticate</td><td>代理服务器对客户端的认证信息</td></tr><tr><td>Server</td><td>Http服务器的安装信息</td></tr><tr><td>Vary</td><td>代理服务器缓存的管理信息</td></tr><tr><td>WWW-Authenticate</td><td>服务器对客户端的认证信息</td></tr></tbody></table><ul><li><p><strong>Accept-Ranges</strong></p><p>Accept-Ranges：bytes 可以处理范围请求 Accept-Ranges:none 不可以处理范围请求</p></li><li><p><strong>Age</strong></p><ul><li>可以告知客户端,源服务器多久之前创建了资源，单位是秒</li><li>若创建该响应的缓存服务器, 则Age值是指定缓存后的响应再次发起认证到认证完成的时间值, 代理创建响应时必须加上首部字段Age</li></ul></li><li><p>ETag 他是一种可资源的以字符串形式做唯一标识的方式,</p></li></ul>`,56)]))}const T=a(p,[["render",i]]);export{P as __pageData,T as default};
