"""
TODO: Add module docstring
"""

from ipywidgets.widgets import register, DOMWidget
from traitlets import Unicode, List, Float, Bool, observe

from ._frontend import module_name, module_version

@register
class CurveEditorWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('CurveEditorWidgetModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('CurveEditorWidgetView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    name = Unicode().tag(sync=True)
    control_points = List(trait=List(trait=Float(), minlen=2, maxlen=2)).tag(sync=True)
    is_function = Bool(False).tag(sync=True)

    def __init__(self, name, control_points, is_function=False, **kwargs):
        self.name = name
        self.control_points = control_points
        self.is_function = is_function
        super().__init__(**kwargs)

    # @observe('control_points')
    # def on_control_points_changed(self, change):
    #     print(change)
