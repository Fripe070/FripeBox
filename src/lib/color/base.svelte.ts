export type FourIndices = 0 | 1 | 2 | 3;

/**
 * Base class for all derived color spaces, providing conversion to/from CIE XYZ.
 */
export abstract class ColorSpace {
    public abstract alpha: number;

    public abstract toXYZ(): SpaceXYZA;
    public abstract clone(): ColorSpace;

    public abstract setIndex(index: FourIndices, value: number): void;
    public abstract getIndex(index: FourIndices): number;

    public withIndex(index: FourIndices, value: number): ColorSpace {
        const clone = this.clone();
        clone.setIndex(index, value);
        return clone;
    }
}

/**
 * Ground truth CIE XYZ color space representation with an added alpha channel.
 */
export class SpaceXYZA implements ColorSpace {
    public x: number = $state(0);
    public y: number = $state(0);
    public z: number = $state(0);
    public alpha: number = $state(1);

    constructor(x: number, y: number, z: number, alpha: number = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.alpha = alpha;
    }

    toXYZ(): SpaceXYZA {
        return this;
    }
    clone(): SpaceXYZA {
        return new SpaceXYZA(this.x, this.y, this.z, this.alpha);
    }

    setIndex(index: FourIndices, value: number): void {
        const arr = [this.x, this.y, this.z, this.alpha];
        arr[index] = value;
        [this.x, this.y, this.z, this.alpha] = arr;
    }
    getIndex(index: FourIndices): number {
        const arr = [this.x, this.y, this.z, this.alpha];
        return arr[index];
    }
}
