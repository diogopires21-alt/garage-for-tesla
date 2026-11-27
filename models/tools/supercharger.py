"""Supercharger V4 (posto), desenhado de raiz no Blender (sem modelos de terceiros).

Medidas da ficha técnica da Tesla ("V4 Supercharger Post Technical Specifications"): 1946 mm de altura,
corpo com 680 mm de largura e ~310 mm de fundo (forma de lente vista de cima), cabo de 3 m que sai no topo
de um lado (a 1891 mm) e faz um U por baixo; a pega encaixa no lado oposto (a 1126 mm).

Uso:  python models/tools/supercharger.py <pasta_de_saida> [render]
Gera <pasta>/supercharger.glb e, com "render", capturas para comparar com o desenho e as fotos.

Eixos no Blender: Z para cima, a frente virada para −Y (no glTF/three: +Z).
Peças com nome: supercharger (raiz), scBody (corpo escuro), scPanel e scPanelBack (painéis brancos em U),
scCable (cabo pendurado em U), scHandle (pega, origem no bico; o corpo para −Z local, no glTF −Y), scHandleBody.
O cabo sai do lado +X (scExit, só no script); a pega encaixa no lado −X.
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
DO_RENDER = 'render' in sys.argv[2:]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def mat(name, hexcol, rough, metal=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes.get('Principled BSDF')
    r, g, bl = (int(hexcol[i:i + 2], 16) for i in (1, 3, 5))
    col = (srgb(r), srgb(g), srgb(bl), 1)
    b.inputs['Base Color'].default_value = col
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.1
    m.diffuse_color = col
    return m

M_WHITE = mat('scWhite', '#eef0f1', 0.3, coat=0.4)
M_BLACK = mat('scBlack', '#1a1c1e', 0.45, 0.2)
M_CABLE = mat('scCable', '#0e0f10', 0.5, spec=0.25)
M_HANDLE = mat('scHandle', '#131416', 0.42, spec=0.3)

def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None)
    scn.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o

def to_obj(name, bm, mats, parent):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    for m in mats:
        o.data.materials.append(m)
    o.parent = parent
    return o

# ---------------------------------------------------------------- medidas
H = 1.946            # altura total
A = 0.34             # meia largura do corpo
B = 0.155            # meio fundo ao centro (lente)
C = 0.068            # meio fundo nas pontas (faixa preta dos lados)
RT = 0.075           # raio dos cantos de cima (vista de frente)
RB = A               # fundo em U: semicírculo com o raio da meia largura
ZU = 0.145           # ponto mais baixo do U branco (143 mm no desenho)
ZC = ZU + RB         # centro do semicírculo de baixo

def half_w(z):
    """meia largura do corpo escuro à altura z (vista de frente): igual até ao chão, cantos de cima redondos."""
    if z > H - RT:
        d = z - (H - RT)
        return A - RT + math.sqrt(max(RT * RT - d * d, 0))
    return A

def lens(w, n):
    """contorno da secção (vista de cima) com meia largura w: frente (y<0) e trás curvas, pontas arredondadas."""
    k = w / A
    b, c = B * (0.55 + 0.45 * k), C * k
    pts = []
    for i in range(n + 1):        # frente, da esquerda para a direita
        t = -1 + 2 * i / n
        x = t * w
        pts.append((x, -(c + (b - c) * math.sqrt(max(1 - t * t, 0)) ** 1.15)))
    for i in range(1, n):         # trás, da direita para a esquerda
        t = 1 - 2 * i / n
        x = t * w
        pts.append((x, (c + (b - c) * math.sqrt(max(1 - t * t, 0)) ** 1.15)))
    return pts

root = empty('supercharger')

def ring_rows(zs, wfun, yoff=0.0):
    return [[(x, y + (yoff if y < 0 else -yoff), z) for x, y in lens(max(wfun(z), 0.02), N)] for z in zs]

def loft(name, rows, mats, matfun=None, cap_bottom=True):
    bm = bmesh.new()
    rings = [[bm.verts.new(p) for p in r] for r in rows]
    nr = len(rings[0])
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(nr):
            f = bm.faces.new((r0[i], r0[(i + 1) % nr], r1[(i + 1) % nr], r1[i])); f.smooth = True
    for ring, top in ((rings[0], False), (rings[-1], True)):
        if not top and not cap_bottom:
            continue
        cz = ring[0].co.z
        c = bm.verts.new((0, 0, cz + (0.003 if top else 0)))
        for i in range(nr):
            f = bm.faces.new((ring[i], ring[(i + 1) % nr], c) if top else (ring[(i + 1) % nr], ring[i], c)); f.smooth = top
    if matfun:
        for f in bm.faces:
            f.material_index = matfun(f)
    return to_obj(name, bm, mats, root)

N = 40
# ---------------------------------------------------------------- corpo escuro: lente do chão ao topo, cantos de cima redondos
zb = [0.0, 0.02] + [0.1 + (H - RT - 0.1) * i / 12 for i in range(13)] + [H - RT + RT * math.sin(math.radians(a)) for a in range(10, 90, 10)] + [H]
zb = sorted(set(round(z, 5) for z in zb))
body = loft('scBody', ring_rows(zb, half_w), [M_BLACK])

# ---------------------------------------------------------------- painéis brancos (frente e trás): U com o fundo redondo,
# um pouco mais estreitos que o corpo (fica a faixa preta dos lados), colados à lente e 6 mm saídos
IN = 0.05
RU = A - IN
ZCU = ZU + RU
def panel_w(z):
    if z > H - RT:
        d = z - (H - RT); return A - RT - IN + math.sqrt(max(RT * RT - d * d, 0)) * (RT - IN) / RT + IN * 0
    if z < ZCU:
        d = ZCU - z; return math.sqrt(max(RU * RU - d * d, 0))
    return RU
def lens_y(x):        # frente do corpo (y<0) a esta distância do centro
    t = max(min(x / A, 1), -1)
    return C + (B - C) * math.sqrt(max(1 - t * t, 0)) ** 1.15
def panel(name, sgn):
    zs = [ZU + 0.001] + [ZCU - RU * math.cos(math.radians(a)) for a in range(6, 90, 6)] + [ZCU + (H - RT - ZCU) * i / 10 for i in range(11)] + \
         [H - RT + (RT - 0.004) * math.sin(math.radians(a)) for a in range(10, 90, 10)] + [H - 0.004]
    zs = sorted(set(round(z, 5) for z in zs if ZU < z < H))
    NX = 30
    bm = bmesh.new(); front, back = [], []
    for z in zs:
        w = max(panel_w(z), 0.01)
        fr, bk = [], []
        for i in range(NX + 1):
            x = -w + 2 * w * i / NX
            y = lens_y(x)
            fr.append(bm.verts.new((x, sgn * (y + 0.006), z)))
            bk.append(bm.verts.new((x, sgn * (y - 0.004), z)))
        front.append(fr); back.append(bk)
    for rows in (front, back):
        for r0, r1 in zip(rows, rows[1:]):
            for i in range(NX):
                f = bm.faces.new((r0[i], r0[i + 1], r1[i + 1], r1[i])); f.smooth = True
    # borda (liga frente e trás à volta)
    loop_f = [r[0] for r in front] + front[-1][1:] + [r[-1] for r in reversed(front)][1:] + list(reversed(front[0]))[1:-1]
    loop_b = [r[0] for r in back] + back[-1][1:] + [r[-1] for r in reversed(back)][1:] + list(reversed(back[0]))[1:-1]
    for i in range(len(loop_f)):
        j = (i + 1) % len(loop_f)
        try:
            bm.faces.new((loop_f[i], loop_f[j], loop_b[j], loop_b[i]))
        except ValueError:
            pass
    return to_obj(name, bm, [M_WHITE], root)
pfront = panel('scPanel', -1)
pback = panel('scPanelBack', 1)
bpy.context.view_layer.update()

# lettering "TESLA" no alto da frente branca (Diogo, 27/11/2026): medido no desenho da Tesla: ~34 cm de largura,
# letras com ~39 mm, a ~31 cm do topo, escuro. Centrado em x=0 (o cartão desfaz o espelho do posto nele)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lettering
M_LOGO = mat('scLogo', '#2b2e31', 0.45)
def panel_y(x, z):
    ok, loc, nor, idx = pfront.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
    return loc.y if ok else -B
LH = 0.039
bm = lettering.build(bmesh.new(), 'TESLA', 0.0, H - 0.31 - LH / 2, LH, 0.046, 0.027, panel_y, out=0.0012, seg=6, stroke=0.24)
me = bpy.data.meshes.new('scLogo'); bm.to_mesh(me); bm.free()   # sem recalcular normais: as letras já ficam viradas para a frente
logo = bpy.data.objects.new('scLogo', me); scn.collection.objects.link(logo); logo.data.materials.append(M_LOGO); logo.parent = root

# pega (CCS2, maior que a do Wall Connector), encaixada no lado −X, a 1126 mm, inclinada para baixo
HZ = 1.126
handle = empty('scHandle', (-half_w(HZ) - 0.01, 0.0, HZ + 0.09), parent=root)
handle.rotation_euler = (0, math.radians(24), 0)
prof = [(0.0, 0.0), (0.0, 0.03), (0.005, 0.033), (0.06, 0.033), (0.085, 0.026), (0.16, 0.022), (0.19, 0.0205),
        (0.205, 0.018), (0.25, 0.016), (0.268, 0.0155), (0.27, 0.0)]
bm = bmesh.new(); SEG = 24; rr = []
for s, r in prof:
    rr.append([bm.verts.new((r * math.cos(2 * math.pi * k / SEG) * 0.85, r * math.sin(2 * math.pi * k / SEG), -s)) for k in range(SEG)])
for a, b in zip(rr, rr[1:]):
    for k in range(SEG):
        bm.faces.new((a[k], a[(k + 1) % SEG], b[(k + 1) % SEG], b[k]))
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
for f in bm.faces:
    f.smooth = True
hbody = to_obj('scHandleBody', bm, [M_HANDLE], handle)
cout = empty('scCableOut', (0, 0, -0.27), parent=handle)

# cabo pendurado (3 m, ~3,6 cm): sai no topo do lado +X, desce por fora, faz o U por baixo e sobe à pega no lado −X
CR = 0.018
bpy.context.view_layer.update()
co = root.matrix_world.inverted() @ cout.matrix_world.translation
EX = (half_w(1.891) + 0.02, 0.0, 1.891)
path = [EX, (A + 0.07, -0.01, 1.80), (A + 0.11, -0.02, 1.45), (A + 0.10, -0.03, 0.95), (A - 0.01, -0.14, 0.36),
        (0.05, -0.20, 0.10), (-A + 0.05, -0.15, 0.30), (-A - 0.07, -0.04, 0.70), (co.x - 0.03, co.y - 0.02, co.z - 0.22), tuple(co)]
cu = bpy.data.curves.new('scCable', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = CR; cu.bevel_resolution = 3; cu.resolution_u = 10
sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(path) - 1)
for bp, p in zip(sp.bezier_points, path):
    bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
cable = bpy.data.objects.new('scCable', cu); scn.collection.objects.link(cable); cable.parent = root
cable.data.materials.append(M_CABLE)
# saída do cabo: pequena peça preta no topo do lado +X
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co = Vector((v.co.x * 0.05 + half_w(1.9) + 0.005, v.co.y * 0.07, v.co.z * 0.12 + 1.86))
exitp = to_obj('scExit', bm, [M_BLACK], root)

# converter curvas em malha (para o glTF)
for o in (cable,):
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    for p in o.data.polygons:
        p.use_smooth = True

tris = sum(len(p.vertices) - 2 for o in scn.objects if o.type == 'MESH' for p in o.data.polygons)
print('triangulos:', tris)
glb = os.path.join(OUT, 'supercharger.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False, export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False)
print('glb:', glb, os.path.getsize(glb))

if DO_RENDER:
    scn.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scn.cycles.device = 'GPU'
    except Exception as e:
        print('GPU:', e)
    scn.cycles.samples = 96; scn.cycles.use_denoising = True
    scn.render.resolution_x = scn.render.resolution_y = 1000
    scn.view_settings.view_transform = 'AgX'
    world = bpy.data.worlds.new('w'); scn.world = world
    bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.75, 0.78, 0.8, 1); bg.inputs['Strength'].default_value = 0.9
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
    bpy.context.active_object.data.materials.append(mat('floor', '#5d6064', 0.8))
    def light(name, loc, rot, energy, size):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size
        o = bpy.data.objects.new(name, ld); scn.collection.objects.link(o)
        o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    light('key', (-2.0, -3.0, 3.5), (50, 0, -30), 600, 3)
    light('fill', (2.5, -2.0, 1.5), (75, 0, 50), 200, 3)
    def cam(name, loc, target, lens_mm):
        cd = bpy.data.cameras.new(name); cd.lens = lens_mm
        o = bpy.data.objects.new(name, cd); scn.collection.objects.link(o)
        o.location = loc; o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        return o
    def shot(fname, c):
        scn.camera = c; scn.render.filepath = os.path.join(OUT, fname)
        bpy.ops.render.render(write_still=True); print('captura:', scn.render.filepath)
    shot('sc_front.png', cam('cf', (0, -5.2, 1.0), (0, 0, 0.98), 50))
    shot('sc_34.png', cam('c34', (2.6, -3.6, 1.3), (0, 0, 0.95), 45))
    shot('sc_side.png', cam('cs', (-5.2, -0.2, 1.0), (0, 0, 0.98), 50))
    shot('sc_top.png', cam('ct', (0, -0.001, 5.5), (0, 0, 1.0), 50))
