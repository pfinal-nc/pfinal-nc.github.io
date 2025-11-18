import{_ as n,c as s,o as e,a6 as p}from"./chunks/framework.DFafSIgU.js";const h=JSON.parse('{"title":"Python-Faker Common Functions","description":"Common functions of the Faker library","frontmatter":{"title":"Python-Faker Common Functions","date":"2023-04-05T22:10:20.000Z","tags":["python"],"description":"Common functions of the Faker library","author":"PFinal南丞","keywords":"Python, library, function, common, Faker, generate, data, test, mock","head":[["meta",{"name":"keywords","content":"Python, library, function, common, Faker, generate, data, test, mock"}]]},"headers":[],"relativePath":"Python/Python-Faker-Common-Functions.md","filePath":"Python/Python-Faker-Common-Functions.md","lastUpdated":1752111561000}'),i={name:"Python/Python-Faker-Common-Functions.md"};function t(l,a,o,r,d,c){return e(),s("div",{"data-pagefind-body":!0,"data-pagefind-meta":"date:1680732620000"},a[0]||(a[0]=[p(`<h1 id="python-faker-common-functions" tabindex="-1">Python-Faker Common Functions <a class="header-anchor" href="#python-faker-common-functions" aria-label="Permalink to &quot;Python-Faker Common Functions&quot;">​</a></h1><h2 id="faker" tabindex="-1">Faker <a class="header-anchor" href="#faker" aria-label="Permalink to &quot;Faker&quot;">​</a></h2><p>Faker is a Python package mainly used to create fake data. With the Faker package, you no longer need to manually generate or write random numbers to create data. You just need to call the methods provided by Faker to complete data generation.</p><h4 id="common-language-codes" tabindex="-1">Common language codes: <a class="header-anchor" href="#common-language-codes" aria-label="Permalink to &quot;Common language codes:&quot;">​</a></h4><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Simplified Chinese: zh_CN</span></span>
<span class="line"><span>Traditional Chinese: zh_TW</span></span>
<span class="line"><span>US English: en_US</span></span>
<span class="line"><span>UK English: en_GB</span></span>
<span class="line"><span>German: de_DE</span></span>
<span class="line"><span>Japanese: ja_JP</span></span>
<span class="line"><span>Korean: ko_KR</span></span>
<span class="line"><span>French: fr_FR</span></span></code></pre></div><p>Set the language to generate:</p><div class="language-python vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">python</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">fake </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Faker(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">locale</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;zh_CN&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span></code></pre></div><h4 id="common-functions" tabindex="-1">Common Functions <a class="header-anchor" href="#common-functions" aria-label="Permalink to &quot;Common Functions&quot;">​</a></h4><ol><li>Geographic Information</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>fake.city_suffix(): city, county</span></span>
<span class="line"><span>fake.country(): country</span></span>
<span class="line"><span>fake.country_code(): country code</span></span>
<span class="line"><span>fake.district(): district</span></span>
<span class="line"><span>fake.geo_coordinate(): geographic coordinate</span></span>
<span class="line"><span>fake.latitude(): latitude</span></span>
<span class="line"><span>fake.longitude(): longitude</span></span>
<span class="line"><span>fake.postcode(): postal code</span></span>
<span class="line"><span>fake.province(): province</span></span>
<span class="line"><span>fake.address(): detailed address</span></span>
<span class="line"><span>fake.street_address(): street address</span></span>
<span class="line"><span>fake.street_name(): street name</span></span>
<span class="line"><span>fake.street_suffix(): street, road</span></span></code></pre></div><ol start="2"><li>Basic Information</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ssn(): generate ID number</span></span>
<span class="line"><span>bs(): random company service name</span></span>
<span class="line"><span>company(): random company name (long)</span></span>
<span class="line"><span>company_prefix(): random company name (short)</span></span>
<span class="line"><span>company_suffix(): company type</span></span>
<span class="line"><span>credit_card_expire(): random credit card expiration date</span></span>
<span class="line"><span>credit_card_full(): generate complete credit card info</span></span>
<span class="line"><span>credit_card_number(): credit card number</span></span>
<span class="line"><span>credit_card_provider(): credit card type</span></span>
<span class="line"><span>credit_card_security_code(): credit card security code</span></span>
<span class="line"><span>job(): random job</span></span>
<span class="line"><span>first_name_female(): female first name</span></span>
<span class="line"><span>first_name_male(): male first name</span></span>
<span class="line"><span>last_name_female(): female last name</span></span>
<span class="line"><span>last_name_male(): male last name</span></span>
<span class="line"><span>name(): random full name</span></span>
<span class="line"><span>name_female(): female full name</span></span>
<span class="line"><span>name_male(): male full name</span></span>
<span class="line"><span>phone_number(): random phone number</span></span>
<span class="line"><span>phonenumber_prefix(): random phone number prefix</span></span></code></pre></div><ol start="3"><li>Computer/Internet Information</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ascii_company_email(): random ASCII company email</span></span>
<span class="line"><span>ascii_email(): random ASCII email</span></span>
<span class="line"><span>company_email(): random company email</span></span>
<span class="line"><span>email(): random email</span></span>
<span class="line"><span>safe_email(): safe email</span></span></code></pre></div><ol start="4"><li>Network Information</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>domain_name(): generate domain name</span></span>
<span class="line"><span>domain_word(): domain word (without suffix)</span></span>
<span class="line"><span>ipv4(): random IPv4 address</span></span>
<span class="line"><span>ipv6(): random IPv6 address</span></span>
<span class="line"><span>mac_address(): random MAC address</span></span>
<span class="line"><span>tld(): domain suffix (.com, .net.cn, etc., without dot)</span></span>
<span class="line"><span>uri(): random URI</span></span>
<span class="line"><span>uri_extension(): URI file extension</span></span>
<span class="line"><span>uri_page(): URI file (without extension)</span></span>
<span class="line"><span>uri_path(): URI file path (without file name)</span></span>
<span class="line"><span>url(): random URL</span></span>
<span class="line"><span>user_name(): random username</span></span>
<span class="line"><span>image_url(): random image URL</span></span></code></pre></div><ol start="5"><li>Browser Information</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>chrome(): random Chrome user_agent</span></span>
<span class="line"><span>firefox(): random FireFox user_agent</span></span>
<span class="line"><span>internet_explorer(): random IE user_agent</span></span>
<span class="line"><span>opera(): random Opera user_agent</span></span>
<span class="line"><span>safari(): random Safari user_agent</span></span>
<span class="line"><span>linux_platform_token(): random Linux info</span></span>
<span class="line"><span>user_agent(): random user_agent info</span></span></code></pre></div><ol start="6"><li>Numbers</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>numerify(): three-digit random number</span></span>
<span class="line"><span>random_digit(): random number 0~9</span></span>
<span class="line"><span>random_digit_not_null(): random number 1~9</span></span>
<span class="line"><span>random_int(): random integer, default 0~9999, can set min, max</span></span>
<span class="line"><span>random_number(): random number, parameter digits sets the number of digits</span></span>
<span class="line"><span>def pyfloat():</span></span>
<span class="line"><span>    left_digits=5 # number of integer digits, right_digits=2 # number of decimal digits, positive=True # only positive numbers</span></span>
<span class="line"><span>pyint(): random int (see random_int() parameters)</span></span>
<span class="line"><span>pydecimal(): random Decimal (see pyfloat parameters)</span></span></code></pre></div><ol start="7"><li>Text/Encryption</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pystr(): random string</span></span>
<span class="line"><span>random_element(): random character</span></span>
<span class="line"><span>random_letter(): random letter</span></span>
<span class="line"><span>paragraph(): random paragraph</span></span>
<span class="line"><span>paragraphs(): random paragraphs</span></span>
<span class="line"><span>sentence(): random sentence</span></span>
<span class="line"><span>sentences(): random sentences</span></span>
<span class="line"><span>text(): random article</span></span>
<span class="line"><span>word(): random word</span></span>
<span class="line"><span>words(): random words</span></span>
<span class="line"><span>binary(): random binary encoding</span></span>
<span class="line"><span>boolean(): True/False</span></span>
<span class="line"><span>language_code(): random two-letter language code</span></span>
<span class="line"><span>locale(): random language/country info</span></span>
<span class="line"><span>md5(): random MD5</span></span>
<span class="line"><span>null_boolean(): NULL/True/False</span></span>
<span class="line"><span>password(): random password, optional params: length, special_chars, digits, upper_case, lower_case</span></span>
<span class="line"><span>sha1(): random SHA1</span></span>
<span class="line"><span>sha256(): random SHA256</span></span>
<span class="line"><span>uuid4(): random UUID</span></span></code></pre></div><ol start="8"><li>Time Information</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>date(): random date</span></span>
<span class="line"><span>date_between(): random date in specified range, params: start_date, end_date</span></span>
<span class="line"><span>date_between_dates(): random date in specified range, same usage as above</span></span>
<span class="line"><span>date_object(): random date from 1970-1-1 to specified date</span></span>
<span class="line"><span>date_time(): random datetime (from 1970-1-1 to now)</span></span>
<span class="line"><span>date_time_ad(): random datetime from year 1 AD to now</span></span>
<span class="line"><span>date_time_between(): same usage as dates</span></span>
<span class="line"><span>future_date(): future date</span></span>
<span class="line"><span>future_datetime(): future datetime</span></span>
<span class="line"><span>month(): random month</span></span>
<span class="line"><span>month_name(): random month (English)</span></span>
<span class="line"><span>past_date(): random past date</span></span>
<span class="line"><span>past_datetime(): random past datetime</span></span>
<span class="line"><span>time(): random 24-hour time</span></span>
<span class="line"><span>timedelta(): random time delta</span></span>
<span class="line"><span>time_object(): random 24-hour time (time object)</span></span>
<span class="line"><span>time_series(): random TimeSeries object</span></span>
<span class="line"><span>timezone(): random timezone</span></span>
<span class="line"><span>unix_time(): random Unix time</span></span>
<span class="line"><span>year(): random year</span></span></code></pre></div><ol start="9"><li>Python Related Methods</li></ol><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>profile(): random profile info</span></span>
<span class="line"><span>simple_profile(): random simple profile info</span></span>
<span class="line"><span>pyiterable(): random iterable</span></span></code></pre></div>`,26)]))}const u=n(i,[["render",t]]);export{h as __pageData,u as default};
