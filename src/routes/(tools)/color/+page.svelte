<script lang="ts" module>
    export const formatMap: Record<string, { displayName: string; space: any }> = {
        cie_xyz: { displayName: "CIE XYZ", space: SpaceXYZA },
        srgb: { displayName: "sRGB", space: SpaceSRGB },
        oklab: { displayName: "OKLAB", space: SpaceOKLAB },
        oklch: { displayName: "OKLCH", space: SpaceOKLCH },
    } as const;
</script>

<script lang="ts">
    import {
        ColorSpace,
        SpaceOKLAB,
        SpaceOKLCH,
        SpaceOKLrCH,
        SpaceSRGB,
        SpaceXYZA,
        toSRGB,
    } from "$lib/color";
    import Canvas from "$lib/components/Canvas.svelte";
    import ToolBody from "$lib/components/ToolBody.svelte";
    import { onMount } from "svelte";
    import ColorPickerSlider from "./ColorPickerSlider.svelte";
    import CopyIcon from "virtual:icons/lucide/copy";

    let trueColor = $state<SpaceXYZA>(new SpaceXYZA(0.0, 0.0, 0.0, 1));
    let displayHex: string = $derived(toSRGB(trueColor).toHex());

    let currentFormat = $state<keyof typeof formatMap>("oklab");
    let editorColor = $state<ColorSpace>(new SpaceSRGB(0.5, 0.0, 0.0, 1.0));

    let sliderContext1 = $state<CanvasRenderingContext2D | null>(null);
    let sliderContext2 = $state<CanvasRenderingContext2D | null>(null);
    let sliderContext3 = $state<CanvasRenderingContext2D | null>(null);
    let sliderContext_alpha = $state<CanvasRenderingContext2D | null>(null);

    let canvasContext1 = $state<CanvasRenderingContext2D | null>(null);
    let canvasContext2 = $state<CanvasRenderingContext2D | null>(null);
    let canvasContext3 = $state<CanvasRenderingContext2D | null>(null);
    let canvasContext_alpha = $state<CanvasRenderingContext2D | null>(null);

    $effect(() => {
        trueColor = editorColor.toXYZ();
        if (sliderContext1 && canvasContext1) repaint(sliderContext1, canvasContext1);
        if (sliderContext2 && canvasContext2) repaint(sliderContext2, canvasContext2);
        if (sliderContext3 && canvasContext3) repaint(sliderContext3, canvasContext3);
        if (sliderContext_alpha && canvasContext_alpha)
            repaint(sliderContext_alpha, canvasContext_alpha);
    });
    // Has to be separate to prevent circular dependency
    $effect(() => {
        const rgb = toSRGB(trueColor);
        const hex = rgb.toHex();
        const okComponents = [];
        for (let i = 0; i < 4; i++) okComponents.push(editorColor.getIndex(i as 0 | 1 | 2 | 3));
        const rgbComponents = [];
        for (let i = 0; i < 4; i++) rgbComponents.push(rgb.getIndex(i as 0 | 1 | 2 | 3));
        const xyzaComponents = [];
        for (let i = 0; i < 4; i++) xyzaComponents.push(trueColor.getIndex(i as 0 | 1 | 2 | 3));
        console.log(hex, okComponents, xyzaComponents, rgbComponents);
    });

    $effect(() => {
        [editorColor];
        if (sliderContext1) drawSlider(sliderContext1, 0);
        if (sliderContext2) drawSlider(sliderContext2, 1);
        if (sliderContext3) drawSlider(sliderContext3, 2);
        if (sliderContext_alpha) drawSlider(sliderContext_alpha, 3);
    });

    function drawSlider(sliderCtx: CanvasRenderingContext2D, index: number): void {
        const pixelRatio = window.devicePixelRatio || 1;
        sliderCtx.canvas.width = sliderCtx.canvas.clientWidth * pixelRatio;
        sliderCtx.canvas.height = 1;

        const stepSize = 1 / 4;
        const gradient = sliderCtx.createLinearGradient(0, 0, sliderCtx.canvas.width, 0);
        for (let x = 0; x <= 1; x += stepSize) {
            const colorClone = editorColor.withIndex(index as 0 | 1 | 2 | 3, x);
            gradient.addColorStop(x, toSRGB(colorClone.toXYZ()).toHex());
        }
        sliderCtx.fillStyle = gradient;
        sliderCtx.fillRect(0, 0, sliderCtx.canvas.width, sliderCtx.canvas.height);
    }

    function repaint(
        sliderCtx: CanvasRenderingContext2D,
        canvasCtx: CanvasRenderingContext2D,
    ): void {
        const pixelRatio = window.devicePixelRatio || 1;
    }
</script>

<ToolBody>
    {#snippet sidebar()}
        <h1>Color picker</h1>
        <hr />
        <div class="flex flex-row overflow-hidden rounded-sm bg-back-2">
            <button
                class="size-7 cursor-pointer bg-red-500"
                onclick={(event) => {
                    const input = event.currentTarget.nextElementSibling as HTMLInputElement;
                    navigator.clipboard.writeText(input.value);
                    input.select();
                }}
            >
                <CopyIcon
                    class={[
                        "size-full p-0.75",
                        "bg-(--color) contrasting-(--color) hover:bg-(--color)/40",
                    ]}
                    style={`--color: ${displayHex};`}
                />
            </button>
            <input
                class="h-7 grow border-none bg-transparent px-1 py-0"
                type="text"
                value="#ff5733"
                readonly
            />
        </div>
    {/snippet}

    <div class="flex size-full items-center justify-center">
        <div
            class={[
                "relative max-w-full p-4",
                "grid grid-cols-2 grid-rows-2 items-center justify-items-center gap-4",
            ]}
        >
            <div class="flex flex-col gap-1">
                <Canvas
                    class="h-45 w-full max-w-80 rounded-sm border-2 border-dashed border-back-2"
                    contextType="2d"
                    bind:context={canvasContext1}
                />
                <ColorPickerSlider
                    class="rounded-sm border-2 border-dashed border-back-2"
                    bind:value={
                        () => editorColor.getIndex(0), (value) => editorColor.setIndex(0, value)
                    }
                    contextType="2d"
                    bind:context={sliderContext1}
                />
            </div>
            <div class="flex flex-col gap-1">
                <Canvas
                    class="h-45 w-full max-w-80 rounded-sm border-2 border-dashed border-back-2"
                    contextType="2d"
                    bind:context={canvasContext2}
                />
                <ColorPickerSlider
                    class="rounded-sm border-2 border-dashed border-back-2"
                    bind:value={
                        () => editorColor.getIndex(1), (value) => editorColor.setIndex(1, value)
                    }
                    contextType="2d"
                    bind:context={sliderContext2}
                />
            </div>
            <div class="flex flex-col gap-1">
                <Canvas
                    class="h-45 w-full max-w-80 rounded-sm border-2 border-dashed border-back-2"
                    contextType="2d"
                    bind:context={canvasContext3}
                />
                <ColorPickerSlider
                    class="rounded-sm border-2 border-dashed border-back-2"
                    bind:value={
                        () => editorColor.getIndex(2), (value) => editorColor.setIndex(2, value)
                    }
                    contextType="2d"
                    bind:context={sliderContext3}
                />
            </div>
            <div class="flex flex-col gap-1">
                <Canvas
                    class="h-45 w-full max-w-80 rounded-sm border-2 border-dashed border-back-2"
                    contextType="2d"
                    bind:context={canvasContext_alpha}
                />
                <ColorPickerSlider
                    class="rounded-sm border-2 border-dashed border-back-2"
                    bind:value={
                        () => editorColor.getIndex(3), (value) => editorColor.setIndex(3, value)
                    }
                    contextType="2d"
                    bind:context={sliderContext_alpha}
                />
            </div>
        </div>
    </div>
</ToolBody>
