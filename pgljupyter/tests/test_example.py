import pytest

from ..widget import SceneWidget


def test_example_creation_blank():
    w = SceneWidget()
    assert w.plane == True
