from IPython.core.magic_arguments import magic_arguments, argument, parse_argstring
from IPython.core.magic import (
    Magics, magics_class, cell_magic, line_magic, needs_local_scope
)
from ipywidgets import HBox, Layout

from openalea.lpy import Lsystem
from openalea.lpy.lsysparameters import LsystemParameters
from openalea.lpy.parameters.scalar import (
    IntegerScalar, FloatScalar, BoolScalar, BaseScalar
)
import openalea.plantgl.all as pgl

from .widgets import SceneWidget, LsystemWidget
from .editors import (
    CurveEditor, FloatEditor, IntEditor, BoolEditor
)


@magics_class
class PGLMagics(Magics):

    @cell_magic
    @needs_local_scope
    @magic_arguments()
    @argument('--size', '-s', default='400,400', type=str, help='Width and hight of the canvas')
    @argument('--world', '-w', default=1.0, type=float, help='Size of the 3d scene in meters')
    @argument('--unit', '-u', default='m', type=str, help='Unit of the model - m, dm, cm, mm')
    @argument('--params', '-p', default='', type=str, help='Name of LsystemParameters instance with a "default" category')
    @argument('--animate', '-a', type=bool, help='Animate Lsystem')
    def lpy(self, line, cell, local_ns):

        args = parse_argstring(self.lpy, line)
        sizes = [int(i.strip()) for i in args.size.split(',')]
        world = args.world
        unit = args.unit
        lp = local_ns[args.params] if args.params and args.params in local_ns and isinstance(local_ns[args.params], LsystemParameters) else None
        animate = args.animate if args.animate is not None else False
        context = local_ns

        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        code = ''.join([
            cell,
            lp.generate_py_code() if lp else ''
        ])

        lsw = LsystemWidget(None, code=code, size_display=size_display, size_world=world, unit=unit, animate=animate, context=context)
        editors = []
        context = {}

        def on_param_changed(param):
            def fn(change):
                if 'new' in change:
                    if isinstance(param, BaseScalar):
                        param.value = change['new']
                    elif isinstance(param, tuple):
                        if isinstance(param[1], (pgl.NurbsCurve2D, pgl.BezierCurve2D)):
                            param[1].ctrlPointList = pgl.Point3Array([pgl.Vector3(p[0], p[1], 1) for p in change['new']])
                        elif isinstance(param[1], pgl.Polyline2D):
                            param[1].pointList = pgl.Point3Array([pgl.Vector2(p[0], p[1]) for p in change['new']])

                    lsw.set_parameters(lp.dumps())
            return fn

        if lp:
            for param in lp.category_parameters('default'):
                editor = None
                if isinstance(param, IntegerScalar):
                    editor = IntEditor(
                        param.value,
                        name=param.name,
                        min=param.minvalue,
                        max=param.maxvalue,
                        step=1,
                        no_name=True
                    )
                elif isinstance(param, FloatScalar):
                    editor = FloatEditor(
                        param.value,
                        name=param.name,
                        min=param.minvalue,
                        max=param.maxvalue,
                        step=1/10**param.precision,
                        no_name=True
                    )
                elif isinstance(param, BoolScalar):
                    editor = BoolEditor(
                        param.value,
                        name=param.name,
                        no_name=True
                    )
                elif isinstance(param, tuple):
                    manager, value = param
                    if isinstance(value, pgl.NurbsCurve2D):
                        editor = CurveEditor(
                            name=value.name,
                            points=[[v[0], v[1]] for v in value.ctrlPointList],
                            type='NurbsCurve2D',
                            no_name=True
                        )
                    elif isinstance(value, pgl.BezierCurve2D):
                        editor = CurveEditor(
                            name=value.name,
                            points=[[v[0], v[1]] for v in value.ctrlPointList],
                            type='BezierCurve2D',
                            no_name=True
                        )
                    elif isinstance(value, pgl.Polyline2D):
                        editor = CurveEditor(
                            name=value.name,
                            points=[[v[0], v[1]] for v in value.pointList],
                            type='Polyline2D',
                            no_name=True
                        )
                if editor:
                    editor.observe(on_param_changed(param), 'value')
                    editors.append(editor)

        w, h = lsw.size_display
        if len(editors):
            return HBox((
                HBox([lsw], layout=Layout(min_width=str(w)+'px', min_height=str(h)+'px')),
                HBox(editors, layout=Layout(margin='0', flex_flow='row wrap'))
            ))

        return lsw

    @line_magic
    @magic_arguments()
    @argument('file', type=str, help='L-Py file path')
    @argument('--size', '-s', default='400,400', type=str, help='Width and hight of the canvas')
    @argument('--cell', '-c', default=1., type=float, help='Size of cell for a single derivation step')
    def lpy_plot(self, line):

        from math import ceil, sqrt, floor

        try:
            ip = get_ipython()
        except NameError:
            ip = None

        args = parse_argstring(self.lpy_plot, line)
        file = args.file
        sizes = [int(i.strip()) for i in args.size.split(',')]

        cell = args.cell
        size_display = (int(sizes[0]), int(sizes[1])) if len(sizes) > 1 else (int(sizes[0]), int(sizes[0]))

        ls = Lsystem(file)
        rows = cols = ceil(sqrt(ls.derivationLength + 1))
        size = rows * cell
        start = -size/2 + cell/2
        sw = SceneWidget(size_display=size_display, size_world=size)
        sw.add(ls.sceneInterpretation(ls.axiom), position=(start, start, 0))

        def plot():
            tree = ls.axiom
            for i in range(1, ls.derivationLength):
                row = floor(i / rows)
                col = (i - row * cols)
                x = row * cell + start
                y = col * cell + start
                tree = ls.derive(tree, i, 1)
                sw.add(ls.sceneInterpretation(tree), (x, y, 0))
            ip.events.unregister('post_run_cell', plot)

        if ip:
            ip.events.register('post_run_cell', plot)

        return sw
