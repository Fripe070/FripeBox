import { Matrix, inverse } from "ml-matrix";
import { ColorSpace, SpaceXYZA, type FourIndices } from "./base.svelte";

const M: Matrix = new Matrix([
    [0.4124, 0.3576, 0.1805],
    [0.2126, 0.7152, 0.0722],
    [0.0193, 0.1192, 0.9505],
]);
const M_INV: Matrix = inverse(M);
function linearize(value: number): number {
    if (value <= 0.04045) {
        return value / 12.92;
    } else {
        return Math.pow((value + 0.055) / 1.055, 2.4);
    }
}
function delinearize(value: number): number {
    if (value <= 0.0031308) {
        return value * 12.92;
    } else {
        return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    }
}

export class SpaceSRGB extends ColorSpace {
    public r: number = $state(0);
    public g: number = $state(0);
    public b: number = $state(0);
    public alpha: number = $state(1);

    constructor(r: number, g: number, b: number, alpha: number = 1) {
        super();
        this.r = r;
        this.g = g;
        this.b = b;
        this.alpha = alpha;
    }
    toXYZ(): SpaceXYZA {
        const sRGB_Prime = new Matrix([
            [linearize(this.r)],
            [linearize(this.g)],
            [linearize(this.b)],
        ]);
        const XYZ = M.mmul(sRGB_Prime);
        return new SpaceXYZA(XYZ.get(0, 0), XYZ.get(1, 0), XYZ.get(2, 0), this.alpha);
    }

    toHex(): string {
        const r = Math.round(Math.max(0, Math.min(1, this.r)) * 255)
            .toString(16)
            .padStart(2, "0");
        const g = Math.round(Math.max(0, Math.min(1, this.g)) * 255)
            .toString(16)
            .padStart(2, "0");
        const b = Math.round(Math.max(0, Math.min(1, this.b)) * 255)
            .toString(16)
            .padStart(2, "0");
        const a = Math.round(Math.max(0, Math.min(1, this.alpha)) * 255)
            .toString(16)
            .padStart(2, "0");
        if (a === "ff") {
            return `#${r}${g}${b}`;
        } else {
            return `#${r}${g}${b}${a}`;
        }
    }

    clone(): SpaceSRGB {
        return new SpaceSRGB(this.r, this.g, this.b, this.alpha);
    }

    setIndex(index: FourIndices, value: number): void {
        const arr = [this.r, this.g, this.b, this.alpha];
        arr[index] = value;
        [this.r, this.g, this.b, this.alpha] = arr;
    }
    getIndex(index: FourIndices): number {
        const arr = [this.r, this.g, this.b, this.alpha];
        return arr[index];
    }
}
export function toSRGB(xyza: SpaceXYZA): SpaceSRGB {
    const XYZ = new Matrix([[xyza.x], [xyza.y], [xyza.z]]);
    const sRGB_Prime = M_INV.mmul(XYZ);
    return new SpaceSRGB(
        delinearize(sRGB_Prime.get(0, 0)),
        delinearize(sRGB_Prime.get(1, 0)),
        delinearize(sRGB_Prime.get(2, 0)),
        xyza.alpha,
    );
}
