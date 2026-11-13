"""Original folder and filing cabinet (our work, for evidence props).
Sketchfab CC BY models (PolyDavid, Renafox, Amiel Goco) require an account to download — skipped."""
import bpy, os, math
from mathutils import Vector

OUT = "/workspace/games3d/dossier-baass-3d/assets/src"
os.makedirs(OUT, exist_ok=True)

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, rough=0.55, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit and 'Emission Color' in p.inputs:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emit
    return m

def export(path):
    # apply transforms, origin at bottom center, face -Y
    bpy.ops.object.select_all(action='SELECT')
    for o in bpy.context.selected_objects:
        bpy.context.view_layer.objects.active = o
        if o.type == 'MESH':
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_yup=True,
    )
    print('WROTE', path, os.path.getsize(path))

# —— Manila folder, ~0.32 × 0.025 × 0.23 m, origin bottom, front -Y
clear()
folder_mat = mat('FolderManila', (0.76, 0.62, 0.32), rough=0.7)
tab_mat = mat('FolderTab', (0.70, 0.52, 0.22), rough=0.7)
paper_mat = mat('FolderPaper', (0.92, 0.90, 0.82), rough=0.85)

def box(name, sx, sy, sz, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (sx/2, sy/2, sz/2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(material)
    return o

# body
box('folder_back', 0.32, 0.006, 0.23, (0, 0.012, 0.115), folder_mat)
box('folder_front', 0.32, 0.006, 0.21, (0, -0.012, 0.105), folder_mat)
box('folder_spine', 0.32, 0.024, 0.008, (0, 0, 0.004), folder_mat)
box('folder_tab', 0.10, 0.006, 0.03, (-0.07, 0.012, 0.245), tab_mat)
# papers peeking
box('folder_papers', 0.30, 0.014, 0.20, (0, 0, 0.108), paper_mat)
# origin already at bottom center (z=0)
export(os.path.join(OUT, 'folder.raw.glb'))

# —— Filing cabinet, rusty metal, 0.50 × 0.62 × 1.32 m
clear()
body_mat = mat('CabinetBody', (0.28, 0.18, 0.10), rough=0.55, metal=0.65)
rust_mat = mat('CabinetRust', (0.38, 0.16, 0.07), rough=0.72, metal=0.4)
handle_mat = mat('CabinetHandle', (0.15, 0.15, 0.15), rough=0.35, metal=0.85)
box('cabinet_body', 0.50, 0.62, 1.32, (0, 0, 0.66), body_mat)
# 4 drawers
for i, z in enumerate([0.18, 0.50, 0.82, 1.14]):
    d = box(f'drawer_{i}', 0.46, 0.04, 0.26, (0, -0.30, z), rust_mat)
    h = box(f'handle_{i}', 0.12, 0.03, 0.025, (0, -0.335, z), handle_mat)
# top edge
box('cabinet_top', 0.52, 0.64, 0.03, (0, 0, 1.335), body_mat)
export(os.path.join(OUT, 'cabinet.raw.glb'))

# —— Clean man: keep Idle/Walk/Run/Standing, join meshes
clear()
bpy.ops.import_scene.gltf(filepath='/tmp/poly/man.glb')
keep = {'HumanArmature|Man_Idle','HumanArmature|Man_Walk','HumanArmature|Man_Run','HumanArmature|Man_Standing'}
for a in list(bpy.data.actions):
    if a.name not in keep:
        bpy.data.actions.remove(a)
        print('removed action', a.name if False else '')
# join meshes (keep armature)
meshes = [o for o in bpy.data.objects if o.type=='MESH']
arm = next((o for o in bpy.data.objects if o.type=='ARMATURE'), None)
if meshes:
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes)>1:
        bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = 'investigator'
    print('joined', joined.name, 'arm', arm.name if arm else None)
# scale so height ~1.8 m, feet at z=0
# current min z=-1, max z=4.80, height 5.80
# After import, Blender is Z-up
minz, maxz = 1e9, -1e9
for obj in bpy.data.objects:
    if obj.type!='MESH':
        continue
    for c in obj.bound_box:
        w = obj.matrix_world @ Vector(c)
        minz = min(minz, w.z); maxz = max(maxz, w.z)
print('man z', minz, maxz, 'h', maxz-minz)
scale = 1.80 / (maxz-minz)
# parent all to armature, scale armature
if arm:
    arm.scale = (scale, scale, scale)
    arm.location.z = -minz * scale
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
# apply mesh scale too if any leftover
for o in bpy.data.objects:
    if o.type=='MESH':
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# recompute
minz, maxz = 1e9, -1e9
for obj in bpy.data.objects:
    if obj.type!='MESH':
        continue
    for c in obj.bound_box:
        w = obj.matrix_world @ Vector(c)
        minz = min(minz, w.z); maxz = max(maxz, w.z)
print('man AFTER z', minz, maxz, 'h', maxz-minz)

bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, 'man.raw.glb'),
    export_format='GLB',
    export_apply=True,
    export_animations=True,
    export_def_bones=False,
    export_anim_single_armature=True,
    export_yup=True,
)
print('WROTE man', os.path.getsize(os.path.join(OUT, 'man.raw.glb')))
print('DONE')
