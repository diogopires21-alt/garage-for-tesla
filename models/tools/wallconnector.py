"""Wall Connector (3.ª geração) num pedestal, desenhado de raiz no Blender (sem modelos de terceiros).

Medidas do manual oficial da Tesla (Gen 3): 345 x 155 x 110 mm, cabo de 7,3 m.
Pedestal (loja da Tesla, peça 1508484): poste de alumínio cinzento, ~1,2 m x 152 x 51 mm.

Uso:  python models/tools/wallconnector.py <pasta_de_saida> [render]
Gera <pasta>/wallconnector.glb e, com "render", capturas de comparação em <pasta>/render_*.png.

Eixos no Blender: Z para cima, a frente do carregador virada para -Y (no glTF/three: +Z).
Peças com nome (para o cartão as encontrar): wallConnector, pedestal, wcFace, wcBack, led,
ledTop, ledBot, handle (pega, origem no bico), cableOut (fim do cabo da pega), cableIn (saída do
cabo por baixo do carregador), coil (cabo enrolado).
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
DO_RENDER = 'render' in sys.argv[2:]
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ---------------------------------------------------------------- materiais
def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def mat(name, hexcol, rough, metal=0.0, coat=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = m.node_tree.nodes.get('Principled BSDF')
    r, g, bl = (int(hexcol[i:i + 2], 16) for i in (1, 3, 5))
    col = (srgb(r), srgb(g), srgb(bl), 1)
    b.inputs['Base Color'].default_value = col
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.08
    if emit:
        b.inputs['Emission Color'].default_value = col
        b.inputs['Emission Strength'].default_value = emit
    m.diffuse_color = col
    return m

M_WHITE = mat('wcWhite', '#eceef0', 0.22, coat=0.6)
M_BACK = mat('wcGrey', '#3d4145', 0.55, 0.2)
M_LED = mat('wcLed', '#3ee07f', 0.4, emit=4.0)
M_CABLE = mat('cable', '#0e0f10', 0.5)
M_CABLE.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.25
M_PANEL = mat('pedestalPanel', '#5b6066', 0.45, 0.5)
M_HANDLE = mat('handle', '#131416', 0.42)
M_HANDLE.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.3
M_POST = mat('pedestal', '#4c5156', 0.5, 0.55)

# ---------------------------------------------------------------- utilitários
def new_obj(name, bm, material, parent=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth and p.use_smooth is not False
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o

def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.03
    scn.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o

def chaikin(pts, it):
    for _ in range(it):
        n = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            n.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            n.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        pts = n
    return pts

def resample(pts, n):
    L = [0.0]
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        L.append(L[-1] + math.dist(a, b))
    tot, out, j = L[-1], [], 0
    for k in range(n):
        t = tot * k / n
        while L[j + 1] < t:
            j += 1
        a, b = pts[j], pts[(j + 1) % len(pts)]
        f = (t - L[j]) / max(L[j + 1] - L[j], 1e-9)
        out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f))
    return out

# ---------------------------------------------------------------- contorno da frente (medido na foto da Tesla)
H, W = 0.345, 0.155
right = [(0, 0), (52, 0), (63, 10), (70, 60), (76, 120), (78, 181), (76, 240), (72, 300), (66, 333), (50, 345), (0, 348)]
poly = right + [(-x, z) for x, z in reversed(right[1:-1])]
poly = chaikin(poly, 3)
xs = [p[0] for p in poly]; zs = [p[1] for p in poly]
sx, sz = W / (max(xs) - min(xs)), H / (max(zs) - min(zs))
z0 = min(zs)
OUTLINE = resample([(x * sx, (z - z0) * sz) for x, z in poly], 120)
# começar no ponto de baixo, ao meio, e andar no sentido contrário ao dos ponteiros
CEN = (0.0, H * 0.5)

def half_width(z):
    best = 0
    for i in range(len(OUTLINE)):
        a, b = OUTLINE[i], OUTLINE[(i + 1) % len(OUTLINE)]
        if (a[1] - z) * (b[1] - z) <= 0 and a[1] != b[1]:
            x = a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])
            best = max(best, abs(x))
    return best

DB = 0.036                       # frente da caixa traseira (cinzenta)
def depth_front(z):              # profundidade total (frente da tampa branca), 98 mm em baixo a 110 mm em cima
    return 0.098 + 0.012 * max(0, min(1, z / H))

def pillow(name, rings, material, parent, yfun):
    """rings: lista de (escala, t). Cada anel = contorno escalado à volta do centro, y = yfun(z, t)."""
    bm = bmesh.new()
    loops = []
    for s, t in rings:
        ring = []
        for x, z in OUTLINE:
            px, pz = CEN[0] + (x - CEN[0]) * s, CEN[1] + (z - CEN[1]) * s
            ring.append(bm.verts.new((px, yfun(pz, t), pz)))
        loops.append(ring)
    n = len(OUTLINE)
    for a, b in zip(loops, loops[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    # fecho: atrás um polígono plano; à frente um leque para o centro
    back = bm.faces.new(list(reversed(loops[0])))
    back.smooth = False
    last_t = rings[-1][1] + 0.002
    c = bm.verts.new((CEN[0], yfun(CEN[1], last_t), CEN[1]))
    for i in range(n):
        f = bm.faces.new((loops[-1][i], loops[-1][(i + 1) % n], c))
        f.smooth = True
    for f in bm.faces:
        if f is not back:
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    o.data.materials.append(material)
    o.parent = parent
    return o

# ---------------------------------------------------------------- pedestal
PH = 1.20                        # altura do poste (sem o arco do topo)
PW, PD = 0.152, 0.051            # largura e espessura
ARCH = 0.012
root = empty('wcPedestal')
ped = empty('pedestal', parent=root)

def rounded_rect(w, d, r, seg=6):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, d - r, 0), (-w / 2 + r, d - r, 90), (-w / 2 + r, r, 180), (w / 2 - r, r, 270)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def prism(name, prof, zb, ztop_fun, material, parent, ztop_center):
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, zb)) for x, y in prof]
    top = [bm.verts.new((x, y, ztop_fun(x))) for x, y in prof]
    n = len(prof)
    for i in range(n):
        f = bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]))
        f.smooth = True
    fb = bm.faces.new(list(reversed(bot))); fb.smooth = False
    cx = sum(p[0] for p in prof) / n; cy = sum(p[1] for p in prof) / n
    c = bm.verts.new((cx, cy, ztop_center))
    for i in range(n):
        f = bm.faces.new((top[i], top[(i + 1) % n], c)); f.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    o.data.materials.append(material)
    o.parent = parent
    # arestas verticais suaves, topo e base com arestas vivas
    return o

PLATE_T = 0.012
post = prism('pedestalPost', rounded_rect(PW, PD, 0.004), PLATE_T,
             lambda x: PH + ARCH * (1 - (x / (PW / 2)) ** 2), M_POST, ped, PH + ARCH)
plate_prof = [(x, y - 0.02) for x, y in rounded_rect(0.21, PD + 0.04, 0.006)]
plate = prism('pedestalPlate', plate_prof, 0.0, lambda x: PLATE_T, M_POST, ped, PLATE_T)
# tampa de trás (arco em cima e em baixo, como na foto)
def panel_prof():
    w, zt, zbt, n = 0.128, PH - 0.012, PH - 0.52, 16
    pts = []
    for k in range(n + 1):
        x = -w / 2 + w * k / n
        pts.append((x, zbt - 0.012 * (1 - (2 * x / w) ** 2)))
    for k in range(n + 1):
        x = w / 2 - w * k / n
        pts.append((x, zt + 0.008 * (1 - (2 * x / w) ** 2)))
    return pts
bm = bmesh.new()
pp = panel_prof()
f1 = [bm.verts.new((x, PD, z)) for x, z in pp]
f2 = [bm.verts.new((x, PD + 0.004, z)) for x, z in pp]
n = len(pp)
for i in range(n):
    bm.faces.new((f1[i], f1[(i + 1) % n], f2[(i + 1) % n], f2[i]))
bm.faces.new(f2)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
panel = new_obj('pedestalPanel', bm, M_PANEL, ped, smooth=False)
# dois parafusos na tampa
for zs_ in (PH - 0.17, PH - 0.36):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.004, radius2=0.004, depth=0.002)
    for v in bm.verts:
        v.co = Vector((v.co.x, v.co.z + PD + 0.005, v.co.y + zs_))
    new_obj('pedestalScrew', bm, M_BACK, ped, smooth=False)

# ---------------------------------------------------------------- Wall Connector
WCZ = PH + ARCH + 0.008 - H      # o topo do carregador fica um pouco acima do poste
wc = empty('wallConnector', (0, 0, WCZ), parent=root)

# caixa traseira cinzenta (um pouco mais pequena que a tampa)
back = pillow('wcBack', [(0.955, 0.0), (0.965, 0.5), (0.965, 1.0), (0.94, 1.02), (0.6, 1.03)], M_BACK, wc,
              lambda z, t: -DB * min(t, 1.0) - 0.001 * max(0, t - 1))
# tampa branca: lado direito e aresta da frente bem arredondada, frente ligeiramente abaulada
RINGS = [(1.0, 0.0), (1.0, 0.55), (0.996, 0.80), (0.985, 0.92), (0.965, 0.975), (0.935, 1.0),
         (0.86, 1.02), (0.72, 1.035), (0.52, 1.045), (0.32, 1.05), (0.14, 1.052)]
face = pillow('wcFace', RINGS, M_WHITE, wc,
              lambda z, t: -(DB + (depth_front(z) - DB) * t))

bpy.context.view_layer.update()

def front_y(x, z):
    """y da superfície da frente (raio a partir da frente)."""
    mw = face.matrix_world
    inv = mw.inverted()
    o = inv @ (mw.translation + Vector((x, -1.0, z)))
    d = (inv.to_3x3() @ Vector((0, 1, 0))).normalized()
    ok, loc, nor, idx = face.ray_cast(o, d)
    return loc.y if ok else -depth_front(z)

# barra de luz (entre 68 e 131 mm a partir de baixo, como na foto)
LZ0, LZ1 = 0.068, 0.131
bm = bmesh.new()
segs = 10
for k in range(segs + 1):
    pass
res = bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.0016, radius2=0.0016, depth=LZ1 - LZ0)
for v in bm.verts:
    v.co.y *= 0.45
yl = front_y(0, (LZ0 + LZ1) / 2) - 0.0002
for v in bm.verts:
    v.co.z += (LZ0 + LZ1) / 2
    v.co.y += yl
led = new_obj('led', bm, M_LED, wc)
empty('ledTop', (0, yl, LZ1), parent=wc)
empty('ledBot', (0, yl, LZ0), parent=wc)

# lettering "TESLA" no alto da tampa (Diogo, 27/11/2026): medido na foto da loja: 89 mm de largura, letras com ~8,5 mm,
# a 62 mm do topo, cinzento-escuro
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lettering
M_LOGO = mat('wcLogo', '#4b4f53', 0.5)
LH = 0.0085
bm = lettering.build(bmesh.new(), 'TESLA', 0.0, H - 0.062 - LH / 2, LH, 0.0102, 0.0094, front_y)
new_obj('wcLogo', bm, M_LOGO, wc, smooth=False)

# pega (ficha Type 2 da Tesla), encaixada no lado direito, inclinada para baixo
# a cabeça da pega fica escondida dentro do encaixe; só se vê a parte de trás (~13 cm, ~3 cm de grossura),
# a sair do lado direito a ~17 cm de baixo, inclinada ~28° (medido na foto da loja)
HZ, HANG = 0.235, 28
hx = half_width(HZ) - 0.035
handle = empty('handle', (hx, -0.062, HZ), parent=wc)
handle.rotation_euler = (math.radians(-5), math.radians(-HANG), 0)
prof = [(0.0, 0.0), (0.0, 0.020), (0.004, 0.022), (0.05, 0.022), (0.07, 0.0165), (0.15, 0.0145),
        (0.165, 0.0135), (0.175, 0.0138), (0.19, 0.0125), (0.205, 0.0112), (0.21, 0.0)]
bm = bmesh.new()
SEG = 24
rings = []
for s, r in prof:
    ring = []
    for k in range(SEG):
        a = 2 * math.pi * k / SEG
        ring.append(bm.verts.new((r * math.cos(a) * 0.86, r * math.sin(a), -s)))
    rings.append(ring)
for a, b in zip(rings, rings[1:]):
    for k in range(SEG):
        bm.faces.new((a[k], a[(k + 1) % SEG], b[(k + 1) % SEG], b[k]))
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
hmesh = new_obj('handleBody', bm, M_HANDLE, handle)
cout = empty('cableOut', (0, 0, -0.21), parent=handle)
cin = empty('cableIn', (0, -0.05, 0.004), parent=wc)

# cabo enrolado: 3 voltas penduradas por cima do carregador
CR = 0.0105
def cable(name, pts, cyclic=False):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = CR
    cu.bevel_resolution = 3
    cu.resolution_u = 10
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    sp.use_cyclic_u = cyclic
    o = bpy.data.objects.new(name, cu)
    scn.collection.objects.link(o)
    o.parent = wc
    return o

def loop(s, dy, dx, lean):
    """Uma volta do cabo: apoiada no topo do carregador, larga em baixo (forma de ovo, como nas fotos)."""
    yt = -0.06 + dy * 0.9
    return [(-0.045 + dx, yt, H + CR + 0.001), (0.045 + dx, yt, H + CR + 0.001), (0.12, -0.065 + dy, H - 0.04),
            (0.25 * s + lean, -0.07 + dy, H - 0.24), (0.30 * s + lean, -0.07 + dy, H - 0.50 * s),
            (0.22 * s + lean, -0.06 + dy, H - 0.82 * s), (0.03 + lean, -0.055 + dy, H - 0.97 * s),
            (-0.18 * s, -0.055 + dy, H - 0.86 * s), (-0.29 * s, -0.06 + dy, H - 0.52 * s),
            (-0.23 * s, -0.065 + dy, H - 0.20), (-0.105, -0.065 + dy, H - 0.025)]

parts = [cable('loop1', loop(1.0, 0.0, 0.0, 0.0), True), cable('loop2', loop(0.9, -0.022, 0.004, 0.035), True),
         cable('loop3', loop(1.1, 0.02, -0.004, -0.02), True),
         # o cabo que sai por baixo desce e junta-se à volta de baixo (a ponta fica escondida ao longo da volta)
         cable('cableBottom', [(0, -0.05, 0.004), (0.0, -0.052, -0.10), (0.012, -0.054, -0.38), (0.09, -0.058, -0.585),
                               (0.20, -0.062, -0.50), (0.255, -0.066, -0.30)])]
bpy.context.view_layer.update()
cw = wc.matrix_world.inverted() @ cout.matrix_world.translation
parts.append(cable('cableHandle', [tuple(cw), (cw.x + 0.026, cw.y - 0.003, cw.z - 0.05), (cw.x + 0.06, -0.076, cw.z - 0.16),
                                   (0.25, -0.076, -0.30), (0.26, -0.074, -0.42), (0.15, -0.066, -0.58)]))
# converter para malha e juntar tudo numa peça "coil"
meshes = []
for o in parts:
    bpy.context.view_layer.objects.active = o
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.data.materials.clear(); o.data.materials.append(M_CABLE)
    for p in o.data.polygons:
        p.use_smooth = True
    meshes.append(o)
for ob in bpy.context.selected_objects:
    ob.select_set(False)
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
coil = bpy.context.view_layer.objects.active
coil.name = 'coil'; coil.data.name = 'coil'

# ---------------------------------------------------------------- exportar
tris = sum(len(p.vertices) - 2 for o in scn.objects if o.type == 'MESH' for p in o.data.polygons)
print('triângulos:', tris)
glb = os.path.join(OUT, 'wallconnector.glb')
for ob in scn.objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False, export_apply=True,
                          export_yup=True, export_extras=False, export_cameras=False, export_lights=False)
print('glb:', glb, os.path.getsize(glb), 'bytes')

# ---------------------------------------------------------------- capturas para comparar com as fotos
if DO_RENDER:
    scn.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scn.cycles.device = 'GPU'
    except Exception as e:
        print('GPU indisponível, a usar o processador:', e)
    scn.cycles.samples = 96
    scn.cycles.use_denoising = True
    scn.render.resolution_x = scn.render.resolution_y = 1000
    scn.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('w'); scn.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    bgn = world.node_tree.nodes['Background']

    def light(name, kind, loc, rot, energy, size=1.0):
        ld = bpy.data.lights.new(name, kind); ld.energy = energy
        if kind == 'AREA':
            ld.size = size
        o = bpy.data.objects.new(name, ld); scn.collection.objects.link(o)
        o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
        return o

    def cam(name, loc, target, lens):
        cd = bpy.data.cameras.new(name); cd.lens = lens
        o = bpy.data.objects.new(name, cd); scn.collection.objects.link(o)
        o.location = loc
        d = Vector(target) - Vector(loc)
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        return o

    def plane(name, size, loc, rot, color):
        bpy.ops.mesh.primitive_plane_add(size=size, location=loc, rotation=[math.radians(a) for a in rot])
        o = bpy.context.active_object; o.name = name
        o.data.materials.append(mat(name + 'M', color, 0.9))
        return o

    def shot(fname, camo):
        scn.camera = camo
        scn.render.filepath = os.path.join(OUT, fname)
        bpy.ops.render.render(write_still=True)
        print('captura:', scn.render.filepath)

    # 1) só o carregador numa parede branca, de frente (como a foto da loja)
    for o in ped.children_recursive + [ped]:
        o.hide_render = True
    wall = plane('wall', 6, (0, 0.0005, WCZ), (90, 0, 0), '#f4f4f4')
    bgn.inputs['Color'].default_value = (0.9, 0.9, 0.9, 1); bgn.inputs['Strength'].default_value = 0.6
    l1 = light('key', 'AREA', (-0.8, -1.6, WCZ + 1.2), (55, 0, -25), 120, 1.5)
    l2 = light('fill', 'AREA', (1.0, -1.4, WCZ + 0.2), (80, 0, 35), 40, 1.5)
    c1 = cam('camFront', (0.0, -2.6, WCZ + 0.05), (0.03, 0, WCZ - 0.12), 50)
    shot('render_front.png', c1)
    c1b = cam('camFrontClose', (0.0, -1.05, WCZ + 0.17), (0.02, 0, WCZ + 0.15), 50)
    shot('render_front_close.png', c1b)
    # 2) no pedestal, 3/4 pela frente, com chão
    for o in ped.children_recursive + [ped]:
        o.hide_render = False
    wall.hide_render = True
    ground = plane('ground', 20, (0, 0, 0), (0, 0, 0), '#bdbbb6')
    bgn.inputs['Color'].default_value = (0.75, 0.78, 0.8, 1); bgn.inputs['Strength'].default_value = 0.9
    c2 = cam('cam34', (-1.9, -2.4, 1.15), (0.0, 0.0, 0.75), 45)
    shot('render_pedestal_34.png', c2)
    # 3) por trás, de perto (como a foto da tampa de trás)
    c3 = cam('camBack', (0.75, 1.05, 1.25), (0.0, 0.0, 1.0), 50)
    l3 = light('back', 'AREA', (1.2, 1.6, 2.0), (-50, 0, 145), 150, 2)
    shot('render_pedestal_back.png', c3)
