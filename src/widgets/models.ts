import {
    DOMWidgetModel, ISerializers
} from '@jupyter-widgets/base';

import {
    MODULE_NAME, MODULE_VERSION
} from '../version';

import { Unit } from './types';

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
            scene: null
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
            lsystem: {
                derivationLength: 0
            },
            scene: null,
            unit: Unit.m,
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
