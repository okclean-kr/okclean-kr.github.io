#!/usr/bin/env python3
"""Owned-source discovery and immutable private originals. Never approves or publishes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
from datetime import datetime, timezone
from urllib.request import Request, build_opener
from urllib.parse import urlsplit
from PIL import Image, ImageOps
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sync_blog_cases import BLOGS, NoRedirect, fetch_feed, parse_feed, service_for, IMAGE_HOSTS

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.okclean-private'

def digest(data): return hashlib.sha256(data).hexdigest()

def visual_hash(file):
    with Image.open(file) as img:
        small = ImageOps.grayscale(ImageOps.exif_transpose(img)).resize((9, 8))
        pixels = list(small.getdata())
        bits = ''.join('1' if pixels[y*9+x]>pixels[y*9+x+1] else '0' for y in range(8) for x in range(8))
        return f'{int(bits,2):016x}'

def save_json(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp=p.with_suffix('.tmp')
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    os.replace(tmp,p)

def acquire(url, hosts, limit=8*1024*1024, token=None):
    u=urlsplit(url)
    if u.scheme!='https' or u.hostname not in hosts or u.username or u.password or u.port:
        raise ValueError('SOURCE_HOST_NOT_APPROVED')
    req=Request(url,headers={'User-Agent':'OKClean-Media/1.0', **({'Authorization':'Bearer '+token} if token else {})})
    with build_opener(NoRedirect()).open(req,timeout=30) as res:
        data=res.read(limit+1)
    if len(data)>limit: raise ValueError('SOURCE_SIZE')
    return data

def private_original(data):
    # Hash-addressed immutable file. An existing original is never replaced.
    PRIVATE.mkdir(mode=0o700,exist_ok=True)
    target=PRIVATE/digest(data)
    if target.exists():
        if digest(target.read_bytes())!=digest(data): raise ValueError('ORIGINAL_INTEGRITY')
    else:
        with target.open('xb') as out: out.write(data)
        target.chmod(0o600)
    return '.okclean-private/'+target.name

def candidate(file, source, source_url, **meta):
    data=file.read_bytes(); h=digest(data)
    with Image.open(file) as img: width,height=img.size
    return {'id':'okc-asset-'+h[:24], 'type':'image','source':source,'source_url':source_url,
            'collected_at':datetime.now(timezone.utc).isoformat(),'captured_at':None,
            'sha256':h,'visual_hash':visual_hash(file),'width':width,'height':height,
            'bytes':len(data),'original_location':str(file.relative_to(ROOT)),
            'rights':{'status':'pending','evidence':None},'privacy':{'status':'pending','reviewed_by':None},
            'consent':{'threads_reuse':False,'evidence':None},'synthetic':None,
            'public_url':None,'variant_sha256':None,'threads_posted':False,'threads_id':None,'reusable':False,**meta}

def ingest_existing(library):
    cases=json.loads((ROOT/'cases.json').read_text())['cases']
    sources={x.get('img'):x for x in cases}
    for file in sorted((ROOT/'case-images').glob('*')):
        if not file.is_file():continue
        rel=str(file.relative_to(ROOT)); post=sources.get(rel,{})
        entry=candidate(file,'naver-existing-cache' if post else 'owner-provided-frame',post.get('link'),
                        title=post.get('title'),published_at=post.get('date'),service=post.get('svc'),
                        original_scope='existing-public-site-only; Threads reuse needs review')
        # Preserve all approvals; do not infer job proof from the historic kind field.
        if not any(x['sha256']==entry['sha256'] for x in library['assets']):library['assets'].append(entry)

def collect_naver(library,report):
    now=datetime.now(timezone.utc)
    for blog in BLOGS:
        try:
            posts=parse_feed(fetch_feed(blog),blog,now)
            images=0
            for post in posts[:5]:
                if not post['img']:continue
                try:
                    data=acquire(post['img'],IMAGE_HOSTS)
                    loc=private_original(data)
                    file=ROOT/loc
                    entry=candidate(file,'naver-rss',post['link'],title=post['title'],published_at=post['published'].isoformat(),
                                    service=service_for(post['title']),summary=post['description'][:350],source_media_url=post['img'])
                    if not any(x['sha256']==entry['sha256'] for x in library['assets']):library['assets'].append(entry)
                    images+=1
                except Exception: report.append({'source':'naver','blog':blog,'post':post['link'],'status':'media-acquisition-failed'})
            report.append({'source':'naver','blog':blog,'status':'collected','posts':len(posts),'original_images':images})
        except Exception:report.append({'source':'naver','blog':blog,'status':'source-fetch-failed-existing-assets-preserved'})

def collect_instagram(config,report):
    token=os.getenv('OKC_INSTAGRAM_ACCESS_TOKEN')
    if not token or not config.get('expected_id') or not config.get('expected_username'):
        report.append({'source':'instagram','status':'blocked-missing-dedicated-token-or-owned-account-identity'})
        return
    # Instagram Login only, never fall back to a Threads or another brand token.
    me=json.loads(acquire('https://graph.instagram.com/v27.0/me?fields=id,username',{'graph.instagram.com'},token=token))
    if me.get('id')!=config['expected_id'] or me.get('username')!=config['expected_username']:raise ValueError('INSTAGRAM_ACCOUNT_MISMATCH')
    media=json.loads(acquire(f"https://graph.instagram.com/v27.0/{me['id']}/media?fields=id,caption,media_type,media_url,permalink,timestamp&limit=50",{'graph.instagram.com'},token=token))
    PRIVATE.mkdir(mode=0o700,exist_ok=True)
    # Save discovery privately: captions and CDN URLs can include identifying data.
    save_json(PRIVATE/'instagram-discovery.json',media)
    acquired=0
    for item in media.get('data',[]):
        url=item.get('media_url')
        if not url:continue
        host=urlsplit(url).hostname or ''
        if not (host.endswith('.cdninstagram.com') or host.endswith('.fbcdn.net')):continue
        try:
            data=acquire(url,{host},limit=128*1024*1024)
            private_original(data);acquired+=1
        except Exception:report.append({'source':'instagram','media_id':item.get('id'),'status':'original-acquisition-failed'})
    report.append({'source':'instagram','originals_acquired':acquired,'status':'pending-private-visual-and-rights-review'})
    report.append({'source':'instagram','status':'api-access-verified-original-review-required','media_count':len(media.get('data',[])),
                   'pagination_remaining':bool(media.get('paging',{}).get('next'))})

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--network',action='store_true');args=ap.parse_args()
    p=ROOT/'ops/threads-media-library.json'
    library=json.loads(p.read_text()) if p.exists() else {'brand':'okclean','assets':[]}
    report=[];ingest_existing(library)
    if args.network:collect_naver(library,report)
    config=json.loads((ROOT/'ops/threads-sources.json').read_text())
    try:collect_instagram(config['instagram'],report)
    except Exception:report.append({'source':'instagram','status':'api-access-failed-no-fallback'})
    report.append({'source':'youtube','status':'blocked-owned-channel-and-originals-required','download_bypass':False})
    library['updated_at']=datetime.now(timezone.utc).isoformat()
    # Private discoveries are excluded from the public manifest until a human clears them.
    public={**library,'assets':[x for x in library['assets'] if not x['original_location'].startswith('.okclean-private/')]}
    save_json(PRIVATE/'media-library.json',library)
    save_json(p,public)
    save_json(ROOT/'ops/threads-collection-report.json',{'checked_at':library['updated_at'],'sources':report,'cached_assets':len(public['assets']),
        'private_candidates':len(library['assets'])-len(public['assets']),'approved_assets':sum(x['rights']['status']=='approved' for x in public['assets'])})
    print(json.dumps({'cached_assets':len(public['assets']),'sources':report},ensure_ascii=False))

if __name__=='__main__':main()
