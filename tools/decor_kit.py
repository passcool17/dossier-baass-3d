# Blender 5.x headless:  blender -b --python decor_kit.py -- OUT.raw.glb PREVIEW_DIR
# Low-poly desert / hangar / wreck / lab décor kit for Dossier BAASS 3D (our own work, CC0).
# Every kit = one mesh "kit_<name>", origin at its base centre, front -Y, Z up, 1 unit = 1 m,
# flat shading, colours in a linear FLOAT_COLOR corner attribute (glTF COLOR_0), ONE material.
import bpy, bmesh, math, random, sys, os, json, time
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:]
OUT, PREV = argv[0], argv[1]
os.makedirs(PREV, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
R = random.Random(20261118)

def hexc(h): return Vector(((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255))
def lin(c): return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
def jit(c, a=0.06):
    k = 1 + R.uniform(-a, a); return Vector([min(1, max(0, x * k)) for x in c])

MAT = bpy.data.materials.new('decor-vc'); MAT.use_nodes = True
nt = MAT.node_tree; bsdf = nt.nodes['Principled BSDF']
ca_node = nt.nodes.new('ShaderNodeVertexColor'); ca_node.layer_name = 'Col'
nt.links.new(ca_node.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.9; bsdf.inputs['Metallic'].default_value = 0.0
MAT.use_backface_culling = False

def obj_from_bm(bm, colfn, name='part'):
    bm.normal_update()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for p in me.polygons:
        c = colfn(p)
        l = lin(c)
        for li in p.loop_indices: attr.data[li].color = (l[0], l[1], l[2], 1.0)
        p.use_smooth = False
    me.materials.append(MAT)
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    return ob

def solid(c, a=0.05): return lambda p: jit(c, a)
def grad(c, z0, z1, dark=0.6, a=0.05):
    def f(p):
        t = min(1, max(0, (p.center.z - z0) / max(1e-6, z1 - z0)))
        return jit(c * (dark + (1 - dark) * t), a)
    return f

# --- primitives (each returns a fresh bmesh, already transformed) ---
def bm_cyl(r1, r2, h, seg, M=Matrix()):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts); bmesh.ops.transform(bm, matrix=M, verts=bm.verts); return bm
def bm_ico(r, sub=1, M=Matrix(), jitter=0.0):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    if jitter:
        for v in bm.verts: v.co *= 1 + R.uniform(-jitter, jitter)
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts); return bm
def bm_box(sx, sy, sz, M=Matrix(), base=True):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if base: bmesh.ops.translate(bm, vec=(0, 0, sz / 2), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts); return bm
def bm_torus(Rr, r, nu, nv, M=Matrix()):
    bm = bmesh.new(); vs = []
    for u in range(nu):
        a = u * 2 * math.pi / nu; row = []
        for v in range(nv):
            b = v * 2 * math.pi / nv
            row.append(bm.verts.new(((Rr + r * math.cos(b)) * math.cos(a), (Rr + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        vs.append(row)
    for u in range(nu):
        for v in range(nv):
            bm.faces.new((vs[u][v], vs[(u + 1) % nu][v], vs[(u + 1) % nu][(v + 1) % nv], vs[u][(v + 1) % nv]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts); return bm
def T(x=0, y=0, z=0): return Matrix.Translation((x, y, z))
def Rz(d): return Matrix.Rotation(math.radians(d), 4, 'Z')
def Rx(d): return Matrix.Rotation(math.radians(d), 4, 'X')
def Ry(d): return Matrix.Rotation(math.radians(d), 4, 'Y')
def S(x, y=None, z=None): return Matrix.Diagonal((x, y if y is not None else x, z if z is not None else x, 1))
def along(a, b):
    """matrix mapping the unit +Z segment (0..1) onto a->b"""
    a, b = Vector(a), Vector(b); d = b - a
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return T(*a) @ q.to_matrix().to_4x4(), d.length
def rod(a, b, r1, r2, seg, col):
    M, L = along(a, b); return obj_from_bm(bm_cyl(r1, r2, L, seg, M), col)
def beam(a, b, w, col, d=None):
    M, L = along(a, b); return obj_from_bm(bm_box(w, d or w, L, M), col)

KITS = {}
def kit(name, parts, collide=0.0, note=''):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active; ob.name = 'kit_' + name; ob.data.name = 'kit_' + name
    me = ob.data; me.calc_loop_triangles()
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    KITS[name] = dict(obj=ob, tris=len(me.loop_triangles), collide=collide, note=note,
                      size=[round(max(v[i] for v in bb) - min(v[i] for v in bb), 2) for i in range(3)])
    return ob

GREEN = hexc(0x4e7a3c); GREEN2 = hexc(0x5f8a44)
# 1 saguaro
def ribbed(c):
    return lambda p: jit(c * (0.82 if p.index % 2 else 1.0) * (0.65 if p.center.z < 0.35 else 1.0), 0.03)
P = [rod((0, 0, 0), (0, 0, 3.1), 0.24, 0.2, 8, ribbed(GREEN)),
     obj_from_bm(bm_ico(0.2, 1, T(0, 0, 3.1) @ S(1, 1, 0.8)), solid(GREEN2)),
     rod((0, 0, 1.25), (0.55, 0, 1.3), 0.14, 0.14, 8, ribbed(GREEN)),
     rod((0.55, 0, 1.22), (0.58, 0, 2.15), 0.15, 0.13, 8, ribbed(GREEN)),
     obj_from_bm(bm_ico(0.13, 1, T(0.58, 0, 2.15) @ S(1, 1, 0.8)), solid(GREEN2)),
     rod((0, 0, 1.75), (-0.46, 0.08, 1.8), 0.13, 0.13, 8, ribbed(GREEN)),
     rod((-0.46, 0.08, 1.72), (-0.5, 0.08, 2.55), 0.13, 0.11, 8, ribbed(GREEN)),
     obj_from_bm(bm_ico(0.11, 1, T(-0.5, 0.08, 2.55) @ S(1, 1, 0.8)), solid(GREEN2))]
kit('saguaro', P, collide=0.35, note='3.3 m cactus')
# 2 barrel cacti cluster
P = []
for (x, y, s) in ((0, 0, 1.0), (0.45, 0.2, 0.7), (-0.3, 0.35, 0.55)):
    P.append(obj_from_bm(bm_cyl(0.3 * s, 0.27 * s, 0.42 * s, 12, T(x, y, 0)), ribbed(hexc(0x5b8040))))
    P.append(obj_from_bm(bm_ico(0.27 * s, 1, T(x, y, 0.42 * s) @ S(1, 1, 0.55)), solid(hexc(0x6a9048))))
    P.append(obj_from_bm(bm_cyl(0.05 * s, 0.02, 0.09 * s, 5, T(x, y, 0.55 * s)), solid(hexc(0xd04a78))))
kit('barrel-cactus', P, note='small, walk-through')
# 3 prickly pear
P = [obj_from_bm(bm_ico(1, 1, T(0, 0, 0.32) @ S(0.26, 0.07, 0.33)), solid(hexc(0x6f9440))),
     obj_from_bm(bm_ico(1, 1, T(0.2, 0, 0.75) @ Ry(30) @ S(0.22, 0.06, 0.28)), solid(hexc(0x7a9e48))),
     obj_from_bm(bm_ico(1, 1, T(-0.18, 0.02, 0.72) @ Ry(-35) @ S(0.2, 0.06, 0.26)), solid(hexc(0x6a8e3c))),
     obj_from_bm(bm_ico(1, 1, T(0.05, 0.12, 0.35) @ Rz(70) @ S(0.22, 0.06, 0.27)), solid(hexc(0x759a44)))]
for (x, z) in ((0.28, 1.0), (-0.32, 0.95), (0.05, 0.66)):
    P.append(obj_from_bm(bm_ico(0.045, 1, T(x, 0, z)), solid(hexc(0xb03050))))
kit('prickly-pear', P, note='walk-through')
# 4 sage bush
P = []
for i in range(4):
    a = i * 1.7; r = R.uniform(0.28, 0.42)
    P.append(obj_from_bm(bm_ico(r, 1, T(math.cos(a) * 0.25, math.sin(a) * 0.25, r * 0.55) @ S(1, 1, 0.7), jitter=0.18),
                         lambda p: jit(hexc(R.choice((0x7f8c64, 0x8f9a70, 0x6e7a56))), 0.04)))
kit('sage', P, note='walk-through')
# 5 grass tuft (double-sided blades)
bm = bmesh.new()
for i in range(14):
    a = i * 2 * math.pi / 14 + R.uniform(-0.3, 0.3); h = R.uniform(0.3, 0.6); w = 0.05; lean = R.uniform(0.05, 0.2)
    ca, sa = math.cos(a), math.sin(a); px, py = -sa * w, ca * w
    v1 = bm.verts.new((px, py, 0)); v2 = bm.verts.new((-px, -py, 0)); v3 = bm.verts.new((ca * lean, sa * lean, h))
    bm.faces.new((v1, v2, v3))
kit('grass', [obj_from_bm(bm, lambda p: jit(hexc(R.choice((0xc8a860, 0xb89a54, 0xd8bc78))), 0.05))], note='walk-through')
# 6 sandstone rock cluster
P = []
for (x, y, r, sz) in ((0, 0, 0.9, 0.7), (0.95, 0.3, 0.55, 0.8), (-0.7, 0.5, 0.45, 0.65)):
    def rc(p, sz=sz, r=r):
        if p.normal.z > 0.75: return jit(hexc(0xc49a6c), 0.05)
        band = int((p.center.z + 5) * 4) % 3
        return jit(hexc((0xa56b48, 0x8e5a3e, 0xb07858)[band]) * (0.7 if p.center.z < 0.15 else 1), 0.05)
    P.append(obj_from_bm(bm_ico(r, 2, T(x, y, r * sz * 0.75) @ Rz(R.uniform(0, 90)) @ S(1, 0.85, sz), jitter=0.12), rc))
kit('rocks', P, collide=1.1, note='sandstone cluster ~2.4 m')
# 7 crate stack (inset frames)
def crate(sz, M, c):
    bm = bm_box(sz, sz, sz, M)
    bmesh.ops.inset_individual(bm, faces=list(bm.faces), thickness=sz * 0.09, depth=-sz * 0.03)
    base = hexc(c)
    # original 6 faces stay first and become the recessed panels (darker); new rim faces lighter
    ob = obj_from_bm(bm, lambda p: jit(base * (0.74 if p.index < 6 else 1.0), 0.03))
    return ob
P = [crate(0.95, T(0, 0, 0) @ Rz(4), 0x9b7a4c), crate(0.95, T(1.0, 0.05, 0) @ Rz(-6), 0x8c6c42),
     crate(0.8, T(0.45, 0.02, 0.95) @ Rz(12), 0xa58556), crate(0.6, T(-0.75, -0.35, 0) @ Rz(30), 0x93744a)]
kit('crates', P, collide=1.15, note='4 wooden crates')
# 8 pallet + sacks
P = []
for x in (-0.55, 0, 0.55): P.append(obj_from_bm(bm_box(0.1, 1.2, 0.1, T(x, 0, 0)), solid(hexc(0x8a7050))))
for y in (-0.5, -0.25, 0, 0.25, 0.5): P.append(obj_from_bm(bm_box(1.25, 0.16, 0.03, T(0, y, 0.1)), solid(hexc(0xa08660))))
for (x, y, z, a) in ((-0.3, -0.25, 0.13, 5), (0.3, -0.25, 0.13, -4), (-0.3, 0.25, 0.13, 8), (0.3, 0.25, 0.13, -2), (0, 0, 0.38, 80)):
    bm = bm_box(0.58, 0.38, 0.24, T(x, y, z) @ Rz(a))
    for v in bm.verts: v.co += Vector((R.uniform(-0.03, 0.03), R.uniform(-0.03, 0.03), R.uniform(-0.02, 0.02)))
    P.append(obj_from_bm(bm, solid(hexc(0xcdbb94), 0.06)))
kit('pallet-sacks', P, collide=0.75)
# 9 tyre pile
P = [obj_from_bm(bm_torus(0.36, 0.13, 10, 6, T(dx, dy, z) @ Ry(t)), lambda p: jit(hexc(0x1d1d1d if p.index % 2 else 0x2b2a28), 0.05))
     for (dx, dy, z, t) in ((0, 0, 0.13, 0), (0.06, 0.04, 0.39, 4), (-0.03, 0.02, 0.65, -6), (0.85, 0.2, 0.32, 70))]
kit('tyres', P, collide=0.7)
# 10 warning sign
P = [obj_from_bm(bm_box(0.08, 0.08, 1.85), solid(hexc(0x8a8a86))),
     obj_from_bm(bm_box(0.92, 0.05, 0.22, T(0, -0.06, 1.62)), solid(hexc(0xb8261e), 0.02)),
     obj_from_bm(bm_box(0.92, 0.045, 0.42, T(0, -0.06, 1.2)), solid(hexc(0xe8e2d4), 0.02))]
for z in (1.52, 1.4, 1.28): P.append(obj_from_bm(bm_box(0.62 if z != 1.28 else 0.4, 0.01, 0.045, T(0, -0.09, z)), solid(hexc(0x1a1a1a), 0.0)))
P.append(obj_from_bm(bm_box(0.5, 0.01, 0.06, T(0, -0.09, 1.69)), solid(hexc(0xf2eee4), 0.0)))
kit('sign', P, collide=0.25, note='RESTRICTED AREA style board')
# 11 power pole
P = [rod((0, 0, 0), (0, 0, 7.6), 0.13, 0.1, 6, grad(hexc(0x5a4632), 0, 7.6, 0.7)),
     obj_from_bm(bm_box(1.8, 0.12, 0.12, T(0, 0, 7.0)), solid(hexc(0x5e4a36))),
     beam((-0.6, 0, 6.6), (0, 0, 7.0), 0.05, solid(hexc(0x55432f))), beam((0.6, 0, 6.6), (0, 0, 7.0), 0.05, solid(hexc(0x55432f)))]
for x in (-0.75, 0, 0.75): P.append(obj_from_bm(bm_cyl(0.05, 0.035, 0.16, 6, T(x, 0, 7.12)), solid(hexc(0x7fa08a))))
kit('pole', P, collide=0.25, note='7.6 m wooden pole')
# 12 windmill (ranch water pump)
G = hexc(0x9a9a92)
P = []
corners = [(0.95, 0.95), (-0.95, 0.95), (-0.95, -0.95), (0.95, -0.95)]
for (x, y) in corners: P.append(beam((x, y, 0), (x * 0.18, y * 0.18, 6.2), 0.09, solid(G)))
for z, k in ((2.0, 0.71), (4.0, 0.45)):
    for i in range(4):
        (x1, y1), (x2, y2) = corners[i], corners[(i + 1) % 4]
        P.append(beam((x1 * k, y1 * k, z), (x2 * k, y2 * k, z), 0.06, solid(G)))
P.append(obj_from_bm(bm_box(0.5, 0.5, 0.1, T(0, 0, 6.2)), solid(hexc(0x8a8a84))))
P.append(rod((0, 0.2, 6.55), (0, -0.45, 6.55), 0.12, 0.12, 8, solid(hexc(0x707070))))
for i in range(12):
    a = i * 30
    P.append(obj_from_bm(bm_box(0.16, 0.02, 1.0, T(0, -0.42, 6.55) @ Ry(a) @ T(0, 0, 0.25) @ Rz(12)), solid(hexc(0xc8c8c0) if i % 2 else hexc(0xb0b0a8), 0.02)))
P.append(beam((0, 0.2, 6.55), (0, 1.5, 6.6), 0.06, solid(G)))
P.append(obj_from_bm(bm_box(0.03, 0.9, 0.6, T(0, 1.55, 6.35)), solid(hexc(0xa83a28), 0.03)))
P.append(rod((0.3, 0.3, 0), (0.3, 0.3, 6.1), 0.03, 0.03, 4, solid(hexc(0x6a6a66))))
P.append(obj_from_bm(bm_cyl(0.75, 0.75, 0.7, 12, T(2.0, 0.4, 0)), lambda p: jit(hexc(0x7c8288) if p.normal.z < 0.5 else hexc(0x3d5a66), 0.03)))
kit('windmill', P, collide=1.3, note='6.5 m windpump + water tank')
# 13 hay bale
P = [obj_from_bm(bm_cyl(0.6, 0.6, 1.25, 12, T(-0.62, 0, 0.6) @ Ry(90)),
                 lambda p: jit(hexc(0xe2c87a) if abs(p.normal.x) > 0.7 else hexc(0xcfae5c) * (0.85 if p.index % 2 else 1), 0.04)),
     obj_from_bm(bm_cyl(0.6, 0.6, 1.25, 12, T(0.1, 1.35, 0.6) @ Rz(25) @ Ry(90)),
                 lambda p: jit(hexc(0xe2c87a) if abs(p.normal.x) > 0.5 else hexc(0xc8a656) * (0.85 if p.index % 2 else 1), 0.04))]
kit('hay', P, collide=1.0)
# 14 cable spool
W = hexc(0xb08a5a)
P = [obj_from_bm(bm_cyl(0.55, 0.55, 0.06, 12, T(-0.36, 0, 0.55) @ Ry(90)), solid(W)),
     obj_from_bm(bm_cyl(0.55, 0.55, 0.06, 12, T(0.3, 0, 0.55) @ Ry(90)), solid(W)),
     obj_from_bm(bm_cyl(0.4, 0.4, 0.6, 12, T(-0.3, 0, 0.55) @ Ry(90)), lambda p: jit(hexc(0x1e1e22) if p.index % 3 else hexc(0x2a2a30), 0.03))]
kit('spool', P, collide=0.6)
# 15 lab floor cables (3 runs, 4 m along X)
P = []
for (y, r, c) in ((0.0, 0.035, 0x18181a), (0.09, 0.03, 0xa82020), (0.17, 0.028, 0xd0a020)):
    P.append(rod((-2, y, r), (2, y + R.uniform(-0.04, 0.04), r), r, r, 6, solid(hexc(c), 0.02)))
kit('cables', P, note='floor cables 4 m, walk-through')
# 16 hazard floor stripe (2.4 x 0.4)
bm = bmesh.new()
for i in range(8):
    x0 = -1.2 + i * 0.3; x1 = x0 + 0.3
    vs = [bm.verts.new(v) for v in ((x0, -0.2, 0.012), (x1, -0.2, 0.012), (x1 + 0.12, 0.2, 0.012), (x0 + 0.12, 0.2, 0.012))]
    bm.faces.new(vs)
kit('hazard', [obj_from_bm(bm, lambda p: hexc(0xe0b020) if p.index % 2 == 0 else hexc(0x181818))], note='floor stripe 2.4 m')
# 17 dead tree
P = [rod((0, 0, 0), (0.15, 0.05, 2.4), 0.16, 0.07, 6, solid(hexc(0x6e5f50)))]
for (z, a, l, tilt) in ((1.3, 20, 1.2, 50), (1.8, 150, 1.0, 45), (2.1, 260, 0.9, 35), (0.9, 300, 0.7, 60)):
    d = Vector((math.cos(math.radians(a)) * math.sin(math.radians(tilt)), math.sin(math.radians(a)) * math.sin(math.radians(tilt)), math.cos(math.radians(tilt))))
    base = Vector((0.15 * z / 2.4, 0.05 * z / 2.4, z))
    P.append(rod(base, base + d * l, 0.06, 0.02, 5, solid(hexc(0x7a6a5a))))
kit('dead-tree', P, collide=0.3)
# 18 metal shards (wreck)
P = []
for i in range(7):
    a = R.uniform(0, 2 * math.pi); d = R.uniform(0.2, 1.4)
    bm = bm_box(R.uniform(0.35, 0.9), R.uniform(0.04, 0.09), R.uniform(0.2, 0.55),
                T(math.cos(a) * d, math.sin(a) * d, 0) @ Rz(R.uniform(0, 180)) @ Rx(R.uniform(-55, 55)) @ Ry(R.uniform(-40, 40)), base=False)
    for v in bm.verts: v.co += Vector((R.uniform(-0.08, 0.08), R.uniform(-0.03, 0.03), R.uniform(-0.08, 0.08)))
    P.append(obj_from_bm(bm, lambda p: jit(hexc(R.choice((0x5a6066, 0x6c7278, 0x2a2420, 0x8a8e92))), 0.04)))
kit('shards', P, note='scorched hull shards, walk-through')
# 19 barricade (sawhorse)
P = []
for i in range(6):
    P.append(obj_from_bm(bm_box(0.24, 0.1, 0.22, T(-0.6 + i * 0.24, 0, 0.82)), solid(hexc(0xe06a18) if i % 2 == 0 else hexc(0xeeeeea), 0.02)))
for x in (-0.55, 0.55):
    for y in (-0.3, 0.3): P.append(beam((x, y, 0), (x, 0, 0.84), 0.05, solid(hexc(0x9a9690))))
kit('barricade', P, collide=0.0, note='walk-through (low)')
# 20 floodlight tower
P = []
for i in range(3):
    a = i * 2 * math.pi / 3; P.append(beam((math.cos(a) * 0.6, math.sin(a) * 0.6, 0), (0, 0, 1.2), 0.05, solid(hexc(0x606468))))
P.append(rod((0, 0, 1.0), (0, 0, 4.0), 0.06, 0.05, 6, solid(hexc(0x707478))))
bm = bm_box(0.7, 0.3, 0.45, T(0, 0, 4.0) @ Rx(-25), base=False)
P.append(obj_from_bm(bm, lambda p: hexc(0xfff2c0) if p.normal.y < -0.6 else jit(hexc(0x50545a), 0.03)))
P.append(obj_from_bm(bm_box(0.5, 0.35, 0.35, T(0.25, 0.25, 0)), solid(hexc(0x4a5a3a))))
kit('floodlight', P, collide=0.5, note='4.2 m light tower + generator')

# ---- export (kits at the origin) ----
kits = [v['obj'] for v in KITS.values()]
bpy.ops.object.select_all(action='DESELECT')
for o in kits: o.select_set(True)
want = dict(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
            export_texcoords=False, export_normals=True, export_materials='EXPORT', export_vertex_color='ACTIVE',
            export_all_vertex_colors=False, export_colors=True, export_animations=False, export_cameras=False,
            export_lights=False, export_extras=False, export_draco_mesh_compression_enable=False)
have = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in have})
report = {n: {k: v for k, v in d.items() if k != 'obj'} for n, d in KITS.items()}
report['_total_tris'] = sum(d['tris'] for d in KITS.values())
report['_dropped_opts'] = [k for k in want if k not in have]
print('KITS', json.dumps(report))

# ---- GPU previews: kit sheet + dusk vignette ----
dev = 'CPU'
try:
    cp = bpy.context.preferences.addons['cycles'].preferences
    for typ in ('OPTIX', 'CUDA'):
        try:
            cp.compute_device_type = typ; cp.get_devices()
            g = [d for d in cp.devices if d.type == typ]
            if g:
                for d in cp.devices: d.use = d.type == typ
                dev = typ + ':' + g[0].name; break
        except Exception as e: print('dev', typ, e)
except Exception as e: print('prefs', e)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'GPU' if dev != 'CPU' else 'CPU'
sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.render.image_settings.file_format = 'PNG'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']
gm = bpy.data.materials.new('sand'); gm.use_nodes = True
gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin(hexc(0xb07a48)), 1)
gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
bpy.ops.mesh.primitive_plane_add(size=200); ground = bpy.context.active_object; ground.data.materials.append(gm)
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt)
cd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
cam.constraints.new('TRACK_TO').target = tgt
sun_d = bpy.data.lights.new('sun', 'SUN'); sun = bpy.data.objects.new('sun', sun_d); sc.collection.objects.link(sun)
renders = []; t0 = time.time()
# sheet: grid 5 x 4
names = list(KITS)
for i, n in enumerate(names):
    o = KITS[n]['obj']; o.location = ((i % 5) * 4.2 - 8.4, (i // 5) * 4.6 - 5, 0)
sc.render.resolution_x, sc.render.resolution_y = 1600, 1100
bg.inputs[0].default_value = (0.55, 0.58, 0.64, 1); bg.inputs[1].default_value = 0.8
sun_d.energy = 3.2; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sun_d.color = (1, 0.96, 0.9)
cam.location = (0, -24, 17); tgt.location = (0, 1.5, 1.2); cd.lens = 40
sc.render.filepath = os.path.join(PREV, 'decor_kit_sheet.png'); bpy.ops.render.render(write_still=True); renders.append(sc.render.filepath)
# vignette: dusk desert scatter
for o in kits: o.hide_render = True
def inst(n, x, y, rz=0, s=1):
    src = KITS[n]['obj']; o = src.copy(); o.hide_render = False; sc.collection.objects.link(o)
    o.location = (x, y, 0); o.rotation_euler = (0, 0, math.radians(rz)); o.scale = (s, s, s); return o
V = [('windmill', -9, 14, 20), ('hay', -4, 8, 10), ('pole', -14, 22, 0), ('pole', -2, 24, 0), ('pole', 10, 26, 0),
     ('saguaro', 6, 10, 40), ('saguaro', 12, 18, 120, 1.2), ('rocks', 2, 14, 30, 1.3), ('rocks', -12, 6, 80),
     ('sage', 0, 5, 0), ('sage', 3, 7, 50, 1.2), ('grass', -1, 3.5, 0), ('grass', 1.5, 4, 70), ('grass', -3, 5, 20),
     ('barrel-cactus', 4, 4.5, 0), ('prickly-pear', -5.5, 4.2, 30), ('dead-tree', 8, 6, 200), ('sign', -1.5, 7, 10),
     ('crates', 5, 12, 25), ('tyres', 8.5, 11, 0), ('floodlight', -6, 10, 150), ('shards', 1, 9, 0), ('barricade', 3, 6.2, -15)]
for v in V: inst(*v)
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
bg.inputs[0].default_value = (0.42, 0.2, 0.32, 1); bg.inputs[1].default_value = 0.55
sun_d.energy = 4.0; sun_d.color = (1.0, 0.55, 0.28); sun.rotation_euler = (math.radians(80), 0, math.radians(-120))
cam.location = (0, -6, 2.2); tgt.location = (0, 10, 2.0); cd.lens = 28
sc.render.filepath = os.path.join(PREV, 'decor_vignette_dusk.png'); bpy.ops.render.render(write_still=True); renders.append(sc.render.filepath)
report['_render'] = dict(device=dev, seconds=round(time.time() - t0, 1), files=renders)
json.dump(report, open(os.path.join(os.path.dirname(OUT), 'decor_kit_report.json'), 'w'), indent=1)
print('RENDERED', report['_render']); print('DONE')
