import {
    DOMWidgetModel, ISerializers
} from '@jupyter-widgets/base';
import { VBoxModel } from '@jupyter-widgets/controls';
import {
    MODULE_NAME, MODULE_VERSION
} from '../version';

import { LsystemUnit } from './interfaces';

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
            size_world: [10, 10, 10],
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
            unit: LsystemUnit.M,
            animate: false
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


export class IntEditorModel extends VBoxModel {
    defaults(): Backbone.ObjectHash {
        return {
            ...super.defaults(),
            _model_name: IntEditorModel.model_name,
            _model_module: IntEditorModel.model_module,
            _model_module_version: IntEditorModel.model_module_version,
            _view_name: IntEditorModel.view_name,
            _view_module: IntEditorModel.view_module,
            _view_module_version: IntEditorModel.view_module_version
        };
    }

    static model_name = 'IntEditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'IntEditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}


export class FloatEditorModel extends VBoxModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: FloatEditorModel.model_name,
            _model_module: FloatEditorModel.model_module,
            _model_module_version: FloatEditorModel.model_module_version,
            _view_name: FloatEditorModel.view_name,
            _view_module: FloatEditorModel.view_module,
            _view_module_version: FloatEditorModel.view_module_version
        };
    }

    static model_name = 'FloatEditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'FloatEditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class MaterialEditorModel extends VBoxModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: MaterialEditorModel.model_name,
            _model_module: MaterialEditorModel.model_module,
            _model_module_version: MaterialEditorModel.model_module_version,
            _view_name: MaterialEditorModel.view_name,
            _view_module: MaterialEditorModel.view_module,
            _view_module_version: MaterialEditorModel.view_module_version
        };
    }

    static model_name = 'MaterialEditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'MaterialEditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}

export class CurveEditorModel extends DOMWidgetModel {

    defaults() {
        return {
            ...super.defaults(),
            _model_name: CurveEditorModel.model_name,
            _model_module: CurveEditorModel.model_module,
            _model_module_version: CurveEditorModel.model_module_version,
            _view_name: CurveEditorModel.view_name,
            _view_module: CurveEditorModel.view_module,
            _view_module_version: CurveEditorModel.view_module_version,
            name: '',
            control_points: [],
            is_function: false,
            curve_type: ''
        };
    }

    static model_name = 'CurveEditorModel';
    static model_module = MODULE_NAME;
    static model_module_version = MODULE_VERSION;
    static view_name = 'CurveEditorView';
    static view_module = MODULE_NAME;
    static view_module_version = MODULE_VERSION;

}
