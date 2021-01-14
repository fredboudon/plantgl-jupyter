#include <map>

#include <plantgl/algo/base/tesselator.h>
#include <plantgl/algo/base/discretizer.h>
#include <plantgl/scenegraph/scene/scene.h>
#include <plantgl/scenegraph/core/action.h>
#include <plantgl/algo/base/matrixcomputer.h>
#include <plantgl/algo/base/bboxcomputer.h>

namespace PGLJS
{

class TriangleSet {
    public:
        TriangleSet(PGL::TriangleSetPtr triangleSet, PGL::MaterialPtr material);
        TriangleSet();
        ~TriangleSet();

        bool isInstanced();
        uint32_t noOfInstances();

        uint32_t indexSize();
        uint32_t pointSize();
        // uint32_t normalSize();
        uint32_t colorSize();
        uint32_t instanceMatrixSize();

        uint32_t* indexData();
        real_t* pointData();
        // real_t* normalData();
        uchar_t* colorData();
        real_t* instanceMatrixData();

        PGL::Material* getMaterialForInstance(uint_t i);

        bool hasMaterialPerInstance = false;
        std::vector<PGL::Matrix4> instances;
        std::vector<PGL::Color3> instancesColors;
        std::vector<PGL::MaterialPtr> instancesMaterials;

    private:
        PGL::TriangleSetPtr _triangleSet;
        uint32_t* _indexData = nullptr;
        real_t* _pointData = nullptr;
        // real_t* _normalData = nullptr;
        uchar_t* _colorData = nullptr;
        real_t* _instanceMatrixData = nullptr;
};

class Tesselator : public PGL::Action
{

    public:

        Tesselator(const std::string& filename);
        virtual ~Tesselator();

        uint_t trianglesSize() {
            return triangles.size();
        }

        TriangleSet* trianglesAt(uint_t i) {
            return triangles.at(i);
        }

        PGL::BoundingBox* bbox() {
            return __bbox.get();
        }

        virtual bool beginProcess();
        virtual bool endProcess();

        virtual bool process(PGL::Shape* shape);
        virtual bool processAppereance(PGL::Shape* shape);
        virtual bool processGeometry(PGL::Shape* shape);

        virtual bool process(PGL::Inline* geomInline);
        virtual bool process(PGL::Material* material );
        virtual bool process(PGL::MonoSpectral* monoSpectral );
        virtual bool process(PGL::MultiSpectral* multiSpectral );
        virtual bool process(PGL::Texture2D* texture );
        virtual bool process(PGL::ImageTexture* texture );
        virtual bool process(PGL::Texture2DTransformation* texturetransformation );
        virtual bool process(PGL::AmapSymbol* amapSymbol);
        virtual bool process(PGL::AsymmetricHull* asymmetricHull);
        virtual bool process(PGL::AxisRotated* axisRotated);
        virtual bool process(PGL::BezierCurve* bezierCurve);
        virtual bool process(PGL::BezierPatch* bezierPatch);
        virtual bool process(PGL::Box* box);
        virtual bool process(PGL::Cone* cone);
        virtual bool process(PGL::Cylinder* cylinder);
        virtual bool process(PGL::ElevationGrid* elevationGrid);
        virtual bool process(PGL::EulerRotated* eulerRotated);
        virtual bool process(PGL::ExtrudedHull* extrudedHull);
        virtual bool process(PGL::FaceSet* faceSet);
        virtual bool process(PGL::Frustum* frustum);
        virtual bool process(PGL::Extrusion* extrusion);
        virtual bool process(PGL::Group* group);
        virtual bool process(PGL::IFS* ifs);
        virtual bool process(PGL::NurbsCurve* nurbsCurve);
        virtual bool process(PGL::NurbsPatch* nurbsPatch);
        virtual bool process(PGL::Oriented* oriented);
        virtual bool process(PGL::Paraboloid* paraboloid);
        virtual bool process(PGL::PointSet* pointSet);
        virtual bool process(PGL::Polyline* polyline);
        virtual bool process(PGL::QuadSet* quadSet);
        virtual bool process(PGL::Revolution* revolution);
        virtual bool process(PGL::Swung* swung);
        virtual bool process(PGL::Scaled* scaled);
        virtual bool process(PGL::ScreenProjected* scp);
        virtual bool process(PGL::Sphere* sphere);
        virtual bool process(PGL::Tapered* tapered);
        virtual bool process(PGL::Translated* translated);
        virtual bool process(PGL::TriangleSet* triangleSet);
        virtual bool process(PGL::BezierCurve2D* bezierCurve);
        virtual bool process(PGL::Disc* disc);
        virtual bool process(PGL::NurbsCurve2D* nurbsCurve);
        virtual bool process(PGL::PointSet2D* pointSet);
        virtual bool process(PGL::Polyline2D* polyline);
        virtual bool process(PGL::Text* text);
        virtual bool process(PGL::Font* font);

    private:

        bool __single_mesh = false;
        std::vector<TriangleSet*> triangles;
        std::map<size_t, TriangleSet*> triangleMap;
        PGL::BoundingBoxPtr __bbox;

        typedef PGL::Cache<PGL::ExplicitModelPtr> DiscretizerCache;
        DiscretizerCache __discretizer_cache;

        PGL::Discretizer __discretizer;
        PGL::Tesselator __tesselator;
        PGL::AppearancePtr __appearance;

        PGL::MatrixStack __modelmatrix;
        PGL::MatrixStack __texturematrix;

        PGL::MaterialPtr __material;

        template<class T> bool discretize(T * geom);
        template<class T> bool tesselate(T * geom);
};

} // namespace PGLJS
