import{_ as a,c as n,o as p,a6 as e}from"./chunks/framework.B5rgnJXo.js";const _=JSON.parse('{"title":"Python-Faker库常用函数","description":"Faker库常用函数","frontmatter":{"title":"Python-Faker库常用函数","date":"2023-04-05T22:10:20.000Z","tags":["python"],"description":"Faker库常用函数","author":"PFinal南丞","keywords":"Python, 库, 函数, 常用, Faker, 生成, 数据, 测试, 模拟"},"headers":[],"relativePath":"python/Python-Faker库常用函数.md","filePath":"python/Python-Faker库常用函数.md","lastUpdated":1741944848000}'),l={name:"python/Python-Faker库常用函数.md"};function i(t,s,c,r,o,d){return p(),n("div",{"data-pagefind-body":!0},s[0]||(s[0]=[e(`<h1 id="python-faker库常用函数" tabindex="-1">Python-Faker库常用函数 <a class="header-anchor" href="#python-faker库常用函数" aria-label="Permalink to &quot;Python-Faker库常用函数&quot;">​</a></h1><h2 id="faker" tabindex="-1">Faker <a class="header-anchor" href="#faker" aria-label="Permalink to &quot;Faker&quot;">​</a></h2><p>Faker是一个Python包，主要用来创建伪数据，使用Faker包，无需再手动生成或者手写随机数来生成数据，只需要调用Faker提供的方法，即可完成数据的生成</p><h4 id="常见的语言代号" tabindex="-1">常见的语言代号： <a class="header-anchor" href="#常见的语言代号" aria-label="Permalink to &quot;常见的语言代号：&quot;">​</a></h4><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>简体中文：zh_CN</span></span>
<span class="line"><span></span></span>
<span class="line"><span>繁体中文：zh_TW</span></span>
<span class="line"><span></span></span>
<span class="line"><span>美国英文：en_US</span></span>
<span class="line"><span></span></span>
<span class="line"><span>英国英文：en_GB</span></span>
<span class="line"><span></span></span>
<span class="line"><span>德文：de_DE</span></span>
<span class="line"><span></span></span>
<span class="line"><span>日文：ja_JP</span></span>
<span class="line"><span></span></span>
<span class="line"><span>韩文：ko_KR</span></span>
<span class="line"><span></span></span>
<span class="line"><span>法文：fr_FR</span></span></code></pre></div><p>设置生成的语言:</p><div class="language-python vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">python</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">fake </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Faker(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">locale</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;zh_CN&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span></code></pre></div><h4 id="常用函数" tabindex="-1">常用函数 <a class="header-anchor" href="#常用函数" aria-label="Permalink to &quot;常用函数&quot;">​</a></h4><p>1、地理信息类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fake.city_suffix()：市，县</span></span>
<span class="line"><span>fake.country()：国家</span></span>
<span class="line"><span>fake.country_code()：国家编码</span></span>
<span class="line"><span>fake.district()：区</span></span>
<span class="line"><span>fake.geo_coordinate()：地理坐标</span></span>
<span class="line"><span>fake.latitude()：地理坐标(纬度)</span></span>
<span class="line"><span>fake.longitude()：地理坐标(经度)</span></span>
<span class="line"><span>fake.postcode()：邮编</span></span>
<span class="line"><span>fake.province()：省份</span></span>
<span class="line"><span>fake.address()：详细地址</span></span>
<span class="line"><span>fake.street_address()：街道地址</span></span>
<span class="line"><span>fake.street_name()：街道名</span></span>
<span class="line"><span>fake.street_suffix()：街、路</span></span></code></pre></div><p>2、基础信息类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ssn()：生成身份证号</span></span>
<span class="line"><span>bs()：随机公司服务名</span></span>
<span class="line"><span>company()：随机公司名（长）</span></span>
<span class="line"><span>company_prefix()：随机公司名（短）</span></span>
<span class="line"><span>company_suffix()：公司性质</span></span>
<span class="line"><span>credit_card_expire()：随机信用卡到期日</span></span>
<span class="line"><span>credit_card_full()：生成完整信用卡信息</span></span>
<span class="line"><span>credit_card_number()：信用卡号</span></span>
<span class="line"><span>credit_card_provider()：信用卡类型</span></span>
<span class="line"><span>credit_card_security_code()：信用卡安全码</span></span>
<span class="line"><span>job()：随机职位</span></span>
<span class="line"><span>first_name_female()：女性名</span></span>
<span class="line"><span>first_name_male()：男性名</span></span>
<span class="line"><span>last_name_female()：女姓</span></span>
<span class="line"><span>last_name_male()：男姓</span></span>
<span class="line"><span>name()：随机生成全名</span></span>
<span class="line"><span>name_female()：男性全名</span></span>
<span class="line"><span>name_male()：女性全名</span></span>
<span class="line"><span>phone_number()：随机生成手机号</span></span>
<span class="line"><span>phonenumber_prefix()：随机生成手机号段</span></span></code></pre></div><p>3、计算机基础、Internet信息类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ascii_company_email()：随机ASCII公司邮箱名</span></span>
<span class="line"><span>ascii_email()：随机ASCII邮箱：</span></span>
<span class="line"><span>company_email()：</span></span>
<span class="line"><span>email()：</span></span>
<span class="line"><span>safe_email()：安全邮箱</span></span></code></pre></div><p>4、网络基础信息类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>domain_name()：生成域名</span></span>
<span class="line"><span>domain_word()：域词(即，不包含后缀)</span></span>
<span class="line"><span>ipv4()：随机IP4地址</span></span>
<span class="line"><span>ipv6()：随机IP6地址</span></span>
<span class="line"><span>mac_address()：随机MAC地址</span></span>
<span class="line"><span>tld()：网址域名后缀(.com,.net.cn,等等，不包括.)</span></span>
<span class="line"><span>uri()：随机URI地址</span></span>
<span class="line"><span>uri_extension()：网址文件后缀</span></span>
<span class="line"><span>uri_page()：网址文件（不包含后缀）</span></span>
<span class="line"><span>uri_path()：网址文件路径（不包含文件名）</span></span>
<span class="line"><span>url()：随机URL地址</span></span>
<span class="line"><span>user_name()：随机用户名</span></span>
<span class="line"><span>image_url()：随机URL地址</span></span></code></pre></div><p>5、浏览器信息类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>chrome()：随机生成Chrome的浏览器user_agent信息</span></span>
<span class="line"><span>firefox()：随机生成FireFox的浏览器user_agent信息</span></span>
<span class="line"><span>internet_explorer()：随机生成IE的浏览器user_agent信息</span></span>
<span class="line"><span>opera()：随机生成Opera的浏览器user_agent信息</span></span>
<span class="line"><span>safari()：随机生成Safari的浏览器user_agent信息</span></span>
<span class="line"><span>linux_platform_token()：随机Linux信息</span></span>
<span class="line"><span>user_agent()：随机user_agent信息</span></span></code></pre></div><p>6、数字类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>numerify()：三位随机数字</span></span>
<span class="line"><span></span></span>
<span class="line"><span>random_digit()：0~9随机数</span></span>
<span class="line"><span></span></span>
<span class="line"><span>random_digit_not_null()：1~9的随机数</span></span>
<span class="line"><span></span></span>
<span class="line"><span>random_int()：随机数字，默认0~9999，可以通过设置min,max来设置</span></span>
<span class="line"><span></span></span>
<span class="line"><span>random_number()：随机数字，参数digits设置生成的数字位数</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pyfloat()：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>left_digits=5 #生成的整数位数, right_digits=2 #生成的小数位数, positive=True #是否只有正数</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pyint()：随机Int数字（参考random_int()参数）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pydecimal()：随机Decimal数字（参考pyfloat参数）</span></span></code></pre></div><p>7、文本、加密类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pystr()：随机字符串</span></span>
<span class="line"><span></span></span>
<span class="line"><span>random_element()：随机字母</span></span>
<span class="line"><span></span></span>
<span class="line"><span>random_letter()：随机字母</span></span>
<span class="line"><span></span></span>
<span class="line"><span>paragraph()：随机生成一个段落</span></span>
<span class="line"><span></span></span>
<span class="line"><span>paragraphs()：随机生成多个段落</span></span>
<span class="line"><span></span></span>
<span class="line"><span>sentence()：随机生成一句话</span></span>
<span class="line"><span></span></span>
<span class="line"><span>sentences()：随机生成多句话，与段落类似</span></span>
<span class="line"><span></span></span>
<span class="line"><span>text()：随机生成一篇文章</span></span>
<span class="line"><span></span></span>
<span class="line"><span>word()：随机生成词语</span></span>
<span class="line"><span></span></span>
<span class="line"><span>words()：随机生成多个词语，用法与段落，句子，类似</span></span>
<span class="line"><span></span></span>
<span class="line"><span>binary()：随机生成二进制编码</span></span>
<span class="line"><span></span></span>
<span class="line"><span>boolean()：True/False</span></span>
<span class="line"><span></span></span>
<span class="line"><span>language_code()：随机生成两位语言编码</span></span>
<span class="line"><span></span></span>
<span class="line"><span>locale()：随机生成语言/国际 信息</span></span>
<span class="line"><span></span></span>
<span class="line"><span>md5()：随机生成MD5</span></span>
<span class="line"><span></span></span>
<span class="line"><span>null_boolean()：NULL/True/False</span></span>
<span class="line"><span></span></span>
<span class="line"><span>password()：随机生成密码,可选参数：length：密码长度；special_chars：是否能使用特殊字符；digits：是否包含数字；upper_case：是否包含大写字母；lower_case：是否包含小写字母</span></span>
<span class="line"><span></span></span>
<span class="line"><span>sha1()：随机SHA1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>sha256()：随机SHA256</span></span>
<span class="line"><span></span></span>
<span class="line"><span>uuid4()：随机UUID</span></span></code></pre></div><p>8、时间信息类</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>date()：随机日期</span></span>
<span class="line"><span></span></span>
<span class="line"><span>date_between()：随机生成指定范围内日期，参数：start_date，end_date</span></span>
<span class="line"><span></span></span>
<span class="line"><span>date_between_dates()：随机生成指定范围内日期，用法同上</span></span>
<span class="line"><span></span></span>
<span class="line"><span>date_object()：随机生产从1970-1-1到指定日期的随机日期。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>date_time()：随机生成指定时间（1970年1月1日至今）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>date_time_ad()：生成公元1年到现在的随机时间</span></span>
<span class="line"><span></span></span>
<span class="line"><span>date_time_between()：用法同dates</span></span>
<span class="line"><span></span></span>
<span class="line"><span>future_date()：未来日期</span></span>
<span class="line"><span></span></span>
<span class="line"><span>future_datetime()：未来时间</span></span>
<span class="line"><span></span></span>
<span class="line"><span>month()：随机月份</span></span>
<span class="line"><span></span></span>
<span class="line"><span>month_name()：随机月份（英文）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>past_date()：随机生成已经过去的日期</span></span>
<span class="line"><span></span></span>
<span class="line"><span>past_datetime()：随机生成已经过去的时间</span></span>
<span class="line"><span></span></span>
<span class="line"><span>time()：随机24小时时间</span></span>
<span class="line"><span></span></span>
<span class="line"><span>timedelta()：随机获取时间差</span></span>
<span class="line"><span></span></span>
<span class="line"><span>time_object()：随机24小时时间，time对象</span></span>
<span class="line"><span></span></span>
<span class="line"><span>time_series()：随机TimeSeries对象</span></span>
<span class="line"><span></span></span>
<span class="line"><span>timezone()：随机时区</span></span>
<span class="line"><span></span></span>
<span class="line"><span>unix_time()：随机Unix时间</span></span>
<span class="line"><span></span></span>
<span class="line"><span>year()：随机年份</span></span></code></pre></div><p>9、python 相关方法</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>profile()：随机生成档案信息</span></span>
<span class="line"><span></span></span>
<span class="line"><span>simple_profile()：随机生成简单档案信息</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pyiterable()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pylist()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pyset()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pystruct()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pytuple()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pydict()</span></span></code></pre></div><h4 id="最定义faker-数据类型" tabindex="-1">最定义Faker 数据类型 <a class="header-anchor" href="#最定义faker-数据类型" aria-label="Permalink to &quot;最定义Faker 数据类型&quot;">​</a></h4><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>from faker import Faker</span></span>
<span class="line"><span>from faker.providers import BaseProvider</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 创建自定义Provider</span></span>
<span class="line"><span>class CustomProvider(BaseProvider):</span></span>
<span class="line"><span>    def customize_type(self):</span></span>
<span class="line"><span>        return &#39;test_Faker_customize_type&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 添加Provider</span></span>
<span class="line"><span>fake = Faker()</span></span>
<span class="line"><span>fake.add_provider(CustomProvider)</span></span>
<span class="line"><span>print(fake.customize_type())</span></span></code></pre></div>`,28)]))}const u=a(l,[["render",i]]);export{_ as __pageData,u as default};
