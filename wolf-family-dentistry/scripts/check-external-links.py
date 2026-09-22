"""Check public hyperlink destinations without submitting forms or sending messages."""
import concurrent.futures
import json
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
audit = ROOT / 'migration/audit'
manifest = json.loads((audit / 'archive-manifest.json').read_text())
migrations = json.loads((ROOT / 'src/data/link-migrations.json').read_text())
urls = set()
for page in manifest['pages']:
    for href in page['links']:
        if urlsplit(href).scheme in ['http', 'https'] and urlsplit(href).hostname != 'wolffamilydentistryin.com':
            urls.add(href)
urls.update(migrations.values())

def check(url):
    result = {'url': url}
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; WolfSiteMigrationAudit/1.0)'})
        with urllib.request.urlopen(req, timeout=25) as response:
            result.update(status=response.status, finalUrl=response.url, contentType=response.headers.get('Content-Type'))
    except urllib.error.HTTPError as error:
        result.update(status=error.code, finalUrl=error.url, error=str(error))
    except Exception as error:
        result.update(error=str(error))
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(check, sorted(urls)))
(audit / 'external-links.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
