"""Capturas do Wall Connector "a carregar": pedestal ao lado do carro, pega na porta de carga e cabo esticado.

Não mexe no desenho do carregador (wallconnector.py continua a gerar a versão com o cabo enrolado):
importa esse .glb, esconde as voltas penduradas, leva a pega para a porta e desenha o cabo até lá.

Uso:  python models/tools/wallconnector_charging.py <wallconnector.glb> <carro.glb sem compressão> <pasta_de_saida>
(o carro do cartão vem comprimido com meshopt; descomprimir antes com @gltf-transform + meshoptimizer)
"""
import bpy, math, sys, os
from mathutils import Vector, Matrix

WC_GLB, CAR_GLB, OUT = (os.path.abspath(a) for a in sys.argv[1:4])
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def mat(name, hexcol, rough, spec=0.5):
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes.get('Principled BSDF')
    r, g, bl = (int(hexcol[i:i + 2], 16) for i in (1, 3, 5))
    b.inputs['Base Color'].default_value = (srgb(r), srgb(g), srgb(bl), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = spec
    return m

# ---------------------------------------------------------------- carro
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=CAR_GLB)
car = [o for o in bpy.data.objects if o not in before]
def bounds():
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in car if o.type == 'MESH' for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))
lo, hi = bounds()
# o modelo não vem em metros: pôr com 4,72 m de comprimento (Model 3), centrado, rodas no chão
k = 4.72 / (hi.x - lo.x)
carroot = bpy.data.objects.new('car', None); scn.collection.objects.link(carroot)
for o in car:
    if o.parent is None:
        o.parent = carroot
carroot.scale = (k, k, k)
carroot.location = (-(lo.x + hi.x) / 2 * k, -(lo.y + hi.y) / 2 * k, -lo.z * k)
car.append(carroot)
lo, hi = bounds()
size = hi - lo
print('carro', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))
# no cartão a frente é +X e a esquerda −Z (three) → no Blender a esquerda é +Y
# porta de carga: na parte do farolim de trás esquerdo que fica no lado do carro (o triângulo escuro com o
# refletor, à frente da esquina), não na esquina nem no farolim de trás (marcação do Diogo, 27/11/2026).
# Encontra-se pelas faces do material TailLight viradas para o lado (normal quase só para a esquerda),
# na metade de cima do farolim e à frente da esquina.
acc, nacc, area = Vector(), Vector(), 0.0
for o in car:
    if o.type != 'MESH':
        continue
    mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
    for mi, m in enumerate(o.data.materials):
        if not m or 'TailLight' not in m.name:
            continue
        for p in o.data.polygons:
            if p.material_index != mi:
                continue
            c = mw @ p.center; n = (nm @ p.normal).normalized()
            fx, fy, fz = (c.x - lo.x) / size.x, (c.y - lo.y) / size.y, (c.z - lo.z) / size.z
            if fy > 0.5 and fx < 0.2 and fz > 0.5 and n.y > 0.85 and fx > 0.075:
                a = p.area
                acc += c * a; nacc += n * a; area += a
port = acc / area
n_out = Vector((nacc.x, nacc.y, 0)).normalized()        # para fora da porta (esquerda e um pouco para trás)
deps = bpy.context.evaluated_depsgraph_get()
ok, loc, nor, idx, ob, _ = scn.ray_cast(deps, port + n_out * 0.5, -n_out)
if ok:
    port = loc + n_out * 0.002
print('porta de carga', tuple(round(v, 3) for v in port), 'frações', tuple(round((port[i] - lo[i]) / size[i], 3) for i in range(3)),
      'normal', tuple(round(v, 2) for v in n_out))

# ---------------------------------------------------------------- carregador
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=WC_GLB)
objs = {o.name: o for o in bpy.data.objects if o not in before}
root, wc, handle, coil = objs['wcPedestal'], objs['wallConnector'], objs['handle'], objs['coil']
coil.hide_render = coil.hide_viewport = True             # as voltas penduradas não se usam com o cabo ligado
# pedestal ao lado da traseira esquerda, virado para a frente e um pouco para o carro,
# para a câmara do cartão (3/4 pela frente-esquerda) ver a frente do carregador
PED = Vector((lo.x + 0.12, hi.y + 0.42, 0))
ang = math.radians(-28)                                   # direção para onde olha a frente do carregador
root.location = PED
root.rotation_mode = 'XYZ'
root.rotation_euler = (0, 0, ang + math.radians(90))   # o importador já passa de Y-up para Z-up; a frente volta a ser −Y
bpy.context.view_layer.update()
# confirmar a orientação: a frente do carregador tem de apontar para o carro
fwd = (wc.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()
print('frente do carregador', tuple(round(v, 2) for v in fwd))

# pega na porta: entra a direito (perpendicular à porta, quase na horizontal, como nas fotos da Tesla)
# e a cabeça da ficha (5 cm) fica toda dentro da porta; só se vê o corpo fino e o cabo, que depois cai
d = (n_out + Vector((0, 0, -0.06))).normalized()
handle.parent = None
q = (-d).to_track_quat('Z', 'Y')                         # o corpo da pega está no −Z local
handle.matrix_world = Matrix.Translation(port - d * 0.05) @ q.to_matrix().to_4x4()
bpy.context.view_layer.update()
cout = objs['cableOut'].matrix_world.translation.copy()
cin = objs['cableIn'].matrix_world.translation.copy()
print('cabo: carregador', tuple(round(v, 3) for v in cin), '→ pega', tuple(round(v, 3) for v in cout))

# ---------------------------------------------------------------- cabo esticado (cai ao chão e segue até à pega)
CR = 0.0105
FZ = CR + 0.001
mid = (cin + cout) / 2
side = Vector((-(cout - cin).y, (cout - cin).x, 0)).normalized()
path = [cin,
        cin + Vector((0, 0, -0.22)),
        Vector((cin.x, cin.y, 0.18)) + (cout - cin).normalized() * 0.05,
        Vector((cin.x, cin.y, FZ)) + (Vector((cout.x, cout.y, 0)) - Vector((cin.x, cin.y, 0))).normalized() * 0.22,
        Vector((mid.x, mid.y, FZ)) + side * 0.12,
        Vector((cout.x, cout.y, FZ)) + n_out * 0.30 + side * -0.05,
        Vector((cout.x, cout.y, 0.25)) + n_out * 0.17,
        cout + d * 0.12 + Vector((0, 0, -0.10)),
        cout + d * 0.06,
        cout]
cu = bpy.data.curves.new('cableLive', 'CURVE')
cu.dimensions = '3D'; cu.bevel_depth = CR; cu.bevel_resolution = 3; cu.resolution_u = 14
sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(path) - 1)
for bp, p in zip(sp.bezier_points, path):
    bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
cab = bpy.data.objects.new('cableLive', cu); scn.collection.objects.link(cab)
cab.data.materials.append(coil.data.materials[0])

# ---------------------------------------------------------------- capturas
scn.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
    for dv in prefs.devices:
        dv.use = True
    scn.cycles.device = 'GPU'
except Exception as e:
    print('GPU indisponível:', e)
scn.cycles.samples = 128; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1400, 900
scn.view_settings.view_transform = 'AgX'
world = bpy.data.worlds.new('w'); scn.world = world
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.16, 0.17, 0.18, 1); bg.inputs['Strength'].default_value = 0.8
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
ground = bpy.context.active_object; ground.data.materials.append(mat('floor', '#2a2d30', 0.6))
def light(name, kind, loc, rot, energy, size=1.0):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy
    if kind == 'AREA':
        ld.size = size
    if kind == 'SUN':
        ld.angle = math.radians(8)
    o = bpy.data.objects.new(name, ld); scn.collection.objects.link(o)
    o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
light('sun', 'SUN', (0, 0, 10), (40, 0, 150), 3.0)
light('soft', 'AREA', (0, 0, 6), (0, 0, 0), 900, 8)
def cam(name, loc, target, lens):
    cd = bpy.data.cameras.new(name); cd.lens = lens
    o = bpy.data.objects.new(name, cd); scn.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
def shot(fname, c):
    scn.camera = c
    scn.render.filepath = os.path.join(OUT, fname)
    bpy.ops.render.render(write_still=True)
    print('captura:', scn.render.filepath)

scn.render.resolution_x, scn.render.resolution_y = 1400, 820
def cardcam(name, dirv, target, dist):
    """Câmara como a do cartão (HOME em src/scene.js): fov vertical 28°. three (x, y, z) → Blender (x, −z, y)."""
    d = Vector((dirv[0], -dirv[2], dirv[1])).normalized()
    t = Vector((target[0], -target[2], target[1]))
    c = cam(name, t + d * dist, t, 50)
    c.data.sensor_fit = 'VERTICAL'; c.data.angle_y = math.radians(28)
    return c
# 1) a vista inicial do cartão
shot('charging_card.png', cardcam('c1', (0.72, 0.27, -0.64), (0, 0.62, 0), 9))
# 2) a mesma vista, mais perto da traseira
shot('charging_close.png', cardcam('c2', (0.72, 0.27, -0.64), (-1.8, 0.6, -1.2), 4.2))
# 3) de lado, pela esquerda
shot('charging_side.png', cardcam('c3', (0.0, 0.12, -1.0), (0, 0.62, 0), 10))
# 4) muito perto da porta de carga (para ver o encaixe da pega), de lado e de cima
pc = cam('c4', port + n_out * 0.75 + Vector((0.35, 0, 0.12)), port + n_out * 0.08 + Vector((0, 0, -0.04)), 50)
shot('charging_port.png', pc)
pt = cam('c5', port + Vector((0.05, 0.02, 0.9)) + n_out * 0.25, port + n_out * 0.1, 50)
shot('charging_port_top.png', pt)
