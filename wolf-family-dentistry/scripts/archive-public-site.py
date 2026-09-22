"""Read-only crawl of public WordPress pages and media; archive at original paths."""
import concurrent.futures
import hashlib
import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'migration/audit'
SOURCE = OUT / 'source'
BASE = 'https://wolffamilydentistryin.com'
SOURCE.mkdir(parents=True, exist_ok=True)

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'WolfSiteMigrationAudit/1.0'})
    with urllib.request.urlopen(req, timeout=25) as response:
        data = response.read(40 * 1024 * 1024 + 1)
        if len(data) > 40 * 1024 * 1024:
            raise ValueError('File exceeds 40 MB; requires separate download')
        return data, response.status, response.headers.get('Content-Type', ''), response.url

class Inventory(HTMLParser):
    def __init__(self, base):
        super().__init__()
        self.base, self.links, self.resources = base, [], []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'a' and attrs.get('href'):
            self.links.append(urljoin(self.base, attrs['href']))
        for key in ['src', 'poster', 'data-src']:
            if attrs.get(key):
                self.resources.append(urljoin(self.base, attrs[key]))
        for part in attrs.get('srcset', '').split(','):
            if part.strip():
                self.resources.append(urljoin(self.base, part.strip().split()[0]))

pages = json.loads((SOURCE / 'pages.json').read_text())
media = json.loads((SOURCE / 'media-1.json').read_text())
manifest = {'capturedAt': datetime.now(timezone.utc).isoformat(), 'pages': [], 'files': [], 'failures': []}
assets = {}
for item in media:
    assets[item['source_url']] = 'media-library-original'
    original = item.get('media_details', {}).get('original_image')
    if original:
        assets[urljoin(item['source_url'], original)] = 'unscaled-original'

for page in pages:
    data, status, mime, final = fetch(page['link'])
    (SOURCE / f"{page['slug']}.html").write_bytes(data)
    text = data.decode('utf-8')
    parser = Inventory(page['link'])
    parser.feed(text)
    # Include CSS background images and HTML-encoded/JSON-escaped upload URLs.
    unescaped = html.unescape(text).replace('\\/', '/')
    uploads = re.findall(r'(?:https?:)?//[^\s\"\'<>(),]+/wp-content/uploads/[^\s\"\'<>(),]+', unescaped)
    for url in parser.resources + parser.links + uploads:
        if url.startswith('//'): url = 'https:' + url
        parsed = urlsplit(url)
        if parsed.hostname not in ['wolffamilydentistryin.com', 'wolffamilydent.wpengine.com']:
            continue
        if '/wp-content/uploads/' not in parsed.path or not re.search(r'\.(?:pdf|jpe?g|png|gif|webp|svg|mp4|webm|docx?|xlsx?|zip)$', parsed.path, re.I):
            continue
        assets.setdefault(BASE + parsed.path, 'referenced-by-page')
    manifest['pages'].append({'url': page['link'], 'slug': page['slug'], 'status': status, 'sha256': hashlib.sha256(data).hexdigest(), 'links': sorted(set(parser.links)), 'resources': sorted(set(parser.resources))})

def archive(entry):
    url, reason = entry
    data, status, mime, final = fetch(url)
    path = urlsplit(url).path
    if not path.startswith('/wp-content/uploads/') or '..' in Path(path).parts:
        raise ValueError('Unexpected asset path')
    if 'text/html' in mime:
        raise ValueError('Asset returned HTML')
    if path.lower().endswith('.pdf') and not data.startswith(b'%PDF-'):
        raise ValueError('PDF signature is invalid')
    target = ROOT / 'public' / path.lstrip('/')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {'source': url, 'local': path, 'reason': reason, 'status': status, 'contentType': mime, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(archive, entry): entry[0] for entry in assets.items()}
    for future in concurrent.futures.as_completed(futures):
        try:
            manifest['files'].append(future.result())
        except Exception as error:
            manifest['failures'].append({'url': futures[future], 'error': str(error)})

manifest['files'].sort(key=lambda file: file['local'])
manifest['summary'] = {'pages': len(pages), 'publicMediaRecords': len(media), 'archivedFiles': len(manifest['files']), 'pdfs': sum(file['local'].lower().endswith('.pdf') for file in manifest['files']), 'bytes': sum(file['bytes'] for file in manifest['files']), 'failures': len(manifest['failures'])}
(OUT / 'archive-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest['summary'], indent=2))
for failure in manifest['failures']: print(failure)
