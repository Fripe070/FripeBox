<script lang="ts">
    import { dev } from "$app/environment";
    import CenteredRatio from "$lib/components/CenteredRatio.svelte";
    import ImageUpload from "$lib/components/ImageUpload.svelte";
    import ToolBody from "$lib/components/ToolBody.svelte";

    let imageFile = $state<File | null>(null);
    let imageUrl = $derived<string | null>(imageFile && URL.createObjectURL(imageFile));
    let resolution = $state<number>(32);
    let colorEnabled = $state<boolean>(true);

    let fontName = $state<string>("monospace");
    let fontFamily = $derived<string>(`"${fontName}", monospace`);
    let fontMeasure: HTMLElement;
    let fontRatio = $state<number>(1);

    let svgContainer = $state<HTMLElement | null>(null);

    let computeCanvas: HTMLCanvasElement;
    let imageRatio = $state(1);

    let dimensions = $derived.by(() => {
        let width, height;
        if (imageRatio < 1) {
            width = resolution;
            height = (resolution * fontRatio) / imageRatio;
        } else {
            height = resolution;
            width = (resolution * imageRatio) / fontRatio;
        }
        return {
            elementWidth: Math.round(width) * fontRatio,
            asciiWidth: Math.round(width),
            height: Math.round(height),
        };
    });

    let downscaledUrl = $state<string | null>(null);
    let renderedAscii = $state<string>("");

    const characters = ["_", ",", ":", "-", "=", "+", "#", "%", "@"] as const;

    $effect(() => {
        if (!fontMeasure) return;
        const height = parseFloat(getComputedStyle(fontMeasure).fontSize);
        const width = fontMeasure.getBoundingClientRect().width / characters.length;
        if (height === 0) {
            console.warn("Font height is zero");
            return;
        }
        fontRatio = width / height;
    });

    let image = new Image();
    let stateInvalidator = $state(0);
    $effect(() => {
        if (!imageUrl) return;
        image.src = imageUrl;
    });
    image.onload = () => {
        imageRatio = image.width / image.height;
        stateInvalidator++;
    };
    $effect(() => {
        [stateInvalidator];
        if (!imageUrl || image.width === 0 || image.height === 0) {
            renderedAscii = "";
            downscaledUrl = null;
            return;
        }

        const ctx = computeCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            console.error("Failed to get 2D context");
            return;
        }

        // Downscale and naive ASCII rendering

        computeCanvas.width = dimensions.asciiWidth;
        computeCanvas.height = dimensions.height;
        ctx.imageSmoothingEnabled = false; // No interpolation
        ctx.drawImage(image, 0, 0, computeCanvas.width, computeCanvas.height);
        const imageData = ctx.getImageData(0, 0, computeCanvas.width, computeCanvas.height);

        downscaledUrl = computeCanvas.toDataURL();

        let ascii = "";
        for (let y = 0; y < computeCanvas.height; y++) {
            for (let x = 0; x < computeCanvas.width; x++) {
                const index = (y * computeCanvas.width + x) * 4;
                const brightness =
                    imageData.data[index] * 0.299 +
                    imageData.data[index + 1] * 0.587 +
                    imageData.data[index + 2] * 0.114;
                const charIndex = Math.floor((brightness / 255) * (characters.length - 1));
                ascii += characters[charIndex];
            }
            ascii += "\n";
        }
        renderedAscii = ascii;
    });

    function downloadString(filename: string, text: string) {
        const element = document.createElement("a");
        const file = new Blob([text], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
    }
</script>

<ToolBody>
    {#snippet sidebar()}
        <h1>ASCII Art Maker</h1>
        <hr />

        <div>
            <div>Download as</div>
            <div class="flex flex-row justify-center gap-2">
                <button
                    class={["link", !renderedAscii && "pointer-events-none opacity-50"]}
                    onclick={() => downloadString("ascii-art.txt", renderedAscii)}
                >
                    TXT
                </button>
                <button
                    class={["link", !svgContainer && "pointer-events-none opacity-50"]}
                    onclick={() => {
                        if (!svgContainer) {
                            console.warn("No SVG container to export");
                            return;
                        }
                        const html = svgContainer.innerHTML;
                        downloadString("ascii-art.svg", html);
                    }}
                >
                    SVG
                </button>
            </div>
        </div>
        <ImageUpload bind:imageFile />

        <label class="flex items-center justify-center gap-2 select-none">
            <input type="checkbox" bind:checked={colorEnabled} class="" />
            Enable color
        </label>

        <h4 class="mt-1">Resolution</h4>
        <input type="number" bind:value={resolution} class="border-back-0 bg-back-2" />
        <input type="range" bind:value={resolution} min="16" max="128" class="accent-accent" />

        <h4 class="mt-1">Font</h4>
        <input
            type="text"
            list="font-list"
            bind:value={fontName}
            class="w-full border-back-0 bg-back-2"
            style:font-family={fontFamily}
        />
        <datalist id="font-list">
            <option value="monospace"></option>
        </datalist>
        <canvas
            bind:this={computeCanvas}
            class={dev ? "pointer-events-none size-70 [image-rendering:pixelated]" : "hidden"}
        ></canvas>
    {/snippet}

    <pre
        bind:this={fontMeasure}
        class="pointer-events-none invisible absolute inline size-fit"
        style:font-family={fontFamily}>{characters.join("")}</pre>

    <div class="relative flex size-full items-center justify-center p-4">
        {#if imageUrl}
            <CenteredRatio aspectRatio={imageRatio}>
                <div bind:this={svgContainer} class="*:size-full">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 {dimensions.elementWidth} {dimensions.height}"
                        width={dimensions.elementWidth}
                        height={dimensions.height}
                    >
                        <style>
                            text {
                                font-size: 1px;
                                white-space: pre;
                                fill: currentColor;
                                dominant-baseline: hanging;
                            }
                        </style>
                        {#snippet asciiGrid()}
                            {#each renderedAscii.split("\n") as line, y}
                                <text
                                    x={0}
                                    {y}
                                    style:font-family={fontFamily}
                                    textLength={dimensions.elementWidth}
                                    lengthAdjust="spacingAndGlyphs">{line}</text
                                >
                            {/each}
                        {/snippet}
                        {#if colorEnabled && downscaledUrl}
                            <defs>
                                <clipPath id="text-clip">
                                    {@render asciiGrid()}
                                </clipPath>
                            </defs>
                            <image
                                href={downscaledUrl}
                                x="0"
                                y="0"
                                width={dimensions.elementWidth}
                                height={dimensions.height}
                                preserveAspectRatio="none"
                                style="image-rendering: pixelated;"
                                clip-path="url(#text-clip)"
                            />
                        {:else}
                            {@render asciiGrid()}
                        {/if}
                    </svg>
                </div>
            </CenteredRatio>

            <span
                class={[
                    "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-sm bg-back-1 px-1 text-front-1",
                    "flex flex-col items-center",
                ]}
            >
                {dimensions.asciiWidth.toFixed(0)} x {dimensions.height.toFixed(0)} : {(
                    1 / fontRatio
                ).toFixed(2)}
            </span>
        {/if}
    </div>
</ToolBody>
