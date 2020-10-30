export const enum LsystemUnit {
    NONE = -1,
    M = 0,
    DM = 1,
    CM = 2,
    MM = 3
}

export const SCALES: {[key:number]: number} = {
    [LsystemUnit.NONE]: 1,
    [LsystemUnit.M]: 1,
    [LsystemUnit.DM]: 0.1,
    [LsystemUnit.CM]: 0.01,
    [LsystemUnit.MM]: 0.001
};

export const enum CurveType {
    NURBS = 'NurbsCurve2D',
    BEZIER = 'BezierCurve2D',
    POLY_LINE = 'Polyline2D'
}
