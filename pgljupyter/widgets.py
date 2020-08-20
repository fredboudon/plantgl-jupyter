"""
TODO: Add module docstring
"""

import random
import string
import io
import os
import inspect
import textwrap
import zlib
import json
from enum import Enum
from pathlib import Path

from ipywidgets.widgets import DOMWidget, register
from traitlets import (
    Unicode, Instance,
    Bytes, Int, Float, Tuple, Dict, Bool, List, UseEnum
)

import openalea.plantgl.all as pgl
import openalea.lpy as lpy

from .editors import ParameterEditor, make_default_lpy_context
from ._frontend import module_name, module_version


class Unit(Enum):
    m = 0
    dm = 1
    cm = 2
    mm = 3


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


# TODO: serialize in thread?
def scene_to_bytes(scene):
    # serialized = pgl_scene_to_bytes(scene, single_mesh)
    # if not serialized.status:
    #     raise ValueError('scene serialization failed')
    return zlib.compress(pgl.tobinarystring(scene, False), 9)


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

    scenes = List(trait=Dict(traits={
        'id': Unicode(),
        'data': Bytes(),
        'scene': Instance(pgl.Scene),
        'position': Tuple(Float(0), Float(0), Float(0)),
        'scale': Float(1)
    })).tag(sync=True, to_json=scene_to_json)
    # compress = Bool(False).tag(sync=False)

    def __init__(self, obj=None, position=(0, 0, 0), scale=(1.0), **kwargs):
        scene = to_scene(obj)
        serialized = scene_to_bytes(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
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
        serialized = scene_to_bytes(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
        self.scenes.append({
            'id': ''.join(random.choices(string.ascii_letters + string.digits, k=25)),
            'data': serialized,
            'scene': scene,
            'position': position,
            'scale':  scale
        })
        self.send_state('scenes')


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

    __visualparameters = []
    __scalars = []
    __trees = []
    __filename = ''
    __do_abort = False

    units = Unit
    derivationLength = Int(0, min=0).tag(sync=True)
    unit = UseEnum(Unit).tag(sync=True, to_json=lambda e, o: e.value)
    scene = Dict(traits={
        'data': Bytes(),
        'scene': Instance(pgl.Scene),
        'derivationStep': Int(0, min=0),
        'id': Int(0, min=0)
    }).tag(sync=True, to_json=scene_to_json)
    animate = Bool(False).tag(sync=True)
    dump = Unicode('').tag(sync=False)
    __editor = None
    __codes = []
    __derivationStep = 0
    __lsystem = None

    def __init__(self, filename, options={}, unit=Unit.m, animate=False, dump='', **kwargs):
        self.__filename = filename if filename.endswith('.lpy') else filename + '.lpy'
        self.__lsystem = lpy.Lsystem()
        with io.open(self.__filename, 'r') as file:
            self.__codes = file.read().split(lpy.LpyParsing.InitialisationBeginTag)
            self.__codes.insert(1, f'\n{lpy.LpyParsing.InitialisationBeginTag}\n')
        if len(self.__codes) < 2:
            raise ValueError('No L-Py code found')
        # if a json file with the same name is present load context from the json file
        if Path(self.__filename[0:-3] + 'json').is_file():
            self.__editor = ParameterEditor(self.__filename[0:-3] + 'json')
            self.__editor.on_lpy_context_change = self.__on_lpy_context_change
            self.__on_lpy_context_change(self.__editor.lpy_context)
        else:
            self.__initialize_lsystem()
            self.__set_scene(0)

        self.unit = unit
        self.animate = animate
        self.dump = dump
        self.on_msg(self.__on_custom_msg)

        super().__init__(**kwargs)

    @property
    def editor(self):
        filename = self.__filename[0:-3] + 'json'
        if self.__editor is None and not Path(filename).exists():
            lpy_context = make_default_lpy_context()
            if ParameterEditor.validate_schema(lpy_context):
                with io.open(filename, 'w') as file:
                    file.write(json.dumps(lpy_context, indent=4))
                self.__editor = ParameterEditor(filename)
                self.__editor.on_lpy_context_change = self.__on_lpy_context_change
        return self.__editor

    def __initialize_lsystem(self):
        self.__lsystem.filename = self.__filename
        self.__lsystem.set(''.join(self.__codes), {})
        self.derivationLength = self.__lsystem.derivationLength
        self.__trees = []
        self.__trees.append(self.__lsystem.axiom)

    def __on_lpy_context_change(self, context_obj):
        if not self.animate:
            self.__codes[2] = self.__initialisation_function(context_obj)
            self.__lsystem.clear()
            self.__lsystem.filename = self.__filename
            self.__lsystem.set(''.join(self.__codes), {})
            self.derivationLength = self.__lsystem.derivationLength
            self.__trees = []
            self.__trees.append(self.__lsystem.axiom)
            self.__derivationStep = self.__derivationStep if self.__derivationStep < self.derivationLength else self.derivationLength - 1
            self.__derive(self.__derivationStep)

    def __initialisation_function(self, context_obj):
        def build_context(context_obj, context):
            for key, value in context_obj.items():
                if isinstance(value, dict):
                    if key == 'scalars':
                        for name, scalar in value.items():
                            context[name] = scalar['value']
                    elif key == 'materials':
                        for name, material in value.items():
                            m = dict(material)
                            index = m.pop('index')
                            context[name] = pgl.Material(**m)
                            context.turtle.setMaterial(index, context[name])
                    elif key == 'functions':
                        for name, function in value.items():
                            if 'NurbsCurve2D' in function:
                                points = function['NurbsCurve2D']
                                context[name] = pgl.QuantisedFunction(
                                    pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in points]))
                                )
                    elif key == 'curves':
                        for name, curve in value.items():
                            if 'NurbsCurve2D' in curve:
                                points = curve['NurbsCurve2D']
                                context[name] = pgl.NurbsCurve2D(pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in points]))

        codes = [
            '\n__lpy_code_version__ = 1.1',
            f'\ndef {lpy.LsysContext.InitialisationFunctionName}(context):',
            '\n    import openalea.plantgl.all as pgl',
            f'\n{textwrap.indent(textwrap.dedent(inspect.getsource(build_context)), "    ")}',
            f'\n    context_obj={str(context_obj)}',
            '\n    build_context(context_obj, context)'
        ]

        return ''.join(codes)

    # @observe('animate')
    # def on_animate_changed(self, change):
    #     # print('on_animate_changed', change['old'], change['new'])
    #     if change['old'] and not change['new']:
    #         print('__do_abort')
    #         # __do_abort = True

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
        self.__lsystem.clear()
        self.__derivationStep = 0
        with io.open(self.__filename, 'r') as file:
            self.__codes = file.read().split(lpy.LpyParsing.InitialisationBeginTag)
            self.__codes.insert(1, f'\n{lpy.LpyParsing.InitialisationBeginTag}\n')
        if len(self.__codes) < 2:
            raise ValueError('No L_Py code found')
        if self.__editor is not None:
            self.__on_lpy_context_change(self.__editor.lpy_context)
        elif Path(self.__filename[0:-3] + 'json').is_file():
            self.__editor = ParameterEditor(self.__filename[0:-3] + 'json')
            self.__editor.on_lpy_context_change = self.__on_lpy_context_change
            self.__on_lpy_context_change(self.__editor.lpy_context)
        else:
            self.__initialize_lsystem()
            self.__set_scene(0)

    def __set_scene(self, step):
        # print('__set_scene', step)
        scene = self.__lsystem.sceneInterpretation(self.__trees[step])
        serialized = scene_to_bytes(scene)  # bytes(scene_to_draco(scene, True).data) if self.compress else scene_to_bytes(scene)
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
