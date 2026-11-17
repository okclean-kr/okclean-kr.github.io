import unittest
import tempfile
from pathlib import Path
import sys
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/threads'))
from collect import visual_hash, candidate, acquire, digest
from prepare import prepare

class MediaTests(unittest.TestCase):
    def test_original_preserved_and_jpeg_variant(self):
        with tempfile.TemporaryDirectory() as td:
            src=Path(td)/'original.png'; dst=Path(td)/'variant.jpg'
            Image.new('RGB',(1920,1080),'blue').save(src)
            before=src.read_bytes();result=prepare(src,dst,'image')
            self.assertEqual(src.read_bytes(),before)
            self.assertEqual(result['sha256'],digest(dst.read_bytes()))
            with Image.open(dst) as im:self.assertEqual(im.format,'JPEG');self.assertEqual(im.width,1440)
            with self.assertRaises(ValueError):prepare(src,dst,'image')
    def test_visual_hash_identical_under_resize(self):
        with tempfile.TemporaryDirectory() as td:
            a=Path(td)/'a.png';b=Path(td)/'b.jpg'
            im=Image.linear_gradient('L').resize((720,1280));im.save(a);im.resize((360,640)).save(b)
            self.assertEqual(visual_hash(a),visual_hash(b))
    def test_download_untrusted_or_non_https_blocked(self):
        for u in ['http://blogfiles.pstatic.net/x','https://evil.invalid/x','https://blogfiles.pstatic.net@evil.invalid/x','https://blogfiles.pstatic.net:8443/x']:
            with self.assertRaises(ValueError):acquire(u,{'blogfiles.pstatic.net'})
    def test_low_resolution_variant_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'tiny.png';Image.new('RGB',(20,20)).save(p)
            with self.assertRaises(ValueError):prepare(p,Path(td)/'out.jpg','image')

if __name__=='__main__':unittest.main()
