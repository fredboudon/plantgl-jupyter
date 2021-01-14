#include "pgljs.h"

#include <plantgl/algo/base/tesselator.h>
#include <plantgl/scenegraph/geometry/box.h>
#include <plantgl/scenegraph/geometry/boundingbox.h>
#include <plantgl/scenegraph/geometry/amapsymbol.h>
#include <plantgl/scenegraph/geometry/asymmetrichull.h>
#include <plantgl/scenegraph/geometry/beziercurve.h>
#include <plantgl/scenegraph/geometry/bezierpatch.h>
#include <plantgl/scenegraph/geometry/box.h>
#include <plantgl/scenegraph/geometry/cone.h>
#include <plantgl/scenegraph/geometry/cylinder.h>
#include <plantgl/scenegraph/geometry/elevationgrid.h>
#include <plantgl/scenegraph/geometry/extrudedhull.h>
#include <plantgl/scenegraph/geometry/faceset.h>
#include <plantgl/scenegraph/geometry/frustum.h>
#include <plantgl/scenegraph/geometry/extrusion.h>
#include <plantgl/scenegraph/geometry/group.h>
#include <plantgl/scenegraph/geometry/nurbscurve.h>
#include <plantgl/scenegraph/geometry/nurbspatch.h>
#include <plantgl/scenegraph/geometry/paraboloid.h>
#include <plantgl/scenegraph/geometry/pointset.h>
#include <plantgl/scenegraph/geometry/polyline.h>
#include <plantgl/scenegraph/geometry/quadset.h>
#include <plantgl/scenegraph/geometry/revolution.h>
#include <plantgl/scenegraph/geometry/swung.h>
#include <plantgl/scenegraph/geometry/sphere.h>
#include <plantgl/scenegraph/geometry/triangleset.h>
#include <plantgl/scenegraph/geometry/disc.h>
#include <plantgl/scenegraph/geometry/text.h>
#include <plantgl/scenegraph/transformation/ifs.h>
#include <plantgl/scenegraph/transformation/eulerrotated.h>
#include <plantgl/scenegraph/transformation/axisrotated.h>
#include <plantgl/scenegraph/transformation/oriented.h>
#include <plantgl/scenegraph/transformation/scaled.h>
#include <plantgl/scenegraph/transformation/tapered.h>
#include <plantgl/scenegraph/transformation/translated.h>
#include <plantgl/scenegraph/transformation/ifs.h>
#include <plantgl/scenegraph/appearance/monospectral.cpp>
#include <plantgl/scenegraph/appearance/multispectral.cpp>
#include <plantgl/scenegraph/scene/inline.h>
#include <plantgl/algo/codec/scne_binaryparser.h>
#include <plantgl/math/util_matrix.h>

#include <iostream>

namespace PGLJS
{

TriangleSet::TriangleSet(TriangleSetPtr triangleSet, PGL::MaterialPtr material) :
    _triangleSet(triangleSet) {
        // _triangleSet->computeNormalList(true);
        // instancesColors.push_back(PGL::Color3(red, green, blue));
        instancesMaterials.push_back(material);
    };
TriangleSet::TriangleSet() {};

TriangleSet::~TriangleSet() {
    instancesColors.clear();
    instancesMaterials.clear();
    if (_indexData) delete[] _indexData;
    if (_pointData) delete[] _pointData;
    // if (_normalData) delete[] _normalData;
    if (_colorData) delete[] _colorData;
    if (_instanceMatrixData) delete[] _instanceMatrixData;
};

bool TriangleSet::isInstanced() {
    return (bool)(instances.size() - 1);
}

uint32_t TriangleSet::noOfInstances() {
    return instances.size();
}

PGL::Material* TriangleSet::getMaterialForInstance(uint_t i) {
    return instancesMaterials.at(i).get();
}

uint32_t TriangleSet::indexSize() {
    return _triangleSet->getIndexListSize() * 3;
};

uint32_t TriangleSet::pointSize() {
    return _triangleSet->getPointListSize() * 3;
};

// uint32_t TriangleSet::normalSize() {
//     return _triangleSet->getNormalList()->size() * 3;
// };

uint32_t TriangleSet::colorSize() {
    // vertex colors in threejs instanced geometry not possible out of the box
    return isInstanced() ? instances.size() * 3 : pointSize();
};

uint32_t TriangleSet::instanceMatrixSize() {
    return instances.size() * 16;
};

uint32_t* TriangleSet::indexData() {
    if (_indexData) return _indexData;
    _indexData = _triangleSet->getIndexList()->data();
    return _indexData;
};

real_t* TriangleSet::pointData() {
    if (_pointData) return _pointData;
    if (isInstanced()) {
        _pointData =_triangleSet->getPointList()->data();
    } else {
        PGL::Transformation3DPtr transform(new PGL::Transform4(instances.at(0)));
        PGL::TriangleSetPtr transformed = dynamic_pointer_cast<PGL::TriangleSet>(_triangleSet->transform(transform)).get();
        _pointData = transformed->getPointList()->data();
    }
    return _pointData;
};

// real_t* TriangleSet::normalData() {
//     if (_normalData) return _normalData;
//     _normalData = _triangleSet->getNormalList()->data();
//     return _normalData;
// };

uchar_t* TriangleSet::colorData() {
    if (_colorData) return _colorData;

    uchar_t* _colorData = new uchar_t[colorSize()];

    if (isInstanced()) {
        uint_t size = instancesColors.size();
        for (uint_t i = 0; i < size; i++) {
            PGL::Color3 color = instancesColors.at(i);
            uchar_t red = color.getRed();
            uchar_t green = color.getGreen();
            uchar_t blue = color.getBlue();
            _colorData[i * 3 + 0] = red;
            _colorData[i * 3 + 1] = green;
            _colorData[i * 3 + 2] = blue;
        }
    } else {
        // TODO: Implement color per vertex
        uint_t size = _triangleSet->getPointListSize();
        PGL::Color3 color = instancesColors.at(0);
        uchar_t red = color.getRed();
        uchar_t green = color.getGreen();
        uchar_t blue = color.getBlue();
        for (uint_t i = 0; i < size; i++) {
            _colorData[i * 3 + 0] = red;
            _colorData[i * 3 + 1] = green;
            _colorData[i * 3 + 2] = blue;
        }
    }

    return _colorData;
};

real_t* TriangleSet::instanceMatrixData() {

    if (_instanceMatrixData) return _instanceMatrixData;
    uint_t size = instances.size();
    real_t* _instanceMatrixData = new real_t[size * 16];

    for (uint_t i = 0; i < size; i++) {
        real_t* m = instances.at(i).getData();
        for (uint_t j = 0; j < 16; j++) {
            _instanceMatrixData[i * 16 + j] = *(m++);
        }
    }

    return _instanceMatrixData;
};

#define GEOM_ASSERT_OBJ(obj)

#define CHECK_APPEARANCE(app) \
    if (__appearance.get() == (PGL::Appearance *)app) return true;

#define UPDATE_APPEARANCE(app) \
    __appearance = PGL::AppearancePtr(app);


template<class T>
bool Tesselator::discretize(T *geom) {
    GEOM_ASSERT_OBJ(geom);
    bool b = false;

    DiscretizerCache::Iterator it = __discretizer_cache.find((uint_t)geom->getObjectId());
    if (it != __discretizer_cache.end()) {
        b = it->second->apply(*this);
    } else {
        if (__appearance && __appearance->isTexture())
        __discretizer.computeTexCoord(true);
        else __discretizer.computeTexCoord(false);
        b = geom->apply(__discretizer);
        if (b && (b = (__discretizer.getDiscretization()))) {
        __discretizer_cache.insert((uint_t)geom->getObjectId(), __discretizer.getDiscretization());
        b = __discretizer.getDiscretization()->apply(*this);
        }
    }
    return b;
}

template<class T>
bool Tesselator::tesselate(T *geom) {
    GEOM_ASSERT_OBJ(geom);
    bool b = false;
    if (__appearance && __appearance->isTexture())
        __tesselator.computeTexCoord(true);
    else __tesselator.computeTexCoord(false);
    b = geom->apply(__tesselator);
    if (b && (b = (__tesselator.getDiscretization()))) {
        b = __tesselator.getDiscretization()->apply(*this);
    }
    return b;
}

#define DISCRETIZE(geom) \
    return discretize(geom); \

#define TESSELATE(geom) \
    return tesselate(geom) \

#define  PUSH_MODELMATRIX __modelmatrix.push();

#define  POP_MODELMATRIX __modelmatrix.pop();

/* ----------------------------------------------------------------------- */


Tesselator::Tesselator(const std::string& filename) :
    Action(),
    __discretizer(),
    __tesselator(),
    __appearance()
{

    PGL::BinaryParser parser(std::cout);
    if (parser.parse(filename)) {
        PGL::Scene* scene = parser.getScene();
        scene->apply(*this);
        PGL::BBoxComputer bboxComputer(__tesselator);
        bboxComputer.process(scene);
        __bbox = bboxComputer.getBoundingBox();
    }

}

Tesselator::~Tesselator() {
    __discretizer_cache.clear();
    for (auto t : triangles) {
        delete t;
    }
    triangles.clear();
}

bool Tesselator::beginProcess()
{
    __discretizer_cache.clear();
    for (auto t : triangles) {
        delete t;
    }
    triangles.clear();
    return true;
}

bool Tesselator::endProcess()
{
    return true;
}

bool Tesselator::process(PGL::Shape* shape) {
    GEOM_ASSERT_OBJ(shape);
    processAppereance(shape);
    return processGeometry(shape);
}

bool Tesselator::processAppereance(PGL::Shape* shape) {
    GEOM_ASSERT(shape);
    if (shape->appearance) {
        return shape->appearance->apply(*this);
    } else return PGL::Material::DEFAULT_MATERIAL->apply(*this);
}

bool Tesselator::processGeometry(PGL::Shape* shape) {
    GEOM_ASSERT(shape);
    //SERIALIZER_DISCRETIZE(shape);
    return shape->geometry->apply(*this);
}

bool Tesselator::process(PGL::Inline* inlined) {
    GEOM_ASSERT_OBJ(inline);
    if (inlined->getScene()) {
        if (!inlined->isTranslationToDefault() || !inlined->isScaleToDefault()) {
            PUSH_MODELMATRIX;
            const PGL::Vector3 _trans = inlined->getTranslation();
            __modelmatrix.translate(_trans);
            const PGL::Vector3 _scale = inlined->getScale();
            __modelmatrix.scale(_scale);
        }

        bool _result = true;
        for (PGL::Scene::iterator _i = inlined->getScene()->begin();
            _i != inlined->getScene()->end();
            _i++) {
        if (!(*_i)->applyAppearanceFirst(*this)) _result = false;
        };

        if (!inlined->isTranslationToDefault() || !inlined->isScaleToDefault()) {
        POP_MODELMATRIX;
        }

        return _result;
    }
    else
        return false;
}

bool Tesselator::process(PGL::AmapSymbol* amapSymbol) {
    GEOM_ASSERT_OBJ(amapSymbol);
    TESSELATE(amapSymbol);
}

bool Tesselator::process(PGL::AsymmetricHull* asymmetricHull) {
    DISCRETIZE(asymmetricHull);
}

bool Tesselator::process(PGL::AxisRotated* axisRotated) {
    GEOM_ASSERT_OBJ(axisRotated);

    const PGL::Vector3 &axis = axisRotated->getAxis();
    const real_t &angle = axisRotated->getAngle();

    PUSH_MODELMATRIX;

    __modelmatrix.axisRotation(axis, angle);
    axisRotated->getGeometry()->apply(*this);

    POP_MODELMATRIX;

    return true;
}

bool Tesselator::process(PGL::BezierCurve* bezierCurve) {
    DISCRETIZE(bezierCurve);
}

bool Tesselator::process(PGL::BezierPatch* bezierPatch) {
    DISCRETIZE(bezierPatch);
}

bool Tesselator::process(PGL::Box* box) {
    DISCRETIZE(box);
}

bool Tesselator::process(PGL::Cone* cone) {
     DISCRETIZE(cone);
}

bool Tesselator::process(PGL::Cylinder* cylinder) {
    DISCRETIZE(cylinder);
}

bool Tesselator::process(PGL::ElevationGrid* elevationGrid) {
     DISCRETIZE(elevationGrid);
}

bool Tesselator::process(PGL::EulerRotated* eulerRotated) {
    GEOM_ASSERT_OBJ(eulerRotated);

    PUSH_MODELMATRIX;

    __modelmatrix.eulerRotationZYX(eulerRotated->getAzimuth(),
                                eulerRotated->getElevation(),
                                eulerRotated->getRoll());
    eulerRotated->getGeometry()->apply(*this);

    POP_MODELMATRIX;
    return true;
}

bool Tesselator::process(PGL::ExtrudedHull* extrudedHull) {
     DISCRETIZE(extrudedHull);
}

bool Tesselator::process(PGL::FaceSet* faceSet) {
      TESSELATE(faceSet);
}

bool Tesselator::process(PGL::Frustum* frustum) {
     DISCRETIZE(frustum);
}

bool Tesselator::process(PGL::Extrusion* extrusion) {
     DISCRETIZE(extrusion);
}

bool Tesselator::process(PGL::Group* group) {
    GEOM_ASSERT_OBJ(group);
    return group->getGeometryList()->apply(*this);
    }

bool Tesselator::process(PGL::IFS* ifs) {
    GEOM_ASSERT_OBJ(ifs);

    PGL::ITPtr transfos;
    transfos = dynamic_pointer_cast<PGL::IT>(ifs->getTransformation());
    GEOM_ASSERT(transfos);
    const PGL::Matrix4ArrayPtr &matrixList = transfos->getAllTransfo();
    GEOM_ASSERT(matrixList);

    PGL::Matrix4Array::const_iterator matrix = matrixList->begin();
    while (matrix != matrixList->end()) {
        PUSH_MODELMATRIX;

        __modelmatrix.transform(*matrix);
        ifs->getGeometry()->apply(*this);

        POP_MODELMATRIX;
        matrix++;
    }

    return true;
}

bool Tesselator::process(PGL::Material* material) {
    GEOM_ASSERT_OBJ(material);

    __material = PGL::MaterialPtr(material);

    // __red = int(material->getAmbient().getRed());
    // __green = int(material->getAmbient().getGreen());
    // __blue = int(material->getAmbient().getBlue());

    return true;
}

bool Tesselator::process(PGL::ImageTexture* texture) {
    GEOM_ASSERT_OBJ(texture);

    CHECK_APPEARANCE(texture);

    __material = PGL::MaterialPtr(new PGL::Material());

    return true;
}

bool Tesselator::process(PGL::Texture2D* texture) {
    GEOM_ASSERT_OBJ(texture);

    CHECK_APPEARANCE(texture);

    const PGL::Color4 color = texture->getBaseColor();
    __material = PGL::MaterialPtr(new PGL::Material(PGL::Color3(color[0], color[1], color[2])));

    return true;
}

bool Tesselator::process(PGL::Texture2DTransformation* texturetransfo) {
    GEOM_ASSERT_OBJ(texturetransfo);

    return true;
}

bool Tesselator::process(PGL::MonoSpectral* monoSpectral) {
    GEOM_ASSERT_OBJ(monoSpectral);

    CHECK_APPEARANCE(monoSpectral);
    UPDATE_APPEARANCE(monoSpectral);

    return true;
}

bool Tesselator::process(PGL::MultiSpectral* multiSpectral) {
    GEOM_ASSERT_OBJ(multiSpectral);

    CHECK_APPEARANCE(multiSpectral);
    UPDATE_APPEARANCE(multiSpectral);

    return true;
}

bool Tesselator::process(PGL::NurbsCurve* nurbsCurve) {
     DISCRETIZE(nurbsCurve);
}

bool Tesselator::process(PGL::NurbsPatch* nurbsPatch) {
     DISCRETIZE(nurbsPatch);
}

bool Tesselator::process(PGL::Oriented* oriented) {
    GEOM_ASSERT_OBJ(oriented);

    PUSH_MODELMATRIX;

    PGL::Matrix4TransformationPtr _basis;
    _basis = dynamic_pointer_cast<PGL::Matrix4Transformation>(oriented->getTransformation());
    GEOM_ASSERT(_basis);

    __modelmatrix.transform(_basis->getMatrix());

    oriented->getGeometry()->apply(*this);

    POP_MODELMATRIX;

    return true;
}

bool Tesselator::process(PGL::Paraboloid* paraboloid) {
    DISCRETIZE(paraboloid);
}

bool Tesselator::process(PGL::PointSet* pointSet) {
    GEOM_ASSERT_OBJ(pointSet);
    // TODO ?
    return false;
}

bool Tesselator::process(PGL::Polyline* polyline) {
    GEOM_ASSERT_OBJ(polyline);
    // TODO ?
    return true;
}

bool Tesselator::process(PGL::QuadSet* quadSet) {
    GEOM_ASSERT_OBJ(quadSet);
    TESSELATE(quadSet);
}

bool Tesselator::process(PGL::Revolution* revolution) {
    GEOM_ASSERT_OBJ(revolution);
    DISCRETIZE(revolution);
}

bool Tesselator::process(PGL::Swung* swung) {
    DISCRETIZE(swung);
}

bool Tesselator::process(PGL::Scaled* scaled) {
    GEOM_ASSERT_OBJ(scaled);

    PUSH_MODELMATRIX;

    __modelmatrix.scale(scaled->getScale());
    scaled->getGeometry()->apply(*this);

    POP_MODELMATRIX;

    return true;
}

bool Tesselator::process(PGL::ScreenProjected* scp) {
    GEOM_ASSERT_OBJ(scp);
    return false;
}

bool Tesselator::process(PGL::Sphere* sphere) {
    DISCRETIZE(sphere);
}

bool Tesselator::process(PGL::Tapered* tapered) {
    GEOM_ASSERT_OBJ(tapered);

    PGL::PrimitivePtr _primitive = tapered->getPrimitive();
    if (_primitive->apply(__discretizer)) {
        PGL::ExplicitModelPtr _explicit = __discretizer.getDiscretization();

        PGL::Transformation3DPtr _taper(tapered->getTransformation());
        PGL::ExplicitModelPtr _tExplicit = _explicit->transform(_taper);
        _tExplicit->apply(*this);

        return true;
    }

    return false;
}

bool Tesselator::process(PGL::Translated* translated) {
    GEOM_ASSERT_OBJ(translated);

    PUSH_MODELMATRIX;

    __modelmatrix.translate(translated->getTranslation());
    translated->getGeometry()->apply(*this);

    POP_MODELMATRIX;

    return true;
}

bool Tesselator::process(PGL::TriangleSet* triangleSet)
{

    GEOM_ASSERT_OBJ(triangleSet);

    size_t id = triangleSet->getObjectId();
    std::map<size_t, TriangleSet*>::iterator it = triangleMap.find(id);

    if (it == triangleMap.end()) {
        // PGL::Transformation3DPtr transform(new PGL::Transform4(__modelmatrix.getMatrix()));
        // PGL::TriangleSetPtr set = dynamic_pointer_cast<PGL::TriangleSet>(triangleSet->transform(transform)).get();
        auto set = new TriangleSet(triangleSet, __material);
        triangles.push_back(set);
        set->instances.push_back(__modelmatrix.getMatrix());
        triangleMap.insert(std::pair<const size_t, TriangleSet*>(id, set));
    } else {
        if (!it->second->hasMaterialPerInstance) {
            PGL::Material* m0 = it->second->instancesMaterials.at(0).get();
            it->second->hasMaterialPerInstance = !(m0->isSimilar(*__material.get()));
        }
        // std::cout << "instance of " << id << std::endl;
        it->second->instances.push_back(__modelmatrix.getMatrix());
        // it->second->instancesColors.push_back(PGL::Color3(__red, __green, __blue));
        it->second->instancesMaterials.push_back(__material);
    }

    return true;

}

bool Tesselator::process(PGL::BezierCurve2D* bezierCurve) {
     DISCRETIZE(bezierCurve);
}

bool Tesselator::process(PGL::Disc* disc) {
    DISCRETIZE(disc);
}

bool Tesselator::process(PGL::NurbsCurve2D* nurbsCurve) {
    DISCRETIZE(nurbsCurve);
}

bool Tesselator::process(PGL::PointSet2D* pointSet) {
    DISCRETIZE(pointSet);
}

bool Tesselator::process(PGL::Polyline2D* polyline) {
     DISCRETIZE(polyline);
}

bool Tesselator::process(PGL::Text* text) {
    GEOM_ASSERT_OBJ(text);
    return false;
}

bool Tesselator::process(PGL::Font* font) {
    GEOM_ASSERT_OBJ(font);
    return false;
}


}
