"""Optional offline export in background Blender. See tools/sculpture/README.md."""
from pathlib import Path
import json
import math
import struct
import sys
import zlib

import bpy
import numpy as np

out, poster = map(Path, sys.argv[sys.argv.index('--') + 1:])
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
parts = sorted(bpy.data.objects['Chrome Infinity'].children, key=lambda ob: ob.name)
assert len(parts) == 2 and all(ob.type == 'MESH' for ob in parts)


def export(filename, step):
    doc = dict(asset={'version': '2.0', 'generator': 'FluentFable / Chrome Infinity'},
               extensionsRequired=['KHR_mesh_quantization'], extensionsUsed=['KHR_mesh_quantization'],
               scene=0, scenes=[{'nodes': [0, 1]}], nodes=[], meshes=[], materials=[],
               bufferViews=[], accessors=[])
    binary = bytearray()

    def view(data, target, **kwargs):
        binary.extend(b'\0' * (-len(binary) % 4))
        idx = len(doc['bufferViews'])
        doc['bufferViews'].append(dict(buffer=0, byteOffset=len(binary), byteLength=len(data), target=target, **kwargs))
        binary.extend(data)
        return idx

    def accessor(view_id, count, component, kind, **kwargs):
        idx = len(doc['accessors'])
        doc['accessors'].append(dict(bufferView=view_id, count=count, componentType=component, type=kind, **kwargs))
        return idx

    triangles = 0
    for ob in parts:
        mesh = ob.data
        count, loops = int(ob['Stations']), int(ob['Profile loops'])
        assert len(mesh.vertices) == count * loops and len(mesh.polygons) == count * loops
        # Keep the complete cross-section, including its narrow blue inlay. Reduce
        # only the samples along each closed ribbon, retaining its original normals.
        stations = list(range(0, count, step))
        rows, positions = bytearray(), []
        for station in stations:
            for j in range(loops):
                v = mesh.vertices[station * loops + j]
                x, y, z = v.co
                nx, ny, nz = v.normal
                p = tuple(round(t / 4 * 32767) for t in (x, z, -y))
                n = tuple(round(t * 32767) for t in (nx, nz, -ny))
                rows.extend(struct.pack('<3h3h', *p, *n))
                positions.append(p)
        verts = view(rows, 34962, byteStride=12)
        position = accessor(verts, len(positions), 5122, 'VEC3', normalized=True,
                            min=list(map(min, zip(*positions))), max=list(map(max, zip(*positions))))
        normal = accessor(verts, len(positions), 5122, 'VEC3', normalized=True, byteOffset=6)
        primitives = []
        for slot, mat in enumerate(mesh.materials):
            indices = []
            for i, station in enumerate(stations):
                for j in range(loops):
                    if mesh.polygons[station * loops + j].material_index != slot:
                        continue
                    a = i * loops + j
                    b = i * loops + (j + 1) % loops
                    k = (i + 1) % len(stations) * loops
                    c, d = k + (j + 1) % loops, k + j
                    indices.extend((a, b, c, a, c, d))
            idx = accessor(view(struct.pack(f'<{len(indices)}H', *indices), 34963), len(indices), 5123, 'SCALAR')
            shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs
            val = lambda key: shader[key].default_value
            material = dict(name=mat.name, pbrMetallicRoughness=dict(baseColorFactor=list(val('Base Color')),
                            metallicFactor=val('Metallic'), roughnessFactor=val('Roughness')),
                            emissiveFactor=[v * val('Emission Strength') for v in val('Emission Color')[:3]])
            primitives.append(dict(attributes={'POSITION': position, 'NORMAL': normal}, indices=idx, material=len(doc['materials'])))
            doc['materials'].append(material)
            triangles += len(indices) // 3
        doc['nodes'].append(dict(mesh=len(doc['meshes']), name=ob.name, scale=[4, 4, 4]))
        doc['meshes'].append(dict(primitives=primitives))
    binary.extend(b'\0' * (-len(binary) % 4))
    doc['buffers'] = [dict(byteLength=len(binary))]
    meta = json.dumps(doc, separators=(',', ':')).encode()
    meta += b' ' * (-len(meta) % 4)
    data = struct.pack('<4s4I', b'glTF', 2, 28 + len(meta) + len(binary), len(meta), 0x4e4f534a) + meta
    data += struct.pack('<II', len(binary), 0x004e4942) + binary
    (out / filename).write_bytes(data)
    print(filename, triangles, 'triangles;', len(data), 'bytes')


export('infinity.glb', 2)
export('infinity-lite.glb', 4)

# Bake the author's packed linear HDR into a small, reversible RGB reflection map.
env = next(n.image for n in scene.world.node_tree.nodes if n.type == 'TEX_ENVIRONMENT')
w, h = env.size[:]
pixels = np.empty(w * h * 4, np.float32)
env.pixels.foreach_get(pixels)
linear = pixels.reshape(h, w, 4)[::-1, :, :3].reshape(128, h // 128, 256, w // 256, 3).mean(axis=(1, 3))
rgb = np.rint(255 * np.sqrt(linear / (1 + linear))).astype(np.uint8)
def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
(out / 'atelier.png').write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', 256, 128, 8, 2, 0, 0, 0))
    + chunk(b'IDAT', zlib.compress(b''.join(b'\0' + row.tobytes() for row in rgb), 9)) + chunk(b'IEND', b''))

# Only the background Blender process is changed; never save the source .blend.
for obj in scene.objects:
    if obj.type == 'MESH' and obj not in parts:
        obj.hide_render = True
scene.render.film_transparent = True
scene.render.resolution_percentage = 80
settings = scene.render.image_settings
assert settings.file_format == 'PNG'
settings.color_mode = next(i.identifier for i in settings.bl_rna.properties['color_mode'].enum_items if i.identifier == 'RGBA')
scene.render.filepath = str(poster)
bpy.ops.render.render(write_still=True)
