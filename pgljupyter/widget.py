"""
TODO: Add module docstring
"""

from ipywidgets.widgets import DOMWidget, Widget, register
from traitlets import Unicode, Instance, Int, Float, Tuple, Dict, Bool, List, observe
from openalea.plantgl.all import Scene, Shape, ParametricModel, serialize_scene
from functools import reduce
import random, string, io

from ._frontend import module_name, module_version

def scene_to_json(x, obj):
    if isinstance(x, dict):
        return {k: scene_to_json(v, obj) for k, v in x.items()}
    elif isinstance(x, (list, tuple)):
        return [scene_to_json(v, obj) for v in x]
    elif isinstance(x, Scene):
        return str(x)
    else:
        return x

@register
class SceneWidget(DOMWidget):
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
    size_display = Tuple(Float(min=0), Float(min=0), default_value=(400, 400)).tag(sync=True)
    size_world = Tuple(Float(min=0), Float(min=0), Float(min=0), default_value=(10, 10, 10)).tag(sync=True)
    axes_helper = Bool(False).tag(sync=True)
    light_helper = Bool(False).tag(sync=True)
    plane = Bool(True).tag(sync=True)
    single_mesh = False

    def __init__(self, obj=None, **kwargs):
        scene = self.__to_scene(obj)
        serialized = self.__serialize(scene);
        kwargs['scene'] = {
            'drc': serialized.data,
            'offsets': serialized.offsets,
            'scene': scene,
            'position': kwargs.get('position') if 'position' in kwargs else (0,0,0),
            'scale':  kwargs.get('scale') if 'scale' in kwargs else 1.0
        }
        super().__init__(**kwargs)

    def __to_scene(self, obj):
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
    def __serialize(self, scene):
        serialized = serialize_scene(scene, self.single_mesh)
        if not serialized.status:
            raise ValueError('scene serialization failed')
        # print(serialized)
        return serialized

    def add(self, obj, position=(0,0,0), scale=1.0):
        scene = self.__to_scene(obj);
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
        serialized = self.__serialize(scene);
        self.set_trait(name, {
            'drc': serialized.data,
            'offsets': serialized.offsets,
            'scene': scene,
            'position': position,
            'scale': scale
        })
        return id
