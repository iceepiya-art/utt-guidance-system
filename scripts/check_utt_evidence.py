"""Check source evidence URLs read-only; no credentials or image uploads."""
import json, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
root=Path(__file__).resolve().parents[1]
source_path=Path(sys.argv[1]) if len(sys.argv)>1 else Path('backup/utt-import-preview-2026-09-23.json')
source=json.loads((root/source_path).read_text(encoding='utf-8'))
keys=('letters','guidance') if 'letters' in source else ('submissions','actualGuidance')
urls=sorted({url for key in keys for record in source[key] for url in record['photos']})
def check(url):
    try:
        with requests.get(url,stream=True,timeout=20) as response:
            content_type=response.headers.get('Content-Type','').split(';')[0]
            prefix=next(response.iter_content(chunk_size=32),b'')
            image_signature=prefix.startswith((b'\xff\xd8\xff',b'\x89PNG\r\n\x1a\n',b'GIF87a',b'GIF89a')) or (prefix[:4]==b'RIFF' and prefix[8:12]==b'WEBP')
            return {'url':url,'status':response.status_code,'contentType':content_type,'ok':response.status_code==200 and image_signature}
    except requests.RequestException:
        return {'url':url,'ok':False,'error':'Network request failed'}
with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(check,urls))
output=root/'backup'/('utt-evidence-check-'+source_path.stem[-10:]+'.json')
output.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'uniquePhotos':len(results),'accessible':sum(r['ok'] for r in results),'unavailable':sum(not r['ok'] for r in results)}))
