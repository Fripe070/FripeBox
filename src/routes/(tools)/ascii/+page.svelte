<script lang="ts">
    import { dev } from "$app/environment";
    import CenteredRatio from "$lib/components/CenteredRatio.svelte";
    import ImageUpload from "$lib/components/ImageUpload.svelte";
    import ToolBody from "$lib/components/ToolBody.svelte";
    import { downloadString } from "$lib/utils";
    import { asciifyImage, CHARACTERS_EDGE, CHARACTERS_LIGHTNESS } from "./ascii";

    // State
    let loadedImage = $state<HTMLImageElement | undefined>(undefined);
    let isColorEnabled = $state<boolean>(true);
    let isLumaEnabled = $state<boolean>(true);
    let isEdgeEnabled = $state<boolean>(true);
    let desiredResolution = $state<number>(50);
    let specificFont = $state<string>("monospace");

    // Elements
    let fontMeasurer = $state<HTMLElement | undefined>(undefined);
    let svgContainer = $state<HTMLElement | undefined>(undefined);
    let postProcessingCanvas = $state<HTMLCanvasElement | undefined>(undefined);
    let downscalingCanvas = $state<HTMLCanvasElement | undefined>(undefined);

    // Computed
    let glContext = $derived.by<WebGL2RenderingContext | null>(() => {
        const ctx = postProcessingCanvas?.getContext("webgl2");
        if (!ctx) return null;
        ctx.pixelStorei(ctx.PACK_ALIGNMENT, 1);
        return ctx;
    });
    let simpleContext = $derived.by<CanvasRenderingContext2D | null>(() => {
        const ctx = downscalingCanvas?.getContext("2d");
        if (!ctx) return null;
        return ctx;
    });

    let fontString = $derived(`"${specificFont}", monospace`);
    let fontWidthRatio = $derived.by(() => {
        if (!fontMeasurer) {
            return 1;
        }
        const contentLength = fontMeasurer.textContent?.length ?? 1;
        const fontHeight = parseFloat(getComputedStyle(fontMeasurer).fontSize);
        const averageWidth = fontMeasurer.getBoundingClientRect().width / contentLength;
        if (fontHeight === 0) {
            console.warn("Font height is zero");
            return 1;
        }
        return averageWidth / fontHeight;
    });
    let dimensions = $derived.by<{ width: number; height: number }>(() => {
        if (!loadedImage) return { width: 0, height: 0 };
        let width, height;
        if (loadedImage.width > loadedImage.height) {
            width = desiredResolution;
            height = (desiredResolution * loadedImage.height) / loadedImage.width;
        } else {
            width = (desiredResolution * loadedImage.width) / loadedImage.height;
            height = desiredResolution;
        }
        // Apply font width ratio
        width = width / fontWidthRatio;
        return {
            width: Math.round(width),
            height: Math.round(height),
        };
    });
    let displayWidth = $derived(dimensions.width * fontWidthRatio);

    let asciUpdatedTimestamp = performance.now();
    let asciiText = $state.raw<string | null>(null);
    let asciiImageUrl = $state.raw<string | null>(null);
    $effect(() => {
        if (!loadedImage) return;
        if (!dimensions.width || !dimensions.height) {
            console.warn("Invalid dimensions for ASCII conversion");
            return;
        }
        if (!glContext) {
            console.error("No GL context available for ASCII conversion");
            return;
        }
        console.debug("Generating ASCII art at", dimensions.width, "x", dimensions.height);
        asciifyImage(glContext, loadedImage, dimensions, {
            color: isColorEnabled,
            luma: isLumaEnabled,
            edge: isEdgeEnabled,
        }).then((result) => {
            if (performance.now() <= asciUpdatedTimestamp) return;
            asciiText = result;
            asciUpdatedTimestamp = performance.now();
        });
    });
    $effect(() => {
        asciiImageUrl = null;
        if (!loadedImage || !isColorEnabled) return;
        if (!dimensions.width || !dimensions.height) {
            console.warn("Invalid dimensions for ASCII conversion");
            return;
        }
        if (!simpleContext || !downscalingCanvas) {
            console.error("No 2D context available for ASCII image generation");
            return;
        }
        // Downscale the loaded image to the ASCII dimensions
        downscalingCanvas.width = dimensions.width;
        downscalingCanvas.height = dimensions.height;
        simpleContext.imageSmoothingEnabled = false;
        simpleContext.clearRect(0, 0, dimensions.width, dimensions.height);
        simpleContext.drawImage(
            loadedImage,
            0,
            0,
            downscalingCanvas.width,
            downscalingCanvas.height,
        );
        // Save it as a data URL
        asciiImageUrl = downscalingCanvas.toDataURL();
    });

    let textAnchor = $state<Element | undefined>(undefined);
    $effect(() => {
        if (!textAnchor) return;
        if (!asciiText) return;
        // Append <text> elements manually to avoid svelte reactivity overhead
        textAnchor.innerHTML = "";
        const lines = asciiText.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textElem.setAttribute("x", "0");
            textElem.setAttribute("y", i.toString());
            textElem.setAttribute("textLength", displayWidth.toString());
            textElem.setAttribute("lengthAdjust", "spacingAndGlyphs");
            textElem.textContent = lines[i];
            textAnchor.appendChild(textElem);
        }
    });
</script>

<ToolBody>
    {#snippet sidebar()}
        <h1>ASCII Art Maker</h1>
        <hr />

        <div>
            <div>Download as</div>
            <div class="flex flex-row justify-center gap-2">
                <button
                    class={["link", !asciiText && "pointer-events-none opacity-50"]}
                    onclick={() => {
                        if (!asciiText) return;
                        downloadString("ascii.txt", asciiText);
                    }}
                >
                    TXT
                </button>
                <button
                    class={[
                        "link",
                        (!asciiText || !svgContainer) && "pointer-events-none opacity-50",
                    ]}
                    onclick={() => {
                        if (!asciiText || !svgContainer) return;
                        const html = svgContainer.innerHTML;
                        downloadString("ascii.svg", html);
                    }}
                >
                    SVG
                </button>
            </div>
        </div>
        <ImageUpload bind:image={loadedImage} />

        <div class="grid grid-cols-2 gap-2">
            <label class="col-span-2 flex items-center justify-center gap-2">
                <input type="checkbox" bind:checked={isColorEnabled} class="" />
                Enable color
            </label>
            <label class="flex items-center justify-center gap-2">
                <input type="checkbox" bind:checked={isEdgeEnabled} class="" />
                Draw Edges
            </label>
            <label class="flex items-center justify-center gap-2">
                <input type="checkbox" bind:checked={isLumaEnabled} class="" />
                Use Luma
            </label>
        </div>

        <h4 class="mt-1">Resolution</h4>
        <input
            type="number"
            bind:value={desiredResolution}
            min="1"
            class="border-back-0 bg-back-2"
        />
        <input
            type="range"
            bind:value={desiredResolution}
            min="16"
            max="128"
            class="accent-accent"
        />

        <h4 class="mt-1">Font</h4>
        <input
            type="text"
            list="font-list"
            bind:value={specificFont}
            class="w-full border-back-0 bg-back-2"
            style:font-family={fontString}
        />
        <datalist id="font-list">
            <option value="monospace"></option>
        </datalist>
    {/snippet}

    <canvas bind:this={postProcessingCanvas} class="hidden"></canvas>
    <canvas bind:this={downscalingCanvas} class="hidden"></canvas>
    <pre
        bind:this={fontMeasurer}
        class="pointer-events-none invisible absolute inline size-fit"
        style:font-family={fontString}>{[...CHARACTERS_LIGHTNESS, ...CHARACTERS_EDGE].join(
            "",
        )}</pre>

    <div class="relative flex size-full items-center justify-center p-4">
        <CenteredRatio aspectRatio={!loadedImage ? 1 : displayWidth / dimensions.height}>
            <div bind:this={svgContainer} class="max-size-full *:size-full">
                {#if asciiText}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 {displayWidth} {dimensions.height}"
                        width={displayWidth}
                        height={dimensions.height}
                        style:font-family={fontString}
                    >
                        <style>
                            text {
                                font-size: 1px;
                                white-space: pre;
                                fill: currentColor;
                                dominant-baseline: hanging;
                            }
                        </style>
                        {#if asciiImageUrl}
                            <defs>
                                <clipPath id="text-clip" bind:this={textAnchor}> </clipPath>
                            </defs>
                            <image
                                href={asciiImageUrl}
                                x="0"
                                y="0"
                                width={displayWidth}
                                height={dimensions.height}
                                preserveAspectRatio="none"
                                style="image-rendering: pixelated;"
                                clip-path="url(#text-clip)"
                            />
                        {:else}
                            <g bind:this={textAnchor}></g>
                        {/if}
                    </svg>
                {/if}
            </div>
        </CenteredRatio>

        <span
            class={[
                "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-sm bg-back-1 px-1 text-front-1",
                "flex flex-col items-center",
            ]}
        >
            {dimensions.width.toFixed(0)} x {dimensions.height.toFixed(0)}
            : {fontWidthRatio.toFixed(2)}
            @ {(displayWidth / dimensions.height).toFixed(2)}
        </span>
    </div>
</ToolBody>
