import {
    DOMWidgetModel, ISerializers
} from '@jupyter-widgets/base';
import { VBoxModel } from '@jupyter-widgets/controls';
import {
    MODULE_NAME, MODULE_VERSION
} from '../version';

import { LsystemUnit } from './consts';

export class PGLWidgetModel extends DOMWidgetModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: PGLWidgetModel.model_name,
            _model_module: PGLWidgetModel.model_module,
            _model_module_version: PGLWidgetModel.model_module_version,
            _view_name: PGLWidgetModel.view_name,
            _view_module: PGLWidgetModel.view_module,
            _view_module_version: PGLWidgetModel.view_module_version,
            size_display: [400, 400],
            size_world: 1,
            axes_helper: false,
            light_helper: false,
            plane: true
        };
    }

    static model_name = 'PGLWidgetModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'PGLWidgetView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class SceneWidgetModel extends DOMWidgetModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: SceneWidgetModel.model_name,
            _model_module: SceneWidgetModel.model_module,
            _model_module_version: SceneWidgetModel.model_module_version,
            _view_name: SceneWidgetModel.view_name,
            _view_module: SceneWidgetModel.view_module,
            _view_module_version: SceneWidgetModel.view_module_version,
            scenes: null
        };
    }

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
        scenes: {
            serialize: (scenes, model) => {
                return Object.keys(model.views).length ? scenes : undefined;
            }, // async serialization?
            deserialize: scenes => scenes
        }
    }

    static model_name = 'SceneWidgetModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'SceneWidgetView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class LsystemWidgetModel extends DOMWidgetModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: LsystemWidgetModel.model_name,
            _model_module: LsystemWidgetModel.model_module,
            _model_module_version: LsystemWidgetModel.model_module_version,
            _view_name: LsystemWidgetModel.view_name,
            _view_module: LsystemWidgetModel.view_module,
            _view_module_version: LsystemWidgetModel.view_module_version,
            derivationLength: 0,
            scene: null,
            unit: LsystemUnit.NONE,
            animate: false,
            is_magic: false,
            progress: 0
        };
    }

    static serializers: ISerializers = {
        ...DOMWidgetModel.serializers,
        scene: {
            serialize: (scene, model) => {
                return Object.keys(model.views).length ? scene : undefined;
            }, // async serialization?
            deserialize: scene => scene
        }
    }

    static model_name = 'LsystemWidgetModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'LsystemWidgetView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class ParameterEditorModel extends VBoxModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: ParameterEditorModel.model_name,
            _model_module: ParameterEditorModel.model_module,
            _model_module_version: ParameterEditorModel.model_module_version,
            _view_name: ParameterEditorModel.view_name,
            _view_module: ParameterEditorModel.view_module,
            _view_module_version: ParameterEditorModel.view_module_version
        };
    }

    static model_name = 'ParameterEditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'ParameterEditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class _EditorModel extends VBoxModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: _EditorModel.model_name,
            _model_module: _EditorModel.model_module,
            _model_module_version: _EditorModel.model_module_version,
            _view_name: _EditorModel.view_name,
            _view_module: _EditorModel.view_module,
            _view_module_version: _EditorModel.view_module_version
        };
    }

    static model_name = '_EditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = '_EditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class BoolEditorModel extends _EditorModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: BoolEditorModel.model_name,
            _view_name: BoolEditorModel.view_name
        };
    }

    static model_name = 'BoolEditorModel';
    static view_name = 'BoolEditorView';

}

export class IntEditorModel extends _EditorModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: IntEditorModel.model_name,
            _view_name: IntEditorModel.view_name
        };
    }

    static model_name = 'IntEditorModel';
    static view_name = 'IntEditorView';

}

export class FloatEditorModel extends _EditorModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: FloatEditorModel.model_name,
            _view_name: FloatEditorModel.view_name
        };
    }

    static model_name = 'FloatEditorModel';
    static view_name = 'FloatEditorView';

}

export class StringEditorModel extends _EditorModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: StringEditorModel.model_name,
            _view_name: StringEditorModel.view_name
        };
    }

    static model_name = 'StringEditorModel';
    static view_name = 'StringEditorView';

}

export class MaterialEditorModel extends _EditorModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: MaterialEditorModel.model_name,
            _view_name: MaterialEditorModel.view_name
        };
    }

    static model_name = 'MaterialEditorModel';
    static view_name = 'MaterialEditorView';

}

export class CurveEditorModel extends _EditorModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: CurveEditorModel.model_name,
            _view_name: CurveEditorModel.view_name
        };
    }

    static model_name = 'CurveEditorModel';
    static view_name = 'CurveEditorView';

}

export class _CurveEditorModel extends DOMWidgetModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: _CurveEditorModel.model_name,
            _model_module: _CurveEditorModel.model_module,
            _model_module_version: _CurveEditorModel.model_module_version,
            _view_name: _CurveEditorModel.view_name,
            _view_module: _CurveEditorModel.view_module,
            _view_module_version: _CurveEditorModel.view_module_version,
            name: '',
            show_name: false,
            points: [],
            is_function: false,
            type: ''
        };
    }

    static model_name = '_CurveEditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = '_CurveEditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}
