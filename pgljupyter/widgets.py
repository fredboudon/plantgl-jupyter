"""
TODO: Add module docstring
"""

from ipywidgets.widgets import DOMWidget, Widget, register
from traitlets import Unicode, Instance, Int, Float, Tuple, Dict, Bool, List, observe, UseEnum
from openalea.plantgl.all import Scene, Shape, ParametricModel, serialize_scene as pgl_serialize_scene
from openalea.lpy import Lsystem
from functools import reduce
import random, string, io
from enum import Enum

from ._frontend import module_name, module_version

class Unit(Enum):
    m = 0
    cm = 1
    mm = 2

def scene_to_json(x, obj):
    if isinstance(x, dict):
        return {k: scene_to_json(v, obj) for k, v in x.items()}
    elif isinstance(x, (list, tuple)):
        return [scene_to_json(v, obj) for v in x]
    elif isinstance(x, Scene):
        return str(x)
    else:
        return x

def to_scene(obj):
    scene = Scene()
    if obj is None:
        pass
    elif isinstance(obj, Scene):
        scene = obj
    elif isinstance(obj, (Shape, ParametricModel)):
        scene = Scene([obj])
    elif isinstance(obj, list) and reduce(lambda a, b: a and (isinstance(b, Shape) or isinstance(b, ParametricModel)), obj):
        scene = Scene(obj)
    else:
        raise ValueError('Not a PlantGL Scene, Shape or Model')
    return scene

# TODO: serialize in thread
def serialize_scene(scene, single_mesh=False):
    serialized = pgl_serialize_scene(scene, single_mesh)
    if not serialized.status:
        raise ValueError('scene serialization failed')
    # print(serialized)
    return serialized

@register
class PGLWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('PGLWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('PGLWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    size_display = Tuple(Int(400, min=400), Int(400, min=400), default_value=(400, 400)).tag(sync=True)
    size_world = Tuple(Int(1, min=1), Int(1, min=1), Int(1, min=1), default_value=(10, 10, 10)).tag(sync=True)
    axes_helper = Bool(False).tag(sync=True)
    light_helper = Bool(False).tag(sync=True)
    plane = Bool(True).tag(sync=True)
    single_mesh = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

@register
class SceneWidget(PGLWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('SceneWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('SceneWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    scene = Dict(traits={
        'drc': Instance(memoryview),
        'offsets': List([]),
        'scene': Instance(Scene),
        'position': Tuple(Float(0), Float(0), Float(0)),
        'scale': Float(1)
    }).tag(sync=True, to_json=scene_to_json)

    def __init__(self, obj=None, position=(0,0,0), scale=(1.0), **kwargs):
        scene = to_scene(obj)
        serialized = serialize_scene(scene);
        self.scene = {
            'drc': serialized.data,
            'offsets': serialized.offsets,
            'scene': scene,
            'position': position,
            'scale':  scale
        }
        super().__init__(**kwargs)

    def add(self, obj, position=(0,0,0), scale=1.0):
        scene = to_scene(obj)
        id = ''.join(random.choices(string.ascii_letters + string.digits, k=25))
        name = 'scene_' + id
        trait = Dict(traits={
            'drc': Instance(memoryview),
            'offsets': List([]),
            'scene': Instance(Scene),
            'position': Tuple(Float(0), Float(0), Float(0)),
            'scale': Float(1)
        }).tag(sync=True, to_json=scene_to_json);
        self.add_traits(**{ name: trait })
        self.send({'new_trait': { 'name': name }})
        serialized = serialize_scene(scene);
        self.set_trait(name, {
            'drc': serialized.data,
            'offsets': serialized.offsets,
            'scene': scene,
            'position': position,
            'scale': scale
        })
        return id



@register
class LsystemWidget(PGLWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('LsystemWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('LsystemWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    units = Unit
    trees = []
    scenes = []
    lsystem = Instance(Lsystem).tag(sync=True, to_json=lambda e, o: {
        'derivationLength': e.derivationLength
    })
    unit = UseEnum(Unit).tag(sync=True, to_json=lambda e, o: e.value)
    scene = Dict(traits={
        'drc': Instance(memoryview),
        'offsets': List([]),
        'scene': Instance(Scene),
        'derivationStep': Int(0, min=0)
    }).tag(sync=True, to_json=scene_to_json)
    animate = Bool(False).tag(sync=True)

    def __init__(self, lsystem, unit=Unit.m, animate=False, **kwargs):
        self.lsystem = lsystem
        self.trees.append(lsystem.axiom)
        self.unit = unit
        self.animate = animate
        self.__set_scene(0)
        self.on_msg(self.on_custom_msg)
        super().__init__(**kwargs)

    def on_custom_msg(self, widget, content, buffers):
        if 'derive' in content and content['derive']:
            self.__derive(self.scene['derivationStep'] + 1)

    def __set_scene(self, step):
        if step < len(self.scenes):
            self.scene = self.scenes[step]
        else:
            scene = self.lsystem.sceneInterpretation(self.trees[step])
            serialized = serialize_scene(scene)
            serialized_scene = {
                'drc': serialized.data,
                'offsets': serialized.offsets,
                'scene': scene,
                'derivationStep': step
            }
            self.scene = serialized_scene
            self.scenes.append(serialized_scene)

    def __derive(self, step):
        if step < self.lsystem.derivationLength and step <= len(self.trees):
            if step == len(self.trees):
                self.trees.append(self.lsystem.derive(self.trees[step - 1], step, 1))
            self.__set_scene(step)
        else:
            print('derivation step out of Lsystem bounds')
