import json
import os.path as osp

from ._version import __version__

from .widgets import SceneWidget, LsystemWidget
from .editors import ParameterEditor
from ._version import __version__, version_info
# from .nbextension import _jupyter_nbextension_paths
from .magics import PGLMagics

try:
    get_ipython().register_magics(PGLMagics)
except NameError:
    pass


with open(osp.join(osp.abspath(osp.dirname(__file__)), 'labextension', 'package.json')) as fid:
    data = json.load(fid)


def _jupyter_labextension_paths():
    return [{
        'src': 'labextension',
        'dest': data['name']
    }]
