#!/usr/bin/env python3
"""Register an owner-supplied MP4 without making the original or variant public."""
import argparse
from datetime import datetime,timezone
import json
from pathlib import Path
import subprocess
import tempfile
from collect import ROOT, PRIVATE, digest, visual_hash, save_json


def register(file):
    file=Path(file).resolve()
    if not file.is_relative_to(PRIVATE.resolve()) or file.suffix.lower()!='.mp4':raise ValueError('PRIVATE_OWNER_MP4_REQUIRED')
    before=digest(file.read_bytes())
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]))
    video=next(x for x in probe['streams'] if x['codec_type']=='video')
    seconds=min(5,float(probe['format']['duration'])/2)
    with tempfile.TemporaryDirectory() as tmp:
        thumb=Path(tmp)/'frame.jpg'
        subprocess.run(['ffmpeg','-v','error','-nostdin','-ss',str(seconds),'-i',str(file),'-frames:v','1',str(thumb)],check=True)
        vhash=visual_hash(thumb)
    p=ROOT/'ops/threads-media-library.json';lib=json.loads(p.read_text())
    if not any(x['sha256']==before for x in lib['assets']):
        lib['assets'].append({'id':'okc-asset-'+before[:24],'type':'video','source':'owner-provided-original',
            'source_url':None,'original_location':'owner-private://'+before,'sha256':before,'visual_hash':vhash,
            'collected_at':datetime.now(timezone.utc).isoformat(),'captured_at':None,'service':'washer',
            'bytes':file.stat().st_size,'width':video['width'],'height':video['height'],'duration_seconds':float(probe['format']['duration']),
            'visual_hash_frame_seconds':seconds,'rights':{'status':'pending','evidence':None},
            'privacy':{'status':'pending','reviewed_by':None},'consent':{'threads_reuse':False,'evidence':None},
            'synthetic':False,'public_url':None,'variant_sha256':None,'threads_posted':False,'threads_id':None,'reusable':False,
            'youtube_matching':'not-verified','audio_rights':'not-reviewed; variant defaults to muted'})
        save_json(p,lib)
    save_json(PRIVATE/(before+'-source.json'),{'sha256':before,'path':str(file),'source':'owner-supplied-original'})
    if digest(file.read_bytes())!=before:raise ValueError('ORIGINAL_CHANGED')
    print(json.dumps({'registered_sha256':before,'duration_seconds':float(probe['format']['duration']),'review':'pending','original_unchanged':True}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('file');a=p.parse_args();register(a.file)
