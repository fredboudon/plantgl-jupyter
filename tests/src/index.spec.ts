// TODO: Fix tests - e.g. tsconfig rootdir problem

import expect from 'expect.js';

import {
  createTestModel
} from './utils.spec';

import {
  SceneWidgetModel, SceneWidgetView
} from '../../src/'


describe('SceneWidget', () => {

  describe('SceneWidgetModel', () => {

    it('should be createable', () => {
      let model = createTestModel(SceneWidgetModel);
      expect(model).to.be.an(SceneWidgetModel);
    });

    it('should be createable with a value', () => {
      let state = { plane: false }
      let model = createTestModel(SceneWidgetModel, state);
      expect(model).to.be.an(SceneWidgetModel);
      expect(model.get('plane')).to.be(false);
    });

  });

});
