#!/usr/bin/env python3
"""Create a separate Threads variant from a reviewed owner original, never overwrite it."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageOps


def prepare(source, dest, kind):
    source=Path(source);dest=Path(dest)
    if dest.exists() or source.resolve()==dest.resolve():raise ValueError('OUTPUT_MUST_BE_NEW')
    dest.parent.mkdir(parents=True,exist_ok=True)
    if kind=='image':
        with Image.open(source) as im:
            im=ImageOps.exif_transpose(im).convert('RGB'); im.thumbnail((1440,1440))
            if im.width<320 or not .1<=im.width/im.height<=10:raise ValueError('IMAGE_DIMENSIONS')
            im.save(dest,format='JPEG',quality=90,exif=b'')
    else:
        # No source music is reused; audio needs its own rights review before retention.
        subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(source),'-t','300',
            '-map','0:v:0','-an','-vf',"scale='min(1080,iw)':-2,fps=30,setsar=1",'-c:v','libx264','-pix_fmt','yuv420p',
            '-flags','+cgop','-g','60','-map_metadata','-1','-movflags','+faststart','-use_editlist','0',str(dest)],check=True)
    return {'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest()}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('dest');p.add_argument('--type',choices=['image','video'],required=True);a=p.parse_args()
    print(json.dumps(prepare(a.source,a.dest,a.type)))
