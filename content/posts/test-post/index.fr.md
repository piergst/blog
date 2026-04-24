+++
date = '2026-04-24T11:11:59+02:00'
title = 'Démo markdown — édition offsec'
summary = "Article de démo qui illustre la plupart des features markdown utiles pour rédiger des writeups offsec: blocs de code multi-langages, tableaux, listes de tâches, citations, images, liens, notes de bas de page et embed de contenu interactif."
+++

Cet article sert de **référence visuelle** pour tester la mise en forme du blog. Il couvre la plupart des éléments markdown utiles pour rédiger des *writeups* de pentest ou de CTF.

## Suivi d'engagement

Exemple de checklist qu'on garde à portée pendant une mission:

- [x] Reconnaissance passive
- [x] Scan de ports
- [ ] Enumération des services
- [ ] Exploitation
- [ ] Post-exploitation
- [ ] Rapport final

## Surfaces courantes

| Port  | Service | Outil usuel      | Note                          |
|-------|---------|------------------|-------------------------------|
| 21    | FTP     | `hydra`, `ftp`   | Anonymous login à tester      |
| 22    | SSH     | `hydra`, `ssh`   | Version banner → CVEs connus  |
| 80    | HTTP    | `burp`, `ffuf`   | Directory fuzzing systématique |
| 443   | HTTPS   | `burp`, `sslyze` | Certificat, ciphers faibles   |
| 445   | SMB     | `smbclient`      | Null session, shares ouverts  |

## Reconnaissance

### Scan de ports initial

On lance un scan rapide pour identifier les services exposés:

```bash
nmap -sV -sC -oA scans/initial 10.10.10.42
```

Les flags:

1. `-sV` — détection de version
2. `-sC` — scripts NSE par défaut
3. `-oA` — sortie dans les 3 formats (nmap, gnmap, xml)

### Inspection manuelle

Pour un service HTTP on passe toujours par `curl` avant d'ouvrir Burp:

```http
GET / HTTP/1.1
Host: target.htb
User-Agent: Mozilla/5.0
Accept: */*
```

Une réponse intéressante peut donner:

```http
HTTP/1.1 200 OK
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Set-Cookie: PHPSESSID=abc123; HttpOnly
```

> **À noter:** un header `Server` verbeux ou un `X-Powered-By` trahissent souvent la stack, ce qui oriente l'exploitation vers des CVEs connus de cette version précise.

## Exploitation

### Payload type

Énumération SQLi rapide en Python:

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

### Exemple de données exfiltrées

```json
{
  "users": [
    {"id": 1, "username": "admin", "role": "superuser"},
    {"id": 2, "username": "carlos", "role": "user"}
  ]
}
```

### Configuration observée

```yaml
database:
  host: localhost
  user: root
  password: "changeme123"   # ← intéressant
  port: 3306
```

## Capture et preuve

![Requête POST capturée dans Burp Repeater](test-image.jpg)

## Démo intégrée

Un shortcode peut embarquer une démo HTML/JS custom co-localisée dans le bundle de l'article:

{{< test-post/anim-bouncing-ball >}}

## Style inline

- **gras** pour appuyer
- *italique* pour nuancer
- ~~barré~~ pour une info dépassée
- `code inline` pour une commande, un nom de variable, un header

Note de bas de page[^1] pour préciser un point sans casser le flux de lecture.

## Références

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HackTricks](https://book.hacktricks.xyz/)
- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
- Voir aussi la page [À propos](/about/)

---

## Kill chain

Bloc sans langage pour un résumé ASCII:

```
Reconnaissance
  └─ services identifiés
       └─ version vulnérable trouvée
            └─ exploit public adapté
                 └─ shell obtenu
                      └─ privesc → root
```

[^1]: Exemple de note détachée du paragraphe principal. Utile pour les détails qui alourdiraient la lecture.
