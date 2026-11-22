# Acerta o sentido das faces da pintura "a olhar": para cada triângulo lança raios para os dois lados e vê de que lado
# se chega ao exterior (sem bater no carro). Se o lado de trás é o que dá para fora, a face estava virada ao contrário
# (o three.js não a desenhava e parecia um buraco). Corre com o Blender em Python (pip install bpy):
#   python3 models/tools/bl-orient.py <entrada.glb sem compressão (NOCOMP=1 no prep)> <saída.glb> [Material=Paint] [raios=12]
import sys, random, math, bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src, out = sys.argv[1], sys.argv[2]
mat = sys.argv[3] if len(sys.argv) > 3 else 'Paint'
R = int(sys.argv[4]) if len(sys.argv) > 4 else 12
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
dg = bpy.context.evaluated_depsgraph_get()
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
# obstáculos: tudo menos vidros (vê-se através deles)
V, F = [], []
for o in meshes:
    names = [m.name if m else '' for m in o.data.materials]
    M = o.matrix_world; base = len(V)
    V += [M @ v.co for v in o.data.vertices]
    for p in o.data.polygons:
        if 'Glass' in (names[p.material_index] if p.material_index < len(names) else ''): continue
        vs = list(p.vertices)
        for i in range(1, len(vs) - 1): F.append((base + vs[0], base + vs[i], base + vs[i + 1]))
bvh = BVHTree.FromPolygons(V, F, all_triangles=True)
lo = Vector((min(v.x for v in V), min(v.y for v in V), min(v.z for v in V))); hi = Vector((max(v.x for v in V), max(v.y for v in V), max(v.z for v in V)))
L = (hi - lo).length; eps = L * 2e-5
random.seed(1)
def hemi(n):   # direções ao acaso no hemisfério de n
    out = []
    while len(out) < R:
        d = Vector((random.gauss(0, 1), random.gauss(0, 1), random.gauss(0, 1))).normalized()
        if d.dot(n) < .15: d = -d
        if d.dot(n) >= .15: out.append(d)
    return out
total = flipped = 0
for o in meshes:
    names = [m.name if m else '' for m in o.data.materials]
    pidx = {i for i, n in enumerate(names) if n == mat}
    if not pidx: continue
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    M = o.matrix_world; N3 = M.to_3x3()
    rev = []
    for f in bm.faces:
        if f.material_index not in pidx: continue
        total += 1
        c = M @ f.calc_center_median(); n = (N3 @ f.normal).normalized()
        if n.length < .5: continue
        def esc(nn):
            p = c + nn * eps; k = 0
            for d in hemi(nn):
                if bvh.ray_cast(p, d, L * 2)[0] is None: k += 1
            return k
        a, b = esc(n), esc(-n)
        if b > a + 1: rev.append(f)
    if rev: bmesh.ops.reverse_faces(bm, faces=rev); flipped += len(rev)
    bm.to_mesh(o.data); bm.free(); o.data.update()
print(f'faces de {mat}: {total}, viradas: {flipped}')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB')
