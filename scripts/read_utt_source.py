"""Read-only source snapshot. Credentials stay in process memory, never in output."""
import os, json, re, sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
from datetime import datetime
from zoneinfo import ZoneInfo
import requests

BASE = 'https://www.utt.ac.th/guide/'
class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.fields = {}; self.links = []; self.images = []; self.rows = []
        self.row = None; self.select = None; self.option = None; self.area = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'img' and a.get('src'): self.images.append(a['src'])
        if tag == 'tr': self.row = []
        if tag == 'input' and a.get('name') and a.get('type') != 'password' and a['name'] not in ('username','pass','csrf','token'):
            if a.get('type') not in ('radio','checkbox') or 'checked' in a: self.fields[a['name']] = a.get('value','')
        if tag == 'select': self.select = a.get('name')
        if tag == 'option' and self.select: self.option = {'selected':'selected' in a, 'value':a.get('value',''), 'text':[]}
        if tag == 'textarea': self.area = a.get('name'); self.fields[self.area] = ''
    def handle_data(self, data):
        if self.row is not None: self.row.append(data)
        if self.option is not None: self.option['text'].append(data)
        if self.area: self.fields[self.area] += data
    def handle_endtag(self, tag):
        if tag == 'tr' and self.row is not None:
            self.rows.append(' '.join(' '.join(self.row).split())); self.row = None
        if tag == 'option' and self.option is not None:
            if self.option['selected']: self.fields[self.select] = {'value':self.option['value'],'text':''.join(self.option['text']).strip()}
            self.option = None
        if tag == 'select': self.select = None
        if tag == 'textarea': self.area = None

def main():
    session = requests.Session()
    session.get(BASE+'login.php', params={'username':os.environ['UTT_SOURCE_USER'],'pass':os.environ['UTT_SOURCE_PASSWORD']},timeout=25)
    def read(path):
        response=session.get(urljoin(BASE,path),timeout=25); response.raise_for_status(); response.encoding='utf-8'
        page=Page(); page.feed(response.text)
        if 'username' in page.fields: raise RuntimeError('Login required')
        if 'name="username"' in response.text: raise RuntimeError('Login required')
        return page
    today=datetime.now(ZoneInfo('Asia/Bangkok')).date().isoformat()
    result={'retrievedAt':datetime.now(ZoneInfo('Asia/Bangkok')).isoformat(),'cutoffDate':today,'source':'utt.ac.th','letters':[],'guidance':[],'errors':[]}
    for kind, table, detail in [('letters','file_letter.php','letter_edit.php'),('guidance','guidance_table.php','guidance_edit.php')]:
        listing=read(table)
        result[kind+'TableRows']=listing.rows
        links=list(dict.fromkeys(l for l in listing.links if re.fullmatch(detail.replace('.','\\.')+r'\?id_guide=\d+',l)))
        print(f'{kind}: {len(links)} source records',flush=True)
        for index,link in enumerate(links):
            ident=link.split('=')[-1]
            try:
                page=read(link)
                photos=list(dict.fromkeys(urljoin(BASE,p) for p in page.images if ('file_letter/' in p or 'file_guidance/' in p)))
                result[kind].append({'idGuide':ident,'sourceUrl':urljoin(BASE,link),'fields':page.fields,'photos':photos})
            except Exception as exc: result['errors'].append({'source':kind,'idGuide':ident,'error':type(exc).__name__})
            if (index+1)%30==0: print(f'{kind}: read {index+1}/{len(links)}',flush=True)
    destination=Path('backup')/('utt-source-'+today+'.json'); destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'snapshot':str(destination),'letters':len(result['letters']),'guidance':len(result['guidance']),'errors':len(result['errors'])}))
    if result['errors']: sys.exit(2)
if __name__=='__main__':
    try: main()
    except Exception as exc:
        print('Source read failed: '+type(exc).__name__); sys.exit(1)
