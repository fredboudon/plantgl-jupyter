import * as THREE from 'three';
import { Vector2, Vector3, Vector4 } from 'three';

function flatToVector<T>(n, ipt: number[]): T[] {
    const out = [];
    const Vector = n === 2 ? Vector2 : (n === 3 ? Vector3 : Vector4);
    for (let index = 0; index < ipt.length; index+=n) {
        out.push(new Vector(...ipt.slice(index, index + n)));
    }
    return out;
}

function Polyline3(this:any, points, scales: Vector2[] ) {

    THREE.Curve.call( this );

    // points is an array of THREE.Vector3()

    this.points = points;
    this.scales = scales.map(vec => new Vector3(vec.x, vec.y, 1));

}

Polyline3.prototype = Object.create( THREE.Curve.prototype );
Polyline3.prototype.constructor = Polyline3;

// define the getPoint function for the subClass
Polyline3.prototype.getPoint = function ( t ) {

    // t is a float between 0 and 1

    var points = this.points;

    var d = ( points.length - 1 ) * t;

    var index1 = Math.floor( d );
    var index2 = ( index1 < points.length - 1 ) ? index1 + 1 : index1;

    var pt1 = points[ index1 ];
    var pt2 = points[ index2 ];

    const sc1 = this.scales[index1];
    const sc2 = this.scales[index2];

    var weight = d - index1;
    console.log('p', new THREE.Vector3().copy( pt1 ).lerp( pt2, weight ).toArray());
    console.log('s', new THREE.Vector3().copy( sc1 ).lerp( sc2, weight ));
    console.log('ps', new THREE.Vector3().copy( pt1 ).lerp( pt2, weight ).multiply(new THREE.Vector3().copy( sc1 ).lerp( sc2, weight )));

    return new THREE.Vector3().copy( pt1 ).lerp( pt2, weight ).multiply(new THREE.Vector3().copy( sc1 ).lerp( sc2, weight ));

};


Polyline3.prototype.getTangent = function ( t, optionalTarget ) {

    var delta = 0.0001;
    var t1 = t - delta;
    var t2 = t + delta;

    // Capping in case of danger

    if ( t1 < 0 ) t1 = 0;
    if ( t2 > 1 ) t2 = 1;

    var pt1 = this.getPoint( t1 );
    var pt2 = this.getPoint( t2 );

    var tangent = optionalTarget || ( ( pt1.isVector2 ) ? new Vector2() : new Vector3() );

    tangent.copy( pt2 ).sub( pt1 ).normalize();

    return tangent;

}

const NURBSUtils = {

    /*
    Finds knot vector span.

    p : degree
    u : parametric value
    U : knot vector

    returns the span
    */
    findSpan: function ( p, u, U ) {

        var n = U.length - p - 1;

        if ( u >= U[ n ] ) {

            return n - 1;

        }

        if ( u <= U[ p ] ) {

            return p;

        }

        var low = p;
        var high = n;
        var mid = Math.floor( ( low + high ) / 2 );

        while ( u < U[ mid ] || u >= U[ mid + 1 ] ) {

            if ( u < U[ mid ] ) {

                high = mid;

            } else {

                low = mid;

            }

            mid = Math.floor( ( low + high ) / 2 );

        }

        return mid;

    },


    /*
    Calculate basis functions. See The NURBS Book, page 70, algorithm A2.2

    span : span in which u lies
    u    : parametric point
    p    : degree
    U    : knot vector

    returns array[p+1] with basis functions values.
    */
    calcBasisFunctions: function ( span, u, p, U ) {

        var N = [];
        var left = [];
        var right = [];
        N[ 0 ] = 1.0;

        for ( var j = 1; j <= p; ++ j ) {

            left[ j ] = u - U[ span + 1 - j ];
            right[ j ] = U[ span + j ] - u;

            var saved = 0.0;

            for ( var r = 0; r < j; ++ r ) {

                var rv = right[ r + 1 ];
                var lv = left[ j - r ];
                var temp = N[ r ] / ( rv + lv );
                N[ r ] = saved + rv * temp;
                saved = lv * temp;

             }

             N[ j ] = saved;

         }

         return N;

    },


    /*
    Calculate B-Spline curve points. See The NURBS Book, page 82, algorithm A3.1.

    p : degree of B-Spline
    U : knot vector
    P : control points (x, y, z, w)
    u : parametric point

    returns point for given u
    */
    calcBSplinePoint: function ( p, U, P, u ) {

        var span = this.findSpan( p, u, U );
        var N = this.calcBasisFunctions( span, u, p, U );
        var C = new THREE.Vector4( 0, 0, 0, 0 );

        for ( var j = 0; j <= p; ++ j ) {

            var point = P[ span - p + j ];
            var Nj = N[ j ];
            var wNj = point.w * Nj;
            C.x += point.x * wNj;
            C.y += point.y * wNj;
            C.z += point.z * wNj;
            C.w += point.w * Nj;

        }

        return C;

    },


    /*
    Calculate basis functions derivatives. See The NURBS Book, page 72, algorithm A2.3.

    span : span in which u lies
    u    : parametric point
    p    : degree
    n    : number of derivatives to calculate
    U    : knot vector

    returns array[n+1][p+1] with basis functions derivatives
    */
    calcBasisFunctionDerivatives: function ( span, u, p, n, U ) {

        var zeroArr = [];
        for ( var i = 0; i <= p; ++ i )
            zeroArr[ i ] = 0.0;

        var ders = [];
        for ( var i = 0; i <= n; ++ i )
            ders[ i ] = zeroArr.slice( 0 );

        var ndu = [];
        for ( var i = 0; i <= p; ++ i )
            ndu[ i ] = zeroArr.slice( 0 );

        ndu[ 0 ][ 0 ] = 1.0;

        var left = zeroArr.slice( 0 );
        var right = zeroArr.slice( 0 );

        for ( var j = 1; j <= p; ++ j ) {

            left[ j ] = u - U[ span + 1 - j ];
            right[ j ] = U[ span + j ] - u;

            var saved = 0.0;

            for ( let r = 0; r < j; ++ r ) {

                var rv = right[ r + 1 ];
                var lv = left[ j - r ];
                ndu[ j ][ r ] = rv + lv;

                var temp = ndu[ r ][ j - 1 ] / ndu[ j ][ r ];
                ndu[ r ][ j ] = saved + rv * temp;
                saved = lv * temp;

            }

            ndu[ j ][ j ] = saved;

        }

        for ( var j = 0; j <= p; ++ j ) {

            ders[ 0 ][ j ] = ndu[ j ][ p ];

        }

        for (let r = 0; r <= p; ++ r ) {

            var s1 = 0;
            var s2 = 1;

            var a = [];
            for ( var i = 0; i <= p; ++ i ) {

                a[ i ] = zeroArr.slice( 0 );

            }

            a[ 0 ][ 0 ] = 1.0;

            for ( var k = 1; k <= n; ++ k ) {

                var d = 0.0;
                var rk = r - k;
                var pk = p - k;

                if ( r >= k ) {

                    a[ s2 ][ 0 ] = a[ s1 ][ 0 ] / ndu[ pk + 1 ][ rk ];
                    d = a[ s2 ][ 0 ] * ndu[ rk ][ pk ];

                }

                var j1 = ( rk >= - 1 ) ? 1 : - rk;
                var j2 = ( r - 1 <= pk ) ? k - 1 : p - r;

                for ( var j = j1; j <= j2; ++ j ) {

                    a[ s2 ][ j ] = ( a[ s1 ][ j ] - a[ s1 ][ j - 1 ] ) / ndu[ pk + 1 ][ rk + j ];
                    d += a[ s2 ][ j ] * ndu[ rk + j ][ pk ];

                }

                if ( r <= pk ) {

                    a[ s2 ][ k ] = - a[ s1 ][ k - 1 ] / ndu[ pk + 1 ][ r ];
                    d += a[ s2 ][ k ] * ndu[ r ][ pk ];

                }

                ders[ k ][ r ] = d;

                var j = s1;
                s1 = s2;
                s2 = j;

            }

        }

        let r = p;

        for ( var k = 1; k <= n; ++ k ) {

            for ( var j = 0; j <= p; ++ j ) {

                ders[ k ][ j ] *= r;

            }

            r *= p - k;

        }

        return ders;

    },


    /*
        Calculate derivatives of a B-Spline. See The NURBS Book, page 93, algorithm A3.2.

        p  : degree
        U  : knot vector
        P  : control points
        u  : Parametric points
        nd : number of derivatives

        returns array[d+1] with derivatives
        */
    calcBSplineDerivatives: function ( p, U, P, u, nd ) {

        var du = nd < p ? nd : p;
        var CK = [];
        var span = this.findSpan( p, u, U );
        var nders = this.calcBasisFunctionDerivatives( span, u, p, du, U );
        var Pw = [];

        for ( var i = 0; i < P.length; ++ i ) {

            var point = P[ i ].clone();
            var w = point.w;

            point.x *= w;
            point.y *= w;
            point.z *= w;

            Pw[ i ] = point;

        }

        for ( var k = 0; k <= du; ++ k ) {

            var point = Pw[ span - p ].clone().multiplyScalar( nders[ k ][ 0 ] );

            for ( var j = 1; j <= p; ++ j ) {

                point.add( Pw[ span - p + j ].clone().multiplyScalar( nders[ k ][ j ] ) );

            }

            CK[ k ] = point;

        }

        for ( let k = du + 1; k <= nd + 1; ++ k ) {

            CK[ k ] = new THREE.Vector4( 0, 0, 0 );

        }

        return CK;

    },


    /*
    Calculate "K over I"

    returns k!/(i!(k-i)!)
    */
    calcKoverI: function ( k, i ) {

        var nom = 1;

        for ( var j = 2; j <= k; ++ j ) {

            nom *= j;

        }

        var denom = 1;

        for ( var j = 2; j <= i; ++ j ) {

            denom *= j;

        }

        for ( var j = 2; j <= k - i; ++ j ) {

            denom *= j;

        }

        return nom / denom;

    },


    /*
    Calculate derivatives (0-nd) of rational curve. See The NURBS Book, page 127, algorithm A4.2.

    Pders : result of function calcBSplineDerivatives

    returns array with derivatives for rational curve.
    */
    calcRationalCurveDerivatives: function ( Pders ) {

        var nd = Pders.length;
        var Aders = [];
        var wders = [];

        for ( var i = 0; i < nd; ++ i ) {

            var point = Pders[ i ];
            Aders[ i ] = new THREE.Vector3( point.x, point.y, point.z );
            wders[ i ] = point.w;

        }

        var CK = [];

        for ( var k = 0; k < nd; ++ k ) {

            var v = Aders[ k ].clone();

            for ( var i = 1; i <= k; ++ i ) {

                v.sub( CK[ k - i ].clone().multiplyScalar( this.calcKoverI( k, i ) * wders[ i ] ) );

            }

            CK[ k ] = v.divideScalar( wders[ 0 ] );

        }

        return CK;

    },


    /*
    Calculate NURBS curve derivatives. See The NURBS Book, page 127, algorithm A4.2.

    p  : degree
    U  : knot vector
    P  : control points in homogeneous space
    u  : parametric points
    nd : number of derivatives

    returns array with derivatives.
    */
    calcNURBSDerivatives: function ( p, U, P, u, nd ) {

        var Pders = this.calcBSplineDerivatives( p, U, P, u, nd );
        return this.calcRationalCurveDerivatives( Pders );

    },


    /*
    Calculate rational B-Spline surface point. See The NURBS Book, page 134, algorithm A4.3.

    p1, p2 : degrees of B-Spline surface
    U1, U2 : knot vectors
    P      : control points (x, y, z, w)
    u, v   : parametric values

    returns point for given (u, v)
    */
    calcSurfacePoint: function ( p, q, U, V, P, u, v, target ) {

        var uspan = this.findSpan( p, u, U );
        var vspan = this.findSpan( q, v, V );
        var Nu = this.calcBasisFunctions( uspan, u, p, U );
        var Nv = this.calcBasisFunctions( vspan, v, q, V );
        var temp = [];

        for ( var l = 0; l <= q; ++ l ) {

            temp[ l ] = new THREE.Vector4( 0, 0, 0, 0 );
            for ( var k = 0; k <= p; ++ k ) {

                var point = P[ uspan - p + k ][ vspan - q + l ].clone();
                var w = point.w;
                point.x *= w;
                point.y *= w;
                point.z *= w;
                temp[ l ].add( point.multiplyScalar( Nu[ k ] ) );

            }

        }

        var Sw = new THREE.Vector4( 0, 0, 0, 0 );
        for ( var l = 0; l <= q; ++ l ) {

            Sw.add( temp[ l ].multiplyScalar( Nv[ l ] ) );

        }

        Sw.divideScalar( Sw.w );
        target.set( Sw.x, Sw.y, Sw.z );

    }

};


const NURBSCurve = function (this:any, degree, knots /* array of reals */, controlPoints /* array of Vector(2|3|4) */, startKnot /* index in knots */, endKnot /* index in knots */ ) {

    THREE.Curve.call( this );

    this.degree = degree;
    this.knots = knots;
    this.controlPoints = [];
    // Used by periodic NURBS to remove hidden spans
    this.startKnot = startKnot || 0;
    this.endKnot = endKnot || ( this.knots.length - 1 );
    for ( var i = 0; i < controlPoints.length; ++ i ) {

        // ensure Vector4 for control points
        var point = controlPoints[ i ];
        this.controlPoints[ i ] = new THREE.Vector4( point.x, point.y, point.z, point.w );

    }

};


NURBSCurve.prototype = Object.create( THREE.Curve.prototype );
NURBSCurve.prototype.constructor = NURBSCurve;


NURBSCurve.prototype.getPoint = function ( t, optionalTarget ) {

    var point = optionalTarget || new THREE.Vector3();

    var u = this.knots[ this.startKnot ] + t * ( this.knots[ this.endKnot ] - this.knots[ this.startKnot ] ); // linear mapping t->u

    // following results in (wx, wy, wz, w) homogeneous point
    var hpoint = NURBSUtils.calcBSplinePoint( this.degree, this.knots, this.controlPoints, u );

    if ( hpoint.w != 1.0 ) {

        // project to 3D space: (wx, wy, wz, w) -> (x, y, z, 1)
        hpoint.divideScalar( hpoint.w );

    }

    return point.set( hpoint.x, hpoint.y, hpoint.z );

};

NURBSCurve.prototype.getTangent = function ( t, optionalTarget ) {

    var tangent = optionalTarget || new THREE.Vector3();

    var u = this.knots[ 0 ] + t * ( this.knots[ this.knots.length - 1 ] - this.knots[ 0 ] );
    var ders = NURBSUtils.calcNURBSDerivatives( this.degree, this.knots, this.controlPoints, u, 1 );
    tangent.copy( ders[ 1 ] ).normalize();

    return tangent;

};

enum ShapeType {
    SPHERE = 0,
    CYLINDER = 1,
    BOX = 2,
    CONE = 3,
    TRIANGLE_SET = 4,
    EXTRUSION = 5
};

const geometry = (shapeType: ShapeType, args: number[]) => {

    switch (shapeType) {
        case ShapeType.CYLINDER:
            return cylinder(args);
        case ShapeType.SPHERE:
            return sphere(args);
        case ShapeType.BOX:
            return box(args);
        case ShapeType.CONE:
            return cone(args);
        case ShapeType.TRIANGLE_SET:
            return triangleSet([
                args[0] as any instanceof Float32Array ? args[0] : new Float32Array(args[0]),
                args[0] as any instanceof Uint32Array ? args[0] : new Uint32Array(args[1])
            ]);
        case ShapeType.EXTRUSION:
            return extrusion(args);
        default:
            return null;
    }
}

const sphere = (args: number[]): THREE.BufferGeometry => {

    const [radius, slices, stacks] = args;
    return new THREE.SphereBufferGeometry(radius, slices, stacks);

/*

    const ringCount = stacks - 1;       // number of rings of points
    const bot = slices * ringCount;     // index of the lower point
    const top = bot + 1;                // index of the upper point

    const vertices = [];
    const indices = [];

    const azStep = GEOM_TWO_PI / slices;
    const elStep = GEOM_PI / stacks;

    let cur = 0;
    let next = ringCount;

    let pointCount = 0;
    let indexCount = 0;

    for (let i = 0; i < slices; ++i) {

        const az = i * azStep;
        let el = - GEOM_HALF_PI + elStep;
        const cosAz = cos(az);
        const sinAz = sin(az);
        let cosEl = cos(el);
        let x = cosAz * cosEl;
        let y = sinAz * cosEl;
        let z = sin(el);

        vertices[pointCount++] = [x * radius, y * radius, z * radius];

        indices[indexCount++] = [cur, bot, next];
        indices[indexCount++] = [cur + ringCount - 1, next + ringCount - 1, top];

        for (let j = 1; j < ringCount; ++j) {
            el += elStep;
            cosEl = cos(el);
            x = cosAz * cosEl;
            y = sinAz * cosEl;
            z = sin(el);

            vertices[pointCount++] = [x * radius, y * radius, z * radius];

            indices[indexCount++] = [cur + j, cur + j - 1, next + j - 1];
            indices[indexCount++] = [cur + j, next + j - 1, next + j];
        }

        cur = next;
        next = (next + ringCount ) % (ringCount * slices);
    };

    vertices[pointCount++] = [0, 0, -radius];
    vertices[pointCount++] = [0, 0, radius];

    if (pointCount !== vertices.length || indexCount !== indices.length) {
        throw new Error();
    }

    return [
        new Float32Array(vertices.reduce(flatten, [])),
        new Uint32Array(indices.reduce(flatten, []))
    ]; */

}

const cylinder = (args: number[]): THREE.BufferGeometry => {

    const [radius, height, slices, solid] = args;
    return new THREE.CylinderBufferGeometry(radius, radius, height, slices, slices, !solid);

}

const box = (args: number[]): THREE.BufferGeometry => {

    const [width, height, depth] = args;
    return new THREE.BoxBufferGeometry(width, height, depth)

}

const cone = (args: number[]): THREE.BufferGeometry => {

    const [radius, height, slices, solid] = args;
    return new THREE.ConeBufferGeometry(radius, height, slices, slices, !solid)

}

const triangleSet = (args): THREE.BufferGeometry => {

    const [vertices, indices] = args as [Float32Array, Uint32Array];
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;

}

const extrusion = (args): THREE.BufferGeometry => {

    const [curveType, shape, curve, steps, depth] = args as [number, number[], any, number, number];
    let extrudePath = null;
    switch (curveType) {
        case 0:
            const [vertices, scales] = curve as [number[], number[]];
            //extrudePath = new Polyline3(flatToVector<Vector3>(3, vertices), flatToVector<Vector2>(2, scales));
            extrudePath = new THREE.CatmullRomCurve3(flatToVector<Vector3>(3, vertices));

            break;
        case 1:
            const [degree, knots, controlPoints, startKnot, endKnot] = curve as [number, number[], number[], number, number];
            extrudePath = new NURBSCurve(degree, knots, flatToVector<Vector4>(4, controlPoints), startKnot, endKnot);
        default:
            break;
    }
    return new THREE.ExtrudeBufferGeometry(new THREE.Shape(flatToVector<Vector2>(2, shape)), {
        steps, depth,
        bevelEnabled: false
     });

}



export {
    ShapeType,
    geometry
}