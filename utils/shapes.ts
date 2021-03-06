/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */



import { Vector, vectorAddition, scalarProduct, V4Matrix, V3Matrix, V2Matrix, Matrix } from './math';


export function bezier(p0: Vector, p1: Vector, t: number): Vector {
    return vectorAddition(scalarProduct( (1.0 - t), p0),  scalarProduct(t, p1));
}

export function multiBezier(ps: Vector[], t: number): Vector {
    const length = ps.length;
    if (length === 2) {
        return bezier(ps[0], ps[1], t);
    } else {
        const vec0 = multiBezier(ps.slice(0, length - 1), t);
        const vec1 = multiBezier(ps.slice(1, length), t);
        return bezier(vec0, vec1, t);
    }
}

export function bezierGenerator(ps: Vector[]): (t: number) => Vector {
    return (t: number) => {
        return multiBezier(ps, t);
    };
}




/**
 * While webgl's clip space has coordinates [-1, 1] (left to right), [-1, 1] (bottom to top),
 * textures go from [0, 1] (left to right), [0, 1] (bottom to top).
 */


export interface ShapeA {
    vertices: V4Matrix;
    texturePositions: V2Matrix;
}

export interface ShapeE {
    vertices: V4Matrix;
    texturePositions: V2Matrix;
    vertexIndices: V3Matrix;
}

export const triangleA = (width: number, height: number): ShapeA => {
    return {
        vertices: [
            [-width / 2, -height / 2, 0, 1],
            [         0,  height / 2, 0, 1],
            [ width / 2, -height / 2, 0, 1]
        ],
        texturePositions: [
            [0, 0],
            [0, 1],
            [1, 0]
        ]
    };
};

export const triangleE = (width: number, height: number): ShapeE => {
    return {
        vertices: [
            [-width / 2, -height / 2, 0, 1],
            [         0,  height / 2, 0, 1],
            [ width / 2, -height / 2, 0, 1]
        ],
        texturePositions: [
            [0, 0],
            [0, 1],
            [1, 0]
        ],
        vertexIndices: [
            [0, 1, 2]
        ]
    };
};

export const rectangleA = (width: number, height: number): ShapeA => {
    return {
        vertices: [
            [-width / 2,  height / 2, 0, 1],
            [-width / 2, -height / 2, 0, 1],
            [ width / 2, -height / 2, 0, 1],
            [-width / 2,  height / 2, 0, 1],
            [ width / 2, -height / 2, 0, 1],
            [ width / 2,  height / 2, 0, 1],
        ],
        texturePositions: [
            [0, 1],
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 0],
            [1, 1]
        ]
    };
};

export const rectangleE = (width: number, height: number): ShapeE => {
    return {
        vertices: [
            [-width / 2,  height / 2, 0, 1],
            [-width / 2, -height / 2, 0, 1],
            [ width / 2, -height / 2, 0, 1],
            [ width / 2,  height / 2, 0, 1],
        ],
        texturePositions: [
            [0, 1],
            [0, 0],
            [1, 0],
            [1, 1]
        ],
        vertexIndices: [
            [0, 1, 2],
            [0, 2, 3]
        ]
    };
};

export const boxA = (width: number, height: number, depth: number): ShapeA => {
    return {
        vertices: [
            // face 1
            [-width / 2,  height / 2, depth / 2, 1],
            [ width / 2,  height / 2, depth / 2, 1],
            [-width / 2, -height / 2, depth / 2, 1],
            [ width / 2,  height / 2, depth / 2, 1],
            [-width / 2, -height / 2, depth / 2, 1],
            [ width / 2, -height / 2, depth / 2, 1],

            // face 2
            [-width / 2,  height / 2,  depth / 2, 1],
            [ width / 2,  height / 2,  depth / 2, 1],
            [ width / 2,  height / 2, -depth / 2, 1],
            [-width / 2,  height / 2,  depth / 2, 1],
            [ width / 2,  height / 2, -depth / 2, 1],
            [-width / 2,  height / 2, -depth / 2, 1],

            // face 3
            [ width / 2,  height / 2,  depth / 2, 1],
            [ width / 2,  height / 2, -depth / 2, 1],
            [ width / 2, -height / 2, -depth / 2, 1],
            [ width / 2,  height / 2,  depth / 2, 1],
            [ width / 2, -height / 2, -depth / 2, 1],
            [ width / 2, -height / 2,  depth / 2, 1],

            // face 4
            [-width / 2, -height / 2,  depth / 2, 1],
            [ width / 2, -height / 2,  depth / 2, 1],
            [ width / 2, -height / 2, -depth / 2, 1],
            [-width / 2, -height / 2,  depth / 2, 1],
            [ width / 2, -height / 2, -depth / 2, 1],
            [-width / 2, -height / 2, -depth / 2, 1],

            // face 5
            [-width / 2,  height / 2, -depth / 2, 1],
            [ width / 2,  height / 2, -depth / 2, 1],
            [-width / 2, -height / 2, -depth / 2, 1],
            [ width / 2,  height / 2, -depth / 2, 1],
            [-width / 2, -height / 2, -depth / 2, 1],
            [ width / 2, -height / 2, -depth / 2, 1],

            // face 6
            [-width / 2,  height / 2,  depth / 2, 1],
            [-width / 2,  height / 2, -depth / 2, 1],
            [-width / 2, -height / 2, -depth / 2, 1],
            [-width / 2,  height / 2,  depth / 2, 1],
            [-width / 2, -height / 2, -depth / 2, 1],
            [-width / 2, -height / 2,  depth / 2, 1]
        ],
        texturePositions: [
            // face 1
            [0, 0],
            [0, 1],
            [1, 0],
            [0, 1],
            [1, 1],
            [1, 0],

            // face 2
            [0, 0],
            [0, 1],
            [1, 0],
            [0, 1],
            [1, 1],
            [1, 0],

            // face 3
            [0, 0],
            [0, 1],
            [1, 0],
            [0, 1],
            [1, 1],
            [1, 0],

            // face 4
            [0, 0],
            [0, 1],
            [1, 0],
            [0, 1],
            [1, 1],
            [1, 0],

            // face 5
            [0, 0],
            [0, 1],
            [1, 0],
            [0, 1],
            [1, 1],
            [1, 0],

            // face 6
            [0, 0],
            [0, 1],
            [1, 0],
            [0, 1],
            [1, 1],
            [1, 0],
        ]
    };
};

export const boxE = (width: number, height: number, depth: number): ShapeE => {
    return {
        vertices: [
            [-width / 2,  height / 2,  depth / 2, 1],
            [ width / 2,  height / 2,  depth / 2, 1],
            [ width / 2, -height / 2,  depth / 2, 1],
            [-width / 2, -height / 2,  depth / 2, 1],
            [-width / 2,  height / 2, -depth / 2, 1],
            [ width / 2,  height / 2, -depth / 2, 1],
            [ width / 2, -height / 2, -depth / 2, 1],
            [-width / 2, -height / 2, -depth / 2, 1],
        ],
        vertexIndices: [
            [1, 0, 3],  // side 1
            [1, 3, 2],  // side 1,
            [7, 5, 4],  // side 6,
            [6, 7, 5],  // side 6,
            [5, 1, 2],  // side 2,
            [5, 2, 6],  // side 2,
            [3, 0, 4],  // side 5,
            [7, 3, 4],  // side 5,
            [5, 4, 0],  // side 3,
            [5, 0, 1],  // side 3,
            [3, 7, 6],  // side 4,
            [2, 3, 6],  // side 4,
        ],
        texturePositions: [
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
            [1, 1],
            [0, 1],
            [0, 0],
            [1, 0],
        ],
    };
};


export const identity = (): Matrix => {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
};

export const edgeDetectKernel = (): Matrix => {
    return [
        [-1., -1., -1.],
        [-1.,  8., -1.],
        [-1., -1., -1.]
    ];
};

export const normalKernel = (): Matrix => {
    return [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0]
      ];
};

export const  gaussianKernel = (): Matrix => {
    return [
        [0.045, 0.122, 0.045],
        [0.122, 0.332, 0.122],
        [0.045, 0.122, 0.045]
  ];
};

export const unsharpenKernel = (): Matrix => {
    return [
        [-1, -1, -1],
        [-1,  9, -1],
        [-1, -1, -1]
  ];
};

export const embossKernel = (): Matrix => {
    return [
        [-2, -1,  0],
        [-1,  1,  1],
        [ 0,  1,  2]
  ];
};


