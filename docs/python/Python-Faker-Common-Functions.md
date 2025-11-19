---
title: Python-Faker Common Functions
date: 2023-04-05 22:10:20
tags:
    - python
description: Common functions of the Faker library
author: PFinal南丞
keywords: Python, library, function, common, Faker, generate, data, test, mock
---

# Python-Faker Common Functions

## Faker

Faker is a Python package mainly used to create fake data. With the Faker package, you no longer need to manually generate or write random numbers to create data. You just need to call the methods provided by Faker to complete data generation.

#### Common language codes:

```
Simplified Chinese: zh_CN
Traditional Chinese: zh_TW
US English: en_US
UK English: en_GB
German: de_DE
Japanese: ja_JP
Korean: ko_KR
French: fr_FR
```

Set the language to generate:

```python
fake = Faker(locale='zh_CN')
```

#### Common Functions

1. Geographic Information

```
fake.city_suffix(): city, county
fake.country(): country
fake.country_code(): country code
fake.district(): district
fake.geo_coordinate(): geographic coordinate
fake.latitude(): latitude
fake.longitude(): longitude
fake.postcode(): postal code
fake.province(): province
fake.address(): detailed address
fake.street_address(): street address
fake.street_name(): street name
fake.street_suffix(): street, road
```

2. Basic Information

```
ssn(): generate ID number
bs(): random company service name
company(): random company name (long)
company_prefix(): random company name (short)
company_suffix(): company type
credit_card_expire(): random credit card expiration date
credit_card_full(): generate complete credit card info
credit_card_number(): credit card number
credit_card_provider(): credit card type
credit_card_security_code(): credit card security code
job(): random job
first_name_female(): female first name
first_name_male(): male first name
last_name_female(): female last name
last_name_male(): male last name
name(): random full name
name_female(): female full name
name_male(): male full name
phone_number(): random phone number
phonenumber_prefix(): random phone number prefix
```

3. Computer/Internet Information

```
ascii_company_email(): random ASCII company email
ascii_email(): random ASCII email
company_email(): random company email
email(): random email
safe_email(): safe email
```

4. Network Information

```
domain_name(): generate domain name
domain_word(): domain word (without suffix)
ipv4(): random IPv4 address
ipv6(): random IPv6 address
mac_address(): random MAC address
tld(): domain suffix (.com, .net.cn, etc., without dot)
uri(): random URI
uri_extension(): URI file extension
uri_page(): URI file (without extension)
uri_path(): URI file path (without file name)
url(): random URL
user_name(): random username
image_url(): random image URL
```

5. Browser Information

```
chrome(): random Chrome user_agent
firefox(): random FireFox user_agent
internet_explorer(): random IE user_agent
opera(): random Opera user_agent
safari(): random Safari user_agent
linux_platform_token(): random Linux info
user_agent(): random user_agent info
```

6. Numbers

```
numerify(): three-digit random number
random_digit(): random number 0~9
random_digit_not_null(): random number 1~9
random_int(): random integer, default 0~9999, can set min, max
random_number(): random number, parameter digits sets the number of digits
def pyfloat():
    left_digits=5 # number of integer digits, right_digits=2 # number of decimal digits, positive=True # only positive numbers
pyint(): random int (see random_int() parameters)
pydecimal(): random Decimal (see pyfloat parameters)
```

7. Text/Encryption

```
pystr(): random string
random_element(): random character
random_letter(): random letter
paragraph(): random paragraph
paragraphs(): random paragraphs
sentence(): random sentence
sentences(): random sentences
text(): random article
word(): random word
words(): random words
binary(): random binary encoding
boolean(): True/False
language_code(): random two-letter language code
locale(): random language/country info
md5(): random MD5
null_boolean(): NULL/True/False
password(): random password, optional params: length, special_chars, digits, upper_case, lower_case
sha1(): random SHA1
sha256(): random SHA256
uuid4(): random UUID
```

8. Time Information

```
date(): random date
date_between(): random date in specified range, params: start_date, end_date
date_between_dates(): random date in specified range, same usage as above
date_object(): random date from 1970-1-1 to specified date
date_time(): random datetime (from 1970-1-1 to now)
date_time_ad(): random datetime from year 1 AD to now
date_time_between(): same usage as dates
future_date(): future date
future_datetime(): future datetime
month(): random month
month_name(): random month (English)
past_date(): random past date
past_datetime(): random past datetime
time(): random 24-hour time
timedelta(): random time delta
time_object(): random 24-hour time (time object)
time_series(): random TimeSeries object
timezone(): random timezone
unix_time(): random Unix time
year(): random year
```

9. Python Related Methods

```
profile(): random profile info
simple_profile(): random simple profile info
pyiterable(): random iterable
``` 