import type { SpaceXYZA } from "./base.svelte";
import { SpaceSRGB } from "./srgb.svelte";

function fromHex(hex: string): SpaceSRGB | undefined {
    // Remove the leading '#' if present
    if (hex.startsWith("#")) {
        hex = hex.slice(1);
    }
    let [r, g, b, a] = [0, 0, 0, 1];
    if (hex.length === 3) {
        r = parseInt(`${hex[0]}${hex[0]}`, 16) / 255;
        g = parseInt(`${hex[1]}${hex[1]}`, 16) / 255;
        b = parseInt(`${hex[2]}${hex[2]}`, 16) / 255;
    } else if (hex.length === 4) {
        r = parseInt(`${hex[0]}${hex[0]}`, 16) / 255;
        g = parseInt(`${hex[1]}${hex[1]}`, 16) / 255;
        b = parseInt(`${hex[2]}${hex[2]}`, 16) / 255;
        a = parseInt(`${hex[3]}${hex[3]}`, 16) / 255;
    } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
    } else if (hex.length === 8) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
        a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
        return undefined;
    }
    return new SpaceSRGB(r, g, b, a);
}

export function parseCssColor(input: string): SpaceXYZA | undefined {
    const hexColor = fromHex(input);
    if (hexColor) return hexColor.toXYZ();

    return undefined;
}
