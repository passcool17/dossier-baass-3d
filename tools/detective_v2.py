# Blender 5.x headless:  blender -b --python detective_v2.py -- WORKDIR PREVIEWDIR
# Opens WORKDIR/detective_anim.blend (Idle/Walk/Run from animate_detective.py), adds one-shot
# clips Pickup + Inspect (in place, start/end = Idle frame 0), saves detective_anim_v2.blend,
# exports detective_v2.raw.glb (NLA tracks), renders GPU previews, re-imports to validate.
import bpy, sys, os, math, json, time
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
WORK, PREV = argv[0], argv[1]
os.makedirs(PREV, exist_ok=True)
SRC = os.path.join(WORK, 'detective_anim.blend')
OUTB = os.path.join(WORK, 'detective_anim_v2.blend')
RAW = os.path.join(WORK, 'detective_v2.raw.glb')
REPORT = {}
bpy.ops.wm.open_mainfile(filepath=SRC)
sc = bpy.context.scene
rig = bpy.data.objects['Detective_Rig']; body = bpy.data.objects['Detective_Body']
rig.data.pose_position = 'POSE'
ad = rig.animation_data_create()
print('BLENDER', bpy.app.version_string, 'tracks', [t.name for t in ad.nla_tracks])

def fcurves_of(act):
    try:
        return list(act.fcurves)
    except AttributeError:
        out = []
        for L in act.layers:
            for s in L.strips:
                for cb in s.channelbags: out.extend(cb.fcurves)
        return out

def assign(act):
    ad.action = act
    if act is not None and hasattr(ad, 'action_slot') and ad.action_slot is None and len(act.slots):
        ad.action_slot = act.slots[0]

P = 'mixamorig:'
N = {k: P + v for k, v in dict(
    hips='Hips_01', sp0='Spine_02', sp1='Spine1_03', sp2='Spine2_04', neck='Neck_05', head='Head_06',
    shL='LeftShoulder_08', armL='LeftArm_09', faL='LeftForeArm_010', hdL='LeftHand_011',
    i1L='LeftHandIndex1_012', i2L='LeftHandIndex2_013', i3L='LeftHandIndex3_014',
    shR='RightShoulder_016', armR='RightArm_017', faR='RightForeArm_018', hdR='RightHand_00',
    i1R='RightHandIndex1_019', i2R='RightHandIndex2_020', i3R='RightHandIndex3_021',
    ulL='LeftUpLeg_023', lgL='LeftLeg_024', ftL='LeftFoot_025', toL='LeftToeBase_026',
    ulR='RightUpLeg_028', lgR='RightLeg_029', ftR='RightFoot_030', toR='RightToeBase_031').items()}
KEYED = list(N.values())
REST = {n: rig.data.bones[n].matrix_local.to_quaternion() for n in KEYED}
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
def Rx(d): return Quaternion(X, math.radians(d))
def Ry(d): return Quaternion(Y, math.radians(d))
def Rz(d): return Quaternion(Z, math.radians(d))
TAU = 2 * math.pi

def side_pose(o, s, thigh, knee, ankle, toe, sh_low, arm_low, arm_sw, elbow, hand, curl, hips_q, abd=0.0):
    sfx = 'L' if s > 0 else 'R'
    o['ul' + sfx] = hips_q.inverted() @ Rx(thigh) @ Ry(-s * abd)
    o['lg' + sfx] = Rx(knee); o['ft' + sfx] = Rx(ankle); o['to' + sfx] = Rx(toe)
    o['sh' + sfx] = Ry(s * sh_low); o['arm' + sfx] = Rx(arm_sw) @ Ry(s * arm_low)
    o['fa' + sfx] = Rz(-s * elbow); o['hd' + sfx] = Ry(s * hand)
    for i in ('i1', 'i2', 'i3'): o[i + sfx] = Ry(s * curl)

def pose_idle(p):  # identical to animate_detective.py
    o = {}
    b = math.sin(TAU * p); w = math.sin(TAU * p + 0.6)
    hq = Rz(1.0 * math.sin(TAU * p + 1.4)) @ Ry(1.6 * w)
    o['hips'] = hq
    o['sp0'] = Ry(-0.6 * w) @ Rx(0.6); o['sp1'] = Ry(-0.5 * w) @ Rx(0.4 - 0.5 * b)
    o['sp2'] = Ry(-0.4 * w) @ Rx(0.3 - 0.9 * b); o['neck'] = Rx(-0.4 + 0.4 * b)
    o['head'] = Rz(3.0 * math.sin(TAU * p + 0.5)) @ Rx(0.6 * b)
    kL = 3 + 4 * (1 + w) / 2; kR = 3 + 4 * (1 - w) / 2
    for s, k in ((1, kL), (-1, kR)):
        th = -k / 2
        side_pose(o, s, th, k, -(th + k), 0, sh_low=7 - 1.2 * b, arm_low=56, arm_sw=-3 + 1.0 * b * s,
                  elbow=14 + 2 * b, hand=8, curl=18, hips_q=hq, abd=1.5)
    return o
IDLE0 = pose_idle(0.0)

def pose_crouch(kn, lean, sw, grip, back=0):
    o = {}
    hq = Rx(10); o['hips'] = hq
    o['sp0'] = Rx(lean * 0.4); o['sp1'] = Rx(lean * 0.35); o['sp2'] = Rx(lean * 0.25)
    o['neck'] = Rx(-6); o['head'] = Rx(22) @ Rz(-6)
    th = -kn / 2
    for s in (1, -1):
        legs = dict(thigh=th - back - (3 if s < 0 else -3), knee=kn, toe=-12, hips_q=hq, abd=6)
        legs['ankle'] = -(legs['thigh'] + kn) + 12
        if s > 0:   # left hand rests on the knee
            side_pose(o, s, sh_low=4, arm_low=68, arm_sw=-28, elbow=38, hand=8, curl=22, **legs)
        else:       # right hand reaches the evidence
            side_pose(o, s, sh_low=2, arm_low=80, arm_sw=sw, elbow=12, hand=6, curl=grip, **legs)
    return o

def pose_hold(t=0.0, both=0.0):
    # standing, evidence held in the right hand at chest height, head looking at it
    o = {}
    hq = Ry(1.2 * math.sin(TAU * t)); o['hips'] = hq
    o['sp0'] = Rx(1.5); o['sp1'] = Rx(1.5) @ Rz(-3); o['sp2'] = Rx(1.0) @ Rz(-3)
    o['neck'] = Rx(4); o['head'] = Rx(16 + 3 * math.sin(TAU * t * 2)) @ Rz(-10 + 6 * math.sin(TAU * t)) @ Ry(5 * math.sin(TAU * t))
    for s in (1, -1):
        legs = dict(thigh=-2, knee=4, ankle=-2, toe=0, hips_q=hq, abd=1.5)
        if s < 0:
            side_pose(o, s, sh_low=5, arm_low=70, arm_sw=-48, elbow=88, hand=-8 + 18 * math.sin(TAU * t), curl=42, **legs)
        else:
            side_pose(o, s, sh_low=7 - 2 * both, arm_low=56 + 10 * both, arm_sw=-3 - 30 * both, elbow=14 + 80 * both,
                      hand=8, curl=18 + 10 * both, **legs)
    return o

def slerp_pose(a, b, t):
    out = {}
    for k in set(a) | set(b):
        qa = a.get(k, Quaternion()); qb = b.get(k, Quaternion()).copy()
        if qa.dot(qb) < 0: qb.negate()
        out[k] = qa.slerp(qb, t)
    return out

def ease(t): t = min(1, max(0, t)); return t * t * (3 - 2 * t)

def timeline(keys):
    """keys: [(frame, pose_fn(frame) or dict)] -> fn(frame) with smoothstep between keys."""
    def at(f):
        for (f0, p0), (f1, p1) in zip(keys, keys[1:]):
            if f0 <= f <= f1:
                a = p0(f) if callable(p0) else p0; b = p1(f) if callable(p1) else p1
                return slerp_pose(a, b, ease((f - f0) / max(1e-6, f1 - f0)))
        p = keys[-1][1]; return p(f) if callable(p) else p
    return at

hips_pb = rig.pose.bones[N['hips']]; HIPS_REST = REST[N['hips']]
def apply_pose(o):
    for k, n in N.items():
        q = o.get(k, Quaternion())
        rig.pose.bones[n].rotation_quaternion = REST[n].inverted() @ q @ REST[n]
def set_hips_z(z): hips_pb.location = HIPS_REST.inverted() @ Vector((0, 0, z))
def coords():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); me = ev.to_mesh()
    co = [ev.matrix_world @ v.co for v in me.vertices]; ev.to_mesh_clear(); return co

gi = {g.index: g.name for g in body.vertex_groups}
dom = []
for v in body.data.vertices:
    best = max(v.groups, key=lambda g: g.weight, default=None)
    dom.append(gi[best.group] if best else '')
FOOT = [i for i, g in enumerate(dom) if ('Foot' in g or 'Toe' in g)]
HANDR = [i for i, g in enumerate(dom) if 'RightHand' in g]
NONFOOT = [i for i, g in enumerate(dom) if not ('Foot' in g or 'Toe' in g)]
print('verts foot/handR', len(FOOT), len(HANDR))

def ground(o):
    """apply pose, put the lowest foot vertex at z=0; return (hips_z, coords)."""
    apply_pose(o); hips_pb.location = (0, 0, 0); bpy.context.view_layer.update()
    co = coords(); z = -min(co[i].z for i in FOOT)
    set_hips_z(z); bpy.context.view_layer.update()
    return z, coords()

# ---- auto-tune the crouch: right hand ~0.15 m above ground, nothing but feet below 0.02 m ----
assign(None)
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
best = None; tried = []
import itertools
for kn, lean, sw, back in itertools.product((100, 115, 130), (35, 50, 65), (-40, -60, -80), (0, 10, 20)):
            _, co = ground(pose_crouch(kn, lean, sw, 10, back))
            hz = min(co[i].z for i in HANDR); nf = min(co[i].z for i in NONFOOT if i not in HANDR)
            score = abs(hz - 0.12) + (5 if (nf < 0.03 or hz < 0.03) else 0) + 0.001 * kn + 0.001 * lean + 0.001 * back
            tried.append((kn, lean, sw, back, round(hz, 3), round(nf, 3)))
            if best is None or score < best[0]: best = (score, kn, lean, sw, hz, nf, back)
print('CROUCH best', best)
REPORT['crouch_tune'] = dict(knee=best[1], lean=best[2], arm_sw=best[3], back=best[6], hand_z=round(best[4], 3), nonfoot_min_z=round(best[5], 3))
KN, LEAN, SW, BK = best[1], best[2], best[3], best[6]
CROUCH_OPEN = pose_crouch(KN, LEAN, SW, 8, BK); CROUCH_GRIP = pose_crouch(KN, LEAN, SW, 55, BK)

NF_P, NF_I = 54, 75
PICK = timeline([(0, IDLE0), (5, IDLE0), (17, CROUCH_OPEN), (21, CROUCH_GRIP), (25, CROUCH_GRIP),
                 (40, lambda f: pose_hold(0)), (46, lambda f: pose_hold(0)), (NF_P, IDLE0)])
INSP = timeline([(0, IDLE0), (14, lambda f: pose_hold((f - 14) / 46.0, 0)),
                 (24, lambda f: pose_hold((f - 14) / 46.0, 1)), (50, lambda f: pose_hold((f - 14) / 46.0, 1)),
                 (60, lambda f: pose_hold((f - 14) / 46.0, 0)), (NF_I, IDLE0)])
NEW = [('Pickup', NF_P, PICK), ('Inspect', NF_I, INSP)]

# reference: Idle frame 0 mesh (start/end of the one-shots must match it)
assign(bpy.data.actions['Idle']); sc.frame_set(0); bpy.context.view_layer.update(); IDLE_CO = coords(); assign(None)

for name, NF, fn in NEW:
    if name in bpy.data.actions: bpy.data.actions.remove(bpy.data.actions[name])
    for t in list(ad.nla_tracks):
        if t.name == name: ad.nla_tracks.remove(t)
    act = bpy.data.actions.new(name); assign(act)
    keys = sorted(set(list(range(0, NF + 1, 2)) + [NF])); prev = {}
    zs = {}
    for f in range(0, NF + 1):
        z, _ = ground(fn(f)); zs[f] = z
        if f in keys:
            for n in KEYED:
                pb = rig.pose.bones[n]; q = pb.rotation_quaternion.copy()
                if n in prev and prev[n].dot(q) < 0: q.negate()
                pb.rotation_quaternion = q; prev[n] = q
                pb.keyframe_insert('rotation_quaternion', frame=f, group=n)
    for f, z in zs.items():
        set_hips_z(z); hips_pb.keyframe_insert('location', index=1, frame=f, group=N['hips'])
    for fc in fcurves_of(act):
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR' if fc.data_path.endswith('.location') else 'BEZIER'
        fc.update()
    act.frame_range = (0, NF); act.use_frame_range = True; act.use_cyclic = False
    tr = ad.nla_tracks.new(); tr.name = name
    st = tr.strips.new(name, 0, act); st.name = name; tr.mute = True
    assign(None)

# ---- checks on all clips ----
def check(name):
    act = bpy.data.actions[name]; assign(act)
    f0, f1 = [int(round(x)) for x in act.frame_range]
    fmin = 9; nfmin = 9; hmin = 9; slide = 0; c0 = None; first = last = None
    for f in range(f0, f1 + 1):
        sc.frame_set(f); bpy.context.view_layer.update(); co = coords()
        fz = min(co[i].z for i in FOOT); fmin = min(fmin, fz)
        nfmin = min(nfmin, min(co[i].z for i in NONFOOT)); hmin = min(hmin, min(co[i].z for i in HANDR))
        if f == f0: first = co
        if f == f1: last = co
    r = dict(frames=f1 - f0, duration_s=round((f1 - f0) / sc.render.fps, 3), foot_min_z=round(fmin, 4),
             nonfoot_min_z=round(nfmin, 4), right_hand_min_z=round(hmin, 4),
             loop_or_seam_delta_m=round(max((a - b).length for a, b in zip(first, last)), 5),
             start_vs_idle0_m=round(max((a - b).length for a, b in zip(first, IDLE_CO)), 5),
             fcurves=len(fcurves_of(act)))
    assign(None); return r
REPORT['clips'] = {n: check(n) for n in ('Idle', 'Walk', 'Run', 'Pickup', 'Inspect')}
print('CHECKS', json.dumps(REPORT['clips'], indent=1))
for pb in rig.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
assign(None)
sc.frame_start = 0; sc.frame_end = 90
bpy.ops.wm.save_as_mainfile(filepath=OUTB, compress=False)
print('SAVED', OUTB)

# ---- export raw GLB ----
want = dict(filepath=RAW, export_format='GLB', export_yup=True, use_selection=False, export_apply=False,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_nla_strips=True,
    export_force_sampling=True, export_frame_step=1, export_anim_slide_to_zero=True,
    export_optimize_animation_size=False, export_skins=True, export_influence_nb=4,
    export_all_influences=False, export_def_bones=False, export_rest_position_armature=True,
    export_image_format='AUTO', export_materials='EXPORT', export_texcoords=True, export_normals=True,
    export_tangents=False, export_draco_mesh_compression_enable=False, export_extras=False,
    export_cameras=False, export_lights=False)
have = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
REPORT['export_dropped_opts'] = [k for k in want if k not in have]
bpy.ops.export_scene.gltf(**{k: v for k, v in want.items() if k in have})
REPORT['raw_bytes'] = os.path.getsize(RAW); print('EXPORTED', RAW, REPORT['raw_bytes'])

# ---- GPU previews (Cycles) ----
dev_used = 'CPU'
try:
    cp = bpy.context.preferences.addons['cycles'].preferences
    for typ in ('OPTIX', 'CUDA'):
        try:
            cp.compute_device_type = typ; cp.get_devices()
            gpus = [d for d in cp.devices if d.type == typ]
            if gpus:
                for d in cp.devices: d.use = (d.type == typ)
                dev_used = typ + ':' + gpus[0].name; break
        except Exception as e: print('dev', typ, e)
except Exception as e: print('cycles prefs', e)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'GPU' if dev_used != 'CPU' else 'CPU'
sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 560, 800, 100
sc.render.image_settings.file_format = 'PNG'
sc.view_settings.view_transform = 'AgX' if 'AgX' in [i.name for i in type(sc.view_settings).bl_rna.properties['view_transform'].enum_items] else 'Filmic'
w = bpy.data.worlds.new('prev'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.42, 0.44, 0.48, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.55
def light(name, typ, loc, energy, size=1.0):
    ld = bpy.data.lights.new(name, typ); ld.energy = energy
    if typ == 'AREA': ld.size = size
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    tc = ob.constraints.new('TRACK_TO'); tc.target = tgt; return ob
tgt = bpy.data.objects.new('tgt', None); sc.collection.objects.link(tgt); tgt.location = (0, 0, 0.9)
light('key', 'AREA', (-2.5, -3.5, 3.2), 320, 2.5); light('fill', 'AREA', (3.0, -2.0, 1.8), 90, 3); light('rim', 'AREA', (0.5, 3.5, 3.0), 260, 2)
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
fl = bpy.context.active_object; fm = bpy.data.materials.new('floor'); fm.use_nodes = True
fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.5, 0.42, 1); fl.data.materials.append(fm)
cd = bpy.data.cameras.new('cam'); cd.lens = 50; cam = bpy.data.objects.new('cam', cd); sc.collection.objects.link(cam); sc.camera = cam
cam.constraints.new('TRACK_TO').target = tgt
VIEWS = {'front': (0.9, -5.2, 1.25), 'side': (5.3, -0.4, 1.25)}
MID = {'Idle': 45, 'Walk': 8, 'Run': 5, 'Pickup': 21, 'Inspect': 40}
renders = []; t0 = time.time()
for clip, f in MID.items():
    assign(bpy.data.actions[clip]); sc.frame_set(f)
    for v, loc in VIEWS.items():
        cam.location = loc
        sc.render.filepath = os.path.join(PREV, f'detective_{clip}_f{f:02d}_{v}.png')
        try:
            bpy.ops.render.render(write_still=True)
        except Exception as e:
            print('render GPU failed, CPU', e); sc.cycles.device = 'CPU'; dev_used += '->CPU'; bpy.ops.render.render(write_still=True)
        renders.append(sc.render.filepath)
REPORT['render'] = dict(device=dev_used, seconds=round(time.time() - t0, 1), files=renders)
print('RENDERED', REPORT['render'])

# ---- re-import validation of the raw GLB ----
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=RAW)
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']; meshes = [o for o in bpy.data.objects if o.type == 'MESH']
tris = 0; mats = set()
for m in meshes:
    m.data.calc_loop_triangles(); tris += len(m.data.loop_triangles); mats |= {s.material.name for s in m.material_slots if s.material}
REPORT['reimport'] = dict(actions=sorted(a.name for a in bpy.data.actions), bones=[len(a.data.bones) for a in arms],
                          meshes=[m.name for m in meshes], tris=tris, materials=sorted(mats))
print('REIMPORT', REPORT['reimport'])
json.dump(REPORT, open(os.path.join(WORK, 'detective_v2_report.json'), 'w'), indent=1)
print('DONE')
