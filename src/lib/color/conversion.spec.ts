import { describe, it, expect } from "vitest";
import { SpaceXYZA, toSRGB, toOKLAB, toOKLCH, toOKLrCH } from "./index";

const CONVERTERS = [
    { name: "sRGB", toSpace: toSRGB },
    { name: "OKLAB", toSpace: toOKLAB },
    { name: "OKLCH", toSpace: toOKLCH },
    { name: "OKLrCH", toSpace: toOKLrCH },
] as const;
const testColors = [
    // Known sRGB primary colors
    // https://en.wikipedia.org/wiki/SRGB#Primaries
    new SpaceXYZA(0.0, 0.0, 0.0, 1.0), // Black
    new SpaceXYZA(0.3127, 0.329, 1.0, 1.0), // White point
    new SpaceXYZA(0.64, 0.33, 0.2126, 1.0), // Red
    new SpaceXYZA(0.3, 0.6, 0.7152, 1.0), // Green
    new SpaceXYZA(0.15, 0.06, 0.0722, 1.0), // Blue
] as const;

const outOfBoundsColors = [
    new SpaceXYZA(-0.1, 0.5, 0.5, 1.0),
    new SpaceXYZA(0.5, -0.1, 0.5, 1.0),
    new SpaceXYZA(0.5, 0.5, -0.1, 1.0),
    new SpaceXYZA(1.1, 0.5, 0.5, 1.0),
    new SpaceXYZA(0.5, 1.1, 0.5, 1.0),
    new SpaceXYZA(0.5, 0.5, 1.1, 1.0),
] as const;

function* colorGenerator(steps: number) {
    const step = 1.0 / (steps - 1);
    for (let x = 0; x < steps; x++) {
        for (let y = 0; y < steps; y++) {
            for (let z = 0; z < steps; z++) {
                yield new SpaceXYZA(x * step, y * step, z * step, 1.0);
            }
        }
    }
}

describe("Color Conversion Roundtrip Accuracy", () => {
    describe.each(CONVERTERS)("$name conversion", ({ toSpace }) => {
        it("should roundtrip colors evenly distributed across the spectrum", () => {
            for (const original of colorGenerator(16)) {
                const converted = toSpace(original);
                const restored = converted.toXYZ();

                expect(restored.x).toBeCloseTo(original.x, 3);
                expect(restored.y).toBeCloseTo(original.y, 3);
                expect(restored.z).toBeCloseTo(original.z, 3);
                expect(restored.alpha).toBeCloseTo(original.alpha, 3);
            }
        });
        it("should roundtrip known primary colors accurately", () => {
            for (const original of testColors) {
                const converted = toSpace(original);
                const restored = converted.toXYZ();
                expect(restored.x).toBeCloseTo(original.x, 4);
                expect(restored.y).toBeCloseTo(original.y, 4);
                expect(restored.z).toBeCloseTo(original.z, 4);
                expect(restored.alpha).toBeCloseTo(original.alpha, 4);
            }
        });
        it("should roundtrip out-of-bounds colors accurately", () => {
            for (const original of outOfBoundsColors) {
                const converted = toSpace(original);
                const restored = converted.toXYZ();
                expect(restored.x).toBeCloseTo(original.x, 4);
                expect(restored.y).toBeCloseTo(original.y, 4);
                expect(restored.z).toBeCloseTo(original.z, 4);
                expect(restored.alpha).toBeCloseTo(original.alpha, 4);
            }
        });
    });
});
