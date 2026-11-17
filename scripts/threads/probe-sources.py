#!/usr/bin/env python3
"""Read-only source availability probe. No private media bytes or text are logged."""
import json
import sys
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from sync_blog_cases import BLOGS,fetch_feed,parse_feed
for blog in BLOGS:
    try:
        posts=parse_feed(fetch_feed(blog),blog,datetime.now(timezone.utc))
        print(json.dumps({'source':'naver','blog':blog,'status':'feed-verified','post_count':len(posts),'image_reference_count':sum(bool(x['img']) for x in posts)}))
    except Exception:
        print(json.dumps({'source':'naver','blog':blog,'status':'feed-unavailable-existing-cache-preserved'}))
