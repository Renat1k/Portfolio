# Chrome Infinity · portfolio edition

Web derivatives of the author's `Chrome-Infinity.blend` sculpture. The original has two periodic ribbon meshes, 26,520 triangles and five materials. The exporter samples every second longitudinal station for the standard model (13,300 triangles), every fourth for phones (6,684). The transverse profile, inlay, smooth normals and material assignments are retained. Both GLBs use glTF 2.0 `KHR_mesh_quantization`; the 256×128 reflection map comes from the packed Atelier HDR.

`assets/js/sculpture.js` is a small viewer for these specific GLBs (no third-party runtime). The responsive WebP poster uses the original Eevee camera and lights on black. No Blender sources or absolute workstation paths are distributed with the site.

Optional regeneration from an authorized local copy, in the repository root (Blender 5.3, Python with Pillow):

```sh
blender --background --disable-autoexec /path/to/Chrome-Infinity.blend --python-exit-code 1 --python tools/sculpture/export.py -- assets/sculpture /tmp/infinity.png
python tools/sculpture/posters.py /tmp/infinity.png assets/sculpture
```

The normal site build uses the checked-in derivatives and does not require Blender or Python.
