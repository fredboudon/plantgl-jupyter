[Prefix="PGL::"]
interface Color3 {
    void Color3();
    octet getRed();
    octet getGreen();
    octet getBlue();
};

[Prefix="PGL::"]
interface BoundingBox {
    void BoundingBox();
    float getXMin();
    float getYMin();
    float getZMin();
    float getXMax();
    float getYMax();
    float getZMax();
};

[Prefix="PGL::"]
interface Material {
    void Material();
    [Ref] Color3 getAmbient();
    [Ref] Color3 getSpecular();
    [Ref] Color3 getEmission();
    float getDiffuse();
    float getShininess();
    float getTransparency();
};

[Prefix="PGLJS::"]
interface TriangleSet {
    void TriangleSet();

    boolean isInstanced();
    unsigned long noOfInstances();

    unsigned long indexSize();
    unsigned long pointSize();
    // unsigned long normalSize();
    unsigned long colorSize();
    unsigned long instanceMatrixSize();

    VoidPtr indexData();
    VoidPtr pointData();
    // VoidPtr normalData();
    VoidPtr colorData();
    VoidPtr instanceMatrixData();
    Material getMaterialForInstance(unsigned long i);
    attribute boolean hasMaterialPerInstance;

};

[Prefix="PGLJS::"]
interface Tesselator {
    void Tesselator(DOMString filename);
    unsigned long trianglesSize();
    TriangleSet trianglesAt(unsigned long i);
    BoundingBox bbox();
};
