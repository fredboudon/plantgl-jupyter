[Prefix="PGLJS::"]
interface TriangleSet {
    void TriangleSet();

    boolean isInstanced();

    unsigned long indexSize();
    unsigned long pointSize();
    unsigned long normalSize();
    unsigned long colorSize();
    unsigned long instanceMatrixSize();

    VoidPtr indexData();
    VoidPtr pointData();
    VoidPtr normalData();
    VoidPtr colorData();
    VoidPtr instanceMatrixData();

};

[Prefix="PGLJS::"]
interface Tesselator {
    void Tesselator(DOMString filename);
    unsigned long trianglesSize();
    TriangleSet trianglesAt(unsigned long i);
};
