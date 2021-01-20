"""
TODO: Add module docstring
"""

import io
import json
import re
from enum import Enum

from ipywidgets.widgets import (
    register, DOMWidget,  VBox, HBox, Layout, Accordion, Dropdown, Button,
    Text, ColorPicker, Checkbox, IntSlider, FloatSlider, BoundedIntText
)
from traitlets import Unicode, List, Float, Bool, Int
from openalea.lpy.lsysparameters import (
    IntegerScalar, FloatScalar, BoolScalar, BaseScalar
)
import openalea.plantgl.all as pgl

from ._frontend import module_name, module_version

_property_name_regex = re.compile('^[^\\d\\W]\\w*\\Z')


def make_scalar_editor(scalar, no_name=False):

    editor = None

    if isinstance(scalar, IntegerScalar):
        editor = IntEditor(
            scalar.value,
            name=scalar.name,
            min=scalar.minvalue,
            max=scalar.maxvalue,
            step=1,
            no_name=no_name
        )
    elif isinstance(scalar, FloatScalar):
        editor = FloatEditor(
            scalar.value,
            name=scalar.name,
            min=scalar.minvalue,
            max=scalar.maxvalue,
            step=1/10**scalar.precision,
            no_name=no_name
        )
    elif isinstance(scalar, BoolScalar):
        editor = BoolEditor(
            scalar.value,
            name=scalar.name,
            no_name=no_name
        )

    return editor


def make_color_editor(color, index, no_name=False):

    editor = None

    if isinstance(color, pgl.Material):
        editor = MaterialEditor(
            index=index,
            name=color.name,
            ambient=[color.ambient.red, color.ambient.green, color.ambient.blue],
            specular=[color.specular.red, color.specular.green, color.specular.blue],
            emission=[color.emission.red, color.emission.green, color.emission.blue],
            diffuse=color.diffuse,
            transparency=color.transparency,
            shininess=color.shininess,
            no_name=no_name
        )

    return editor


def make_curve_editor(param, no_name=False):

    editor = None
    manager, value = param

    if isinstance(value, pgl.NurbsCurve2D):
        editor = CurveEditor(
            name=value.name,
            points=[[v[0], v[1]] for v in value.ctrlPointList],
            type=CurveType.NURBS_CURVE_2D.value,
            no_name=no_name,
            is_function=manager.typename == 'Function'
        )
    elif isinstance(value, pgl.BezierCurve2D):
        editor = CurveEditor(
            name=value.name,
            points=[[v[0], v[1]] for v in value.ctrlPointList],
            type=CurveType.BEZIER_CURVE_2D.value,
            no_name=no_name,
            is_function=manager.typename == 'Function'
        )
    elif isinstance(value, pgl.Polyline2D):
        editor = CurveEditor(
            name=value.name,
            points=[[v[0], v[1]] for v in value.pointList],
            type=CurveType.POLYLINE_2D.value,
            no_name=no_name
        )

    return editor


class CurveType(Enum):
    NURBS_CURVE_2D = 'NurbsCurve2D'
    BEZIER_CURVE_2D = 'BezierCurve2D'
    POLYLINE_2D = 'Polyline2D'


@register
class _Editor(HBox):
    """TODO: Add docstring here
    """
    _model_name = Unicode('_EditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('_EditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __text = None

    name = Unicode('').tag(sync=False)

    def __init__(self, name, validator=None, no_name=False, **kwargs):
        self.name = name
        self.__validator = validator if validator is not None else lambda x: True
        self.__text = Text(name, description='name')
        self.__text.continuous_update = False
        self.__text.observe(self.__on_name_changed, names='value')
        if no_name:
            kwargs['children'] = kwargs['children']
        else:
            kwargs['children'] = (self.__text, *kwargs['children'])
        kwargs['layout'] = Layout(margin='10px 10px')
        super().__init__(**kwargs)

    def __on_name_changed(self, change):
        if self.__validator(self.__text.value):
            self.name = self.__text.value
        else:
            self.__text.unobserve(self.__on_name_changed, names='value')
            self.__text.value = change['old']
            self.__text.observe(self.__on_name_changed, names='value')


@register
class _CurveEditor(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('_CurveEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('_CurveEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    name = Unicode('').tag(sync=True)
    show_name = Bool(False).tag(sync=True)
    type = Unicode('').tag(sync=True)
    points = List(trait=List(trait=Float(), minlen=2, maxlen=2), minlen=2).tag(sync=True)
    is_function = Bool(False).tag(sync=True)

    def __init__(self, type, points, is_function=False, **kwargs):
        self.name = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else ''
        self.show_name = 'no_name' in kwargs and kwargs['no_name']
        self.type = type
        self.points = points
        self.is_function = is_function
        super().__init__(**kwargs)


@register
class CurveEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('CurveEditorModel').tag(sync=True)
    _view_name = Unicode('CurveEditorView').tag(sync=True)

    __curve_editor = None
    __validator = None

    value = List(trait=List(trait=Float(), minlen=2, maxlen=2), minlen=2).tag(sync=False)

    def __init__(self, **kwargs):
        self.__curve_editor = _CurveEditor(**kwargs)
        self.__curve_editor.observe(self.__on_curve_changed, names='points')
        kwargs['children'] = [
            self.__curve_editor
        ]
        super().__init__(**kwargs)

    def __on_curve_changed(self, change):
        self.value = self.__curve_editor.points

    @property
    def _curve_type(self):
        return self.__curve_editor.curve_type


@register
class FloatEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('FloatEditorModel').tag(sync=True)
    _view_name = Unicode('FloatEditorView').tag(sync=True)

    __slider = None
    __min_ipt = None
    __max_ipt = None
    __step_ipt = None
    __type = ''

    value = Float(0).tag(sync=False)
    min = Float(0).tag(sync=False)
    max = Float(0).tag(sync=False)
    step = Float(0).tag(sync=False)

    def __init__(self, value, type='Float', min=1, max=10, step=1, **kwargs):

        self.value = float(value)
        description = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else 'value'
        self.__slider = FloatSlider(value, min=min, max=max, step=step, description=description, continuous_update=False)
        # self.__min_ipt = FloatText(min, description='min')
        # self.__max_ipt = FloatText(max, description='max')
        # self.__step_ipt = BoundedFloatText(step, description='step', min=0.01, max=1, step=step)

        self.__slider.observe(self.__on_slider_changed, names='value')
        # self.__min_ipt.observe(self.__on_min_changed, names='value')
        # self.__max_ipt.observe(self.__on_max_changed, names='value')
        # self.__step_ipt.observe(self.__on_step_changed, names='value')

        kwargs['children'] = [
            self.__slider,
            # self.__min_ipt,
            # self.__max_ipt,
            # self.__step_ipt
        ]
        super().__init__(**kwargs)

    # def __on_min_changed(self, change):
    #     if self.__min_ipt.value < self.__slider.max:
    #         self.__slider.min = self.__min_ipt.value
    #     else:
    #         self.__min_ipt.value = self.__slider.max - self.__step_ipt.value
    #     self.min = self.__min_ipt.value

    # def __on_max_changed(self, change):
    #     if self.__max_ipt.value > self.__slider.min:
    #         self.__slider.max = self.__max_ipt.value
    #     else:
    #         self.__max_ipt.value = self.__slider.min + self.__step_ipt.value
    #     self.max = self.__max_ipt.value

    # def __on_step_changed(self, change):
    #     self.__slider.step = self.__step_ipt.value
    #     self.step = self.__step_ipt.value

    def __on_slider_changed(self, change):
        self.value = self.__slider.value


@register
class IntEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('IntEditorModel').tag(sync=True)
    _view_name = Unicode('IntEditorView').tag(sync=True)

    __slider = None
    __min_ipt = None
    __max_ipt = None
    __step_ipt = None

    value = Int(0).tag(sync=False)
    min = Int(0).tag(sync=False)
    max = Int(0).tag(sync=False)
    step = Int(0).tag(sync=False)

    def __init__(self, value, type='Float', min=1, max=10, step=1, **kwargs):

        self.value = int(value)
        description = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else 'value'
        self.__slider = IntSlider(value, min, max, description=description, continuous_update=False)
        # self.__min_ipt = IntText(min, description='min')
        # self.__max_ipt = IntText(max, description='max')
        # self.__step_ipt = BoundedIntText(step, description='step', min=1, step=step)

        self.__slider.observe(self.__on_slider_changed, names='value')
        # self.__min_ipt.observe(self.__on_min_changed, names='value')
        # self.__max_ipt.observe(self.__on_max_changed, names='value')
        # self.__step_ipt.observe(self.__on_step_changed, names='value')

        kwargs['children'] = [
            self.__slider,
            # self.__min_ipt,
            # self.__max_ipt,
            # self.__step_ipt
        ]
        super().__init__(**kwargs)

    # def __on_min_changed(self, change):
    #     if self.__min_ipt.value < self.__slider.max:
    #         self.__slider.min = self.__min_ipt.value
    #     else:
    #         self.__min_ipt.value = self.__slider.max - self.__step_ipt.value
    #     self.min = self.__min_ipt.value

    # def __on_max_changed(self, change):
    #     if self.__max_ipt.value > self.__slider.min:
    #         self.__slider.max = self.__max_ipt.value
    #     else:
    #         self.__max_ipt.value = self.__slider.min + self.__step_ipt.value
    #     self.max = self.__max_ipt.value

    # def __on_step_changed(self, change):
    #     self.__slider.step = self.__step_ipt.value
    #     self.step = self.__step_ipt.value

    def __on_slider_changed(self, change):
        self.value = self.__slider.value


@register
class BoolEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('BoolEditorModel').tag(sync=True)
    _view_name = Unicode('BoolEditorView').tag(sync=True)

    __checkbox = None

    value = Bool(False).tag(sync=False)

    def __init__(self, value, **kwargs):
        self.value = value
        description = kwargs['name'] if 'no_name' in kwargs and kwargs['no_name'] else 'value'
        self.__checkbox = Checkbox(value, description=description)
        self.__checkbox.observe(self.__on_checkbox_changed, names='value')
        kwargs['children'] = [
            self.__checkbox
        ]
        super().__init__(**kwargs)

    def __on_checkbox_changed(self, change):
        self.value = change['new']


@register
class StringEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('StringEditorModel').tag(sync=True)
    _view_name = Unicode('StringEditorView').tag(sync=True)

    __text = None

    value = Unicode('').tag(sync=False)

    def __init__(self, value, **kwargs):
        self.value = value
        self.__text = Text(value, description='value')
        self.__text.continuous_update = False
        self.__text.observe(self.__on_text_changed, names='value')
        kwargs['children'] = [
            self.__text
        ]
        super().__init__(**kwargs)

    def __on_text_changed(self, change):
        self.value = change['new']


@register
class MaterialEditor(_Editor):
    """TODO: Add docstring here
    """
    _model_name = Unicode('MaterialEditorModel').tag(sync=True)
    _view_name = Unicode('MaterialEditorView').tag(sync=True)

    __text = None
    __index = None
    __ambient = None
    __specular = None
    __emission = None
    __diffuse = None
    __transparency = None
    __shininess = None
    __validator = None

    index = Int().tag(sync=False)
    ambient = List().tag(sync=False)
    specular = List().tag(sync=False)
    emission = List().tag(sync=False)
    diffuse = Float().tag(sync=False)
    transparency = Float().tag(sync=False)
    shininess = Float().tag(sync=False)

    def __init__(self, index, ambient=[80, 80, 80], specular=[40, 40, 40], emission=[0, 0, 0], diffuse=1, transparency=0, shininess=0.2, **kwargs):
        self.index = index
        self.ambient = ambient
        self.specular = specular
        self.emission = emission
        self.diffuse = diffuse
        self.transparency = transparency
        self.shininess = shininess
        self.__index = BoundedIntText(value=index, description='index', min=0)
        self.__ambient = ColorPicker(value='#' + ''.join(format(v, "02x") for v in ambient), description='ambient')
        self.__specular = ColorPicker(value='#' + ''.join(format(v, "02x") for v in specular), description='specular')
        self.__emission = ColorPicker(value='#' + ''.join(format(v, "02x") for v in emission), description='emission')
        self.__diffuse = FloatSlider(value=diffuse, description='diffuse', min=0, max=3, continuous_update=False)
        self.__transparency = FloatSlider(value=transparency, description='transparency', min=0, max=1, continuous_update=False)
        self.__shininess = FloatSlider(value=shininess, description='shininess', min=0, max=1, continuous_update=False)
        self.__index.observe(self.__on_index_changed, names='value')
        self.__ambient.observe(self.__on_ambient_changed, names='value')
        self.__specular.observe(self.__on_specular_changed, names='value')
        self.__emission.observe(self.__on_emission_changed, names='value')
        self.__diffuse.observe(self.__on_diffuse_changed, names='value')
        self.__transparency.observe(self.__on_transparency_changed, names='value')
        self.__shininess.observe(self.__on_shininess_changed, names='value')

        kwargs['children'] = [
            self.__index,
            self.__ambient,
            self.__specular,
            self.__emission,
            self.__diffuse,
            self.__transparency,
            self.__shininess
        ]

        super().__init__(**kwargs)

    def __rgb_to_list(self, rgb):
        return [255, 0, 0] if len(rgb) != 7 else [int(v, 16) for v in [rgb[1:][i:i+2] for i in range(0, 6, 2)]]

    def __on_index_changed(self, change):
        self.index = self.__index.value

    def __on_ambient_changed(self, change):
        self.ambient = self.__rgb_to_list(self.__ambient.value)

    def __on_specular_changed(self, change):
        self.specular = self.__rgb_to_list(self.__specular.value)

    def __on_emission_changed(self, change):
        self.emission = self.__rgb_to_list(self.__emission.value)

    def __on_diffuse_changed(self, change):
        self.diffuse = self.__diffuse.value

    def __on_transparency_changed(self, change):
        self.transparency = self.__transparency.value

    def __on_shininess_changed(self, change):
        self.shininess = self.__shininess.value


class ParameterEditor(VBox):
    """TODO: Add docstring here
    """

    filename = ''

    _model_name = Unicode('ParameterEditorModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('ParameterEditorView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    __auto_apply = False
    __auto_save = False
    __accordion = None
    __auto_apply_cbx = None
    __auto_save_cbx = None
    __apply_btn = None
    __save_btn = None
    __add_category_btn = None
    __add_category_txt = None

    __lp = None

    def __init__(self, lp, filename='', **kwargs):

        self.__lp = lp
        self.filename = filename
        self.__accordion = Accordion()
        self.__auto_apply_cbx = Checkbox(description='Auto apply')
        self.__auto_save_cbx = Checkbox(description='Auto save')
        self.__apply_btn = Button(description='Apply changes')
        self.__save_btn = Button(description='Save changes')
        self.__add_category_btn = Button(description='Add category')
        self.__add_category_txt = Text(placeholder='category name')
        self.__initialize()

        super().__init__([VBox([
            HBox([
                HBox((self.__apply_btn, self.__auto_apply_cbx)),
                HBox((self.__save_btn, self.__auto_save_cbx)),
                HBox((self.__add_category_btn, self.__add_category_txt))
            ], layout=Layout(flex_flow='row wrap', margin='5px')),
            self.__accordion
        ], layout=Layout(margin='5px'))], **kwargs)

    def dumps(self):
        return self.__lp.dumps()

    def __initialize(self):
        if self.__lp.is_valid():
            children, titles = self.__build_gui()
            accordion = Accordion(children)
            for i, title in enumerate(titles):
                accordion.set_title(i, title)
            self.__accordion = accordion

            self.__auto_apply_cbx.observe(self.__on_auto_apply_cbx_change, names='value')
            self.__auto_save_cbx.observe(self.__on_auto_save_cbx_change, names='value')
            self.__apply_btn.on_click(lambda x: self.on_lpy_context_change(self.__lp.dumps()))
            self.__save_btn.on_click(lambda x: self.__save())
            self.__add_category_btn.on_click(lambda x: self.__add_category(self.__add_category_txt.value.strip()))

    def __add_category(self, name):
        if not name or name in self.__lp.get_category_names():
            return

        item_layout = Layout(
            margin='20px',
            flex_flow='row wrap'
        )
        acc = self.__accordion
        box_scalars = HBox(layout=item_layout)
        box_curves = HBox(layout=item_layout)

        acc.children = (*self.__accordion.children, VBox([
            self.__menu('scalars', box_scalars, name),
            box_scalars,
            self.__menu('curves', box_curves, name),
            box_curves
        ]))
        acc.set_title(len(acc.children) - 1, name)
        self.__lp.add_category(name)
        if self.__auto_save:
            self.__save()

    def __on_auto_apply_cbx_change(self, change):
        self.__auto_apply = change['owner'].value
        self.__apply_btn.disabled = self.__auto_apply
        if self.__auto_apply:
            self.on_lpy_context_change(self.__lp.dumps())

    def __on_auto_save_cbx_change(self, change):
        self.__auto_save = change['owner'].value
        self.__save_btn.disabled = self.__auto_save
        if self.__auto_save:
            self.__save()

    def on_lpy_context_change(self, context):
        pass

    def __build_gui(self):

        children = []
        titles = ['materials']
        item_layout = Layout(
            margin='20px',
            flex_flow='row wrap'
        )

        if self.__lp:

            box_materials = HBox(layout=item_layout)

            for index, color in self.__lp.get_colors().items():
                editor = make_color_editor(color, index, no_name=True)
                if editor:
                    editor.observe(self.__on_editor_changed(color))
                    box_materials.children = (*box_materials.children, editor)

            children.append(
                VBox([
                    self.__menu('materials', box_materials),
                    box_materials
                ])
            )

            for category_name in self.__lp.get_category_names():

                box_scalars = HBox(layout=item_layout)
                box_curves = HBox(layout=item_layout)

                for scalar in self.__lp.get_category_scalars(category_name):

                    editor = make_scalar_editor(scalar, False)
                    if editor:
                        editor.observe(self.__on_editor_changed(scalar))
                        box_scalars.children = (*box_scalars.children, editor)

                for param in self.__lp.get_category_graphicalparameters(category_name):

                    editor = make_curve_editor(param, False)
                    if editor:
                        editor.observe(self.__on_editor_changed(param))
                        box_curves.children = (*box_curves.children, editor)

                children.append(VBox([
                    self.__menu('scalars', box_scalars, category_name),
                    box_scalars,
                    self.__menu('curves', box_curves, category_name),
                    box_curves
                ]))
                titles.append(category_name)

        return (children, titles)

    def __menu(self, parameter_type, box, category_name=None):

        btn_add = Button(description='Add')
        ddn_add = Dropdown()

        if parameter_type == 'scalars':

            def fn_add(self):

                value = None

                if ddn_add.value == 'Integer':
                    value = 1
                elif ddn_add.value == 'Float':
                    value = 1.0
                elif ddn_add.value == 'Bool':
                    value = True

                name = f'{ddn_add.value}_{len(box.children)}'
                scalar = self.__lp.add_scalar(name, value, category=category_name)
                editor = make_scalar_editor(scalar)
                editor.observe(self.__on_editor_changed(scalar))
                box.children = (*box.children, editor)

                if self.__auto_save:
                    self.__save()
                if self.__auto_apply:
                    self.on_lpy_context_change(self.__lp.dumps())

            ddn_add.options = ['Integer', 'Float', 'Bool']

        elif parameter_type == 'materials':

            def fn_add(self):

                index = max(self.__lp.get_colors().keys()) + 1 if len(self.__lp.get_colors().keys()) else 0

                self.__lp.set_color(index, pgl.Material(ambient=(80, 80, 80), diffuse=1))
                editor = make_color_editor(self.__lp.get_color(index), index, no_name=True)
                editor.observe(self.__on_editor_changed(self.__lp.get_color(index)))
                box.children = (*box.children, editor)

                if self.__auto_save:
                    self.__save()
                if self.__auto_apply:
                    self.on_lpy_context_change(self.__lp.dumps())

            ddn_add.options = ['Color']

        elif parameter_type == 'curves':

            def fn_add(self):

                name = f'{ddn_add.value}_{len(box.children)}'
                if ddn_add.value == 'Function':
                    curve = self.__lp.add_function(name, category=category_name)
                else:
                    curve = self.__lp.add_curve(name, category=category_name)
                editor = make_curve_editor(curve)
                editor.observe(self.__on_editor_changed(curve))
                box.children = (*box.children, editor)

                if self.__auto_save:
                    self.__save()
                if self.__auto_apply:
                    self.on_lpy_context_change(self.__lp.dumps())

            ddn_add.options = ['Curve', 'Function']

        btn_add.on_click(lambda x: fn_add(self))

        return HBox((btn_add, ddn_add))

    def __validate_name(self, name):
        if not _property_name_regex.match(name):
            return False
        if name in self.lpy_context:
            return False
        for key in self.lpy_context.keys():
            if name in self.lpy_context[key]:
                return False
        return True

    def __save(self):
        if self.filename:
            params = self.__lp.dumps()
            with io.open(self.filename, 'w') as file:
                file.write(json.dumps(json.loads(params), indent=4))

    def __on_editor_changed(self, param):

        def on_param_changed(change):
            if 'new' in change:
                value = change['new']
                name = change['name']
                if isinstance(param, BaseScalar):
                    if name == 'name':
                        param.name = value
                    else:
                        param.value = value
                elif isinstance(param, tuple):
                    if name == 'value':
                        if isinstance(param[1], (pgl.NurbsCurve2D, pgl.BezierCurve2D)):
                            param[1].ctrlPointList = pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in value])
                        elif isinstance(param[1], pgl.Polyline2D):
                            param[1].pointList = pgl.Point2Array([pgl.Vector2(p[0], p[1]) for p in value])
                    else:
                        param[1].name = value
                if self.__auto_apply:
                    self.on_lpy_context_change(self.__lp.dumps())
                if self.__auto_save:
                    self.__save()

        def on_material_changed(change):
            if 'new' in change:
                if change['name'] == 'index':
                    self.__lp.unset_color(change['old'])
                    self.__lp.set_color(change['new'], param)
                else:
                    setattr(param, change['name'], change['new'])

                if self.__auto_apply:
                    self.on_lpy_context_change(self.__lp.dumps())
                if self.__auto_save:
                    self.__save()

        return on_material_changed if isinstance(param, pgl.Material) else on_param_changed
