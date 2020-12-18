"""
TODO: Add module docstring
"""

import random
import string
import io
import os
import zlib
from enum import Enum
from pathlib import Path

from ipywidgets.widgets import DOMWidget, register
from traitlets import (
    Unicode, Instance,
    Bytes, Int, Float, Tuple, Dict, Bool, List, UseEnum
)

import openalea.plantgl.all as pgl
import openalea.lpy as lpy
from openalea.lpy.lsysparameters import LsystemParameters

from .editors import ParameterEditor
from ._frontend import module_name, module_version


class Unit(Enum):
    none = -1
    m = 0
    dm = 1
    cm = 2
    mm = 3


# TODO: serialize in thread?
def scene_to_bytes(scene):
    # serialized = pgl_scene_to_bytes(scene, single_mesh)
    # if not serialized.status:
    #     raise ValueError('scene serialization failed')
    return zlib.compress(pgl.tobinarystring(scene, False), 9)


def scene_to_json(x, obj):
    if isinstance(x, dict):
        return {k: scene_to_json(v, obj) for k, v in x.items()}
    elif isinstance(x, (list, tuple)):
        return [scene_to_json(v, obj) for v in x]
    elif isinstance(x, pgl.Scene):
        return str(x)
    else:
        return x


def to_scene(obj):
    scene = pgl.Scene()
    if obj is None:
        pass
    elif isinstance(obj, pgl.Scene):
        scene = obj
    else:
        if isinstance(obj, list):
            scene = pgl.Scene(obj)
        else:
            scene = pgl.Scene([obj])
    return scene


def serialize_scene(scene):
    return scene_to_bytes(scene)


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
    size_world = Float(1.0, min=0.1).tag(sync=True)
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

    scenes = List(trait=Dict(traits={
        'id': Unicode(),
        'data': Bytes(),
        'scene': Instance(pgl.Scene),
        'position': Tuple(Float(0.0), Float(0.0), Float(0.0)),
        'scale': Float(1.0)
    })).tag(sync=True, to_json=scene_to_json)
    # compress = Bool(False).tag(sync=False)

    def __init__(self, obj=None, position=(0.0, 0.0, 0.0), scale=1.0, **kwargs):
        scene = to_scene(obj)
        serialized = serialize_scene(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        # self.compress = compress
        self.scenes = [{
            'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
            'data': serialized,
            'scene': scene,
            'position': position,
            'scale':  scale
        }]

        super().__init__(**kwargs)

    # TODO: avoid re-sending all scenes after a scene was added.
    # - Partially syncing a state is not available out of the box
    # - Dynamic traits are discouraged: https://github.com/ipython/traitlets/issues/585
    def add(self, obj, position=(0, 0, 0), scale=1.0):
        scene = to_scene(obj)
        serialized = serialize_scene(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        self.scenes.append({
            'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
            'data': serialized,
            'scene': scene,
            'position': position,
            'scale':  scale
        })
        self.send_state('scenes')

    def set_scenes(self, objs, scales=1., positions=(0., 0., 0.)):
        scenes = []
        for i, obj in enumerate(objs):
            scene = to_scene(obj)
            serialized = serialize_scene(scene)
            scenes.append({
                'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
                'data': serialized,
                'scene': scene,
                'position': positions[i] if type(positions) == list else (0., 0., 0.),
                'scale':  scales[i] if type(scales) == list else 1.
            })
        self.scenes = scenes


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

    __trees = []
    __filename = None
    __do_abort = False

    units = Unit
    derivationLength = Int(0, min=0).tag(sync=True)
    unit = UseEnum(Unit, default_value=Unit.none).tag(sync=True, to_json=lambda e, o: e.value)
    scene = Dict(traits={
        'data': Bytes(),
        'scene': Instance(pgl.Scene),
        'derivationStep': Int(0, min=0),
        'id': Int(0, min=0)
    }).tag(sync=True, to_json=scene_to_json)
    animate = Bool(False).tag(sync=True)
    dump = Unicode('').tag(sync=False)
    is_magic = Bool(False).tag(sync=True)
    progress = Float(0.0).tag(sync=True)

    __editor = None
    __lp = None
    __codes = []
    __derivationStep = 0
    __in_queue = 0
    __out_queue = 0
    __lsystem = None
    __extra_context = {}

    def __init__(self, filename=None, code=None, unit=Unit.none, animate=False, dump='', context={}, lp=None, **kwargs):

        if filename:
            if filename.endswith('.lpy'):
                self.__filename = filename
            else:
                self.__filename = str(filename) + '.lpy'

        if not self.__filename and not code:
            raise ValueError('Neither lpy file nor code provided')

        self.__lsystem = lpy.Lsystem()
        self.__extra_context = context
        self.__lp = lp
        code_ = ''
        if self.__filename and Path(self.__filename).is_file():
            with io.open(self.__filename, 'r') as file:
                code_ = file.read()
        else:
            self.is_magic = True
            code_ = code

        self.__codes = code_.split(lpy.LpyParsing.InitialisationBeginTag)
        self.__codes.insert(1, f'\n{lpy.LpyParsing.InitialisationBeginTag}\n')

        self.unit = unit
        self.animate = animate
        self.dump = dump
        self.on_msg(self.__on_custom_msg)

        if not isinstance(self.__lp, LsystemParameters):
            self.__initialize_parameters()
        self.__initialize_lsystem()
        self.__set_scene(0)

        super().__init__(**kwargs)

    @property
    def editor(self):
        if not self.is_magic:
            self.__editor = ParameterEditor(self.__lp, filename=self.__filename.split('.lpy')[0] + '.json')
            self.__editor.on_lpy_context_change = self.set_parameters
            return self.__editor
        else:
            return None

    def __initialize_parameters(self):
        self.__lp = LsystemParameters()
        if not self.is_magic:
            json_filename = self.__filename.split('.lpy')[0] + '.json'
            if Path(json_filename).exists():
                with io.open(json_filename, 'r') as file:
                    self.__lp.load(file)
            else:
                self.__lp.retrieve_from(lpy.Lsystem(self.__filename))
            self.__lp.filename = json_filename

    def get_lstring(self):
        if self.__derivationStep < len(self.__trees):
            return lpy.Lstring(self.__trees[self.__derivationStep])
        return lpy.Lstring()

    def get_namespace(self):
        result = {}
        result.update(self.__lsystem.context().globals())
        return result

    def set_parameters(self, parameters):
        """Update Lsystem parameters in context.

        Parameters
        ----------
        parameters : json
            A valid parameter json string.
        """

        if not self.animate:
            lp = LsystemParameters()
            try:
                lp.loads(parameters)
            except AssertionError:
                return False
            self.__in_queue = self.__in_queue + 1
            self.progress = self.__out_queue / self.__in_queue
            self.send_state('progress')

            self.__lsystem.clear()
            self.__lsystem.set(''.join([
                self.__codes[0],
                lp.generate_py_code()
            ]), self.__extra_context)
            self.derivationLength = self.__lsystem.derivationLength + 1
            self.__trees = []
            self.__trees.append(self.__lsystem.axiom)
            self.__derivationStep = self.__derivationStep if self.__derivationStep < self.derivationLength else self.derivationLength - 1
            self.__derive(self.__derivationStep)

            self.__out_queue = self.__out_queue + 1
            self.progress = self.__out_queue / self.__in_queue
            if self.progress == 1:
                self.__out_queue = self.__in_queue = 0

            return True

        return False

    def __initialize_lsystem(self):
        self.__lsystem.clear()
        self.__lsystem.filename = self.__filename if self.__filename else ''
        self.__lsystem.set(''.join([
            self.__codes[0],
            self.__lp.generate_py_code()
        ]), self.__extra_context)
        self.__derivationStep = 0
        self.derivationLength = self.__lsystem.derivationLength + 1
        self.__trees = [self.__lsystem.axiom]

    def __on_custom_msg(self, widget, content, buffers):
        if 'derive' in content:
            step = content['derive']
            if step < self.derivationLength:
                if step < len(self.__trees):
                    self.__set_scene(step)
                else:
                    self.__derive(step)
        elif 'rewind' in content:
            self.__rewind()

    def __rewind(self):
        self.__initialize_lsystem()
        self.__set_scene(0)

    def __set_scene(self, step):
        # print('__set_scene', step, self.__trees)
        scene = self.__lsystem.sceneInterpretation(self.__trees[step])
        serialized = serialize_scene(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        serialized_scene = {
            'data': serialized,
            'scene': scene,
            'derivationStep': step,
            'id': step
        }
        self.__derivationStep = step
        self.scene = serialized_scene
        if len(self.dump) > 0:
            os.makedirs(self.dump, exist_ok=True)
            file_type = 'bgeom'
            with io.open(os.path.join(self.dump, f'{self.__filename}_{step}.{file_type}'), 'wb') as file:
                file.write(zlib.decompress(serialized))

    def __derive(self, step):
        if step < self.derivationLength:
            while True:
                # print('__derive', step)
                if step == len(self.__trees) - 1:
                    self.__set_scene(step)
                    break
                else:
                    self.__trees.append(self.__lsystem.derive(self.__trees[-1], len(self.__trees), 1))
        else:
            raise ValueError(f'derivation step {step} out of Lsystem bounds')
