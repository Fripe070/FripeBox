import { Matrix, inverse } from "ml-matrix";
import { ColorSpace, SpaceXYZA, type FourIndices } from "./base.svelte";

const M1: Matrix = new Matrix([
    [0.8189330101, 0.3618667424, -0.1288597137],
    [0.0329845436, 0.9293118715, 0.0361456387],
    [0.0482003018, 0.2643662691, 0.633851707],
]);
const M2: Matrix = new Matrix([
    [0.2104542553, 0.793617785, -0.0040720468],
    [1.9779984951, -2.428592205, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.808675766],
]);
const M1_INV: Matrix = inverse(M1);
const M2_INV: Matrix = inverse(M2);

const k1 = 0.206;
const k2 = 0.03;
const k3 = (1 + k1) / (1 + k2);
/**
 * Converts OKLab lightness to use a reference white luminance of Y = 1.
 * @link https://bottosson.github.io/posts/colorpicker/#intermission---a-new-lightness-estimate-for-oklab
 * @param L - The OKLab lightness value L.
 * @returns The adjusted lightness value L_r.
 */
function lightnessToReferenced(L: number): number {
    return (k3 * L - k1 + Math.sqrt(Math.pow(k3 * L - k1, 2) + 4 * k2 * k3 * L)) / 2;
}
/**
 * Converts referenced OKLab lightness back to standard OKLab lightness.
 * @link https://bottosson.github.io/posts/colorpicker/#intermission---a-new-lightness-estimate-for-oklab
 * @param L - The adjusted lightness value L_r.
 * @returns The OKLab lightness value L.
 */
function lightnessFromReferenced(L_r: number): number {
    const numerator = L_r * (L_r + k1);
    const denominator = k3 * (L_r + k2);
    return numerator / denominator;
}

export class SpaceOKLAB extends ColorSpace {
    public l: number = $state(0);
    public a: number = $state(0);
    public b: number = $state(0);
    public alpha: number = $state(1);
    constructor(l: number, a: number, b: number, alpha: number = 1) {
        super();
        this.l = l;
        this.a = a;
        this.b = b;
        this.alpha = alpha;
    }
    toXYZ(): SpaceXYZA {
        const LAB = new Matrix([[this.l], [this.a], [this.b]]);
        const LMS = M2_INV.mmul(LAB);
        LMS.set(0, 0, Math.pow(LMS.get(0, 0), 3));
        LMS.set(1, 0, Math.pow(LMS.get(1, 0), 3));
        LMS.set(2, 0, Math.pow(LMS.get(2, 0), 3));
        const XYZ = M1_INV.mmul(LMS);
        return new SpaceXYZA(XYZ.get(0, 0), XYZ.get(1, 0), XYZ.get(2, 0), this.alpha);
    }

    clone(): SpaceOKLAB {
        return new SpaceOKLAB(this.l, this.a, this.b, this.alpha);
    }

    setIndex(index: FourIndices, value: number): void {
        const arr = [this.l, this.a, this.b, this.alpha];
        arr[index] = value;
        [this.l, this.a, this.b, this.alpha] = arr;
    }
    getIndex(index: FourIndices): number {
        const arr = [this.l, this.a, this.b, this.alpha];
        return arr[index];
    }
}
export function toOKLAB(xyza: SpaceXYZA): SpaceOKLAB {
    const XYZ = new Matrix([[xyza.x], [xyza.y], [xyza.z]]);
    const LMS = M1.mmul(XYZ);
    LMS.set(0, 0, Math.cbrt(LMS.get(0, 0)));
    LMS.set(1, 0, Math.cbrt(LMS.get(1, 0)));
    LMS.set(2, 0, Math.cbrt(LMS.get(2, 0)));
    const LAB = M2.mmul(LMS);
    return new SpaceOKLAB(LAB.get(0, 0), LAB.get(1, 0), LAB.get(2, 0), xyza.alpha);
}

export class SpaceOKLCH extends ColorSpace {
    public l: number = $state(0);
    public c: number = $state(0);
    public h: number = $state(0);
    public alpha: number = $state(1);

    constructor(l: number, c: number, h: number, alpha: number = 1) {
        super();
        this.l = l;
        this.c = c;
        this.h = h;
        this.alpha = alpha;
    }
    toXYZ(): SpaceXYZA {
        const a = this.c * Math.cos(this.h);
        const b = this.c * Math.sin(this.h);
        const oklab = new SpaceOKLAB(this.l, a, b, this.alpha);
        return oklab.toXYZ();
    }
    clone(): SpaceOKLCH {
        return new SpaceOKLCH(this.l, this.c, this.h, this.alpha);
    }

    setIndex(index: FourIndices, value: number): void {
        const arr = [this.l, this.c, this.h, this.alpha];
        arr[index] = value;
        [this.l, this.c, this.h, this.alpha] = arr;
    }
    getIndex(index: FourIndices): number {
        const arr = [this.l, this.c, this.h, this.alpha];
        return arr[index];
    }
}
export function toOKLCH(xyza: SpaceXYZA): SpaceOKLCH {
    const oklab = toOKLAB(xyza);
    const c = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
    const h = Math.atan2(oklab.b, oklab.a);
    return new SpaceOKLCH(oklab.l, c, h, oklab.alpha);
}

export class SpaceOKLrCH extends ColorSpace {
    public l_r: number = $state(0);
    public c: number = $state(0);
    public h: number = $state(0);
    public alpha: number = $state(1);

    constructor(l_r: number, c: number, h: number, alpha: number = 1) {
        super();
        this.l_r = l_r;
        this.c = c;
        this.h = h;
        this.alpha = alpha;
    }
    toXYZ(): SpaceXYZA {
        const oklch = new SpaceOKLCH(lightnessFromReferenced(this.l_r), this.c, this.h, this.alpha);
        return oklch.toXYZ();
    }

    clone(): SpaceOKLrCH {
        return new SpaceOKLrCH(this.l_r, this.c, this.h, this.alpha);
    }

    setIndex(index: FourIndices, value: number): void {
        const arr = [this.l_r, this.c, this.h, this.alpha];
        arr[index] = value;
        [this.l_r, this.c, this.h, this.alpha] = arr;
    }
    getIndex(index: FourIndices): number {
        const arr = [this.l_r, this.c, this.h, this.alpha];
        return arr[index];
    }
}
export function toOKLrCH(xyza: SpaceXYZA): SpaceOKLrCH {
    const oklch = toOKLCH(xyza);
    return new SpaceOKLrCH(lightnessToReferenced(oklch.l), oklch.c, oklch.h, oklch.alpha);
}
