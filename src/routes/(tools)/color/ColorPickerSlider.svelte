<script lang="ts">
    type ContextProps =
        | { contextType: "2d"; context: CanvasRenderingContext2D | null }
        | { contextType: "webgl"; context: WebGLRenderingContext | null }
        | { contextType: "webgl2"; context: WebGL2RenderingContext | null }
        | { contextType?: undefined; context?: null };

    let {
        value = $bindable(0.5),
        class: className = "",
        contextType = "2d",
        context = $bindable(null),
        min = 0,
        max = 1,
    }: {
        value?: number;
        class?: string | string[];
        min?: number;
        max?: number;
    } & ContextProps = $props();

    let inWriteMode: boolean = $state(false);
    let writeInput: HTMLInputElement | undefined = $state(undefined);

    $effect(() => {
        if (!writeInput || inWriteMode) return;
        writeInput.value = value.toFixed(3);
        writeInput.click();
    });

    let canvas = $state<HTMLCanvasElement | undefined>(undefined);
    $effect(() => {
        context = (canvas?.getContext(contextType) as ContextProps["context"]) ?? null;
    });
</script>

<div class={["relative h-8 w-full overflow-hidden", className]}>
    <canvas bind:this={canvas} class="pointer-events-none absolute inset-0 size-full"> </canvas>
    <input
        bind:value
        type="range"
        {min}
        {max}
        step="any"
        class="absolute inset-0 size-full appearance-none"
        ondblclick={() => {
            inWriteMode = true;
            writeInput?.focus();
        }}
    />
    <input
        bind:this={writeInput}
        disabled={!inWriteMode}
        type="number"
        {min}
        {max}
        placeholder={`${min} - ${max}`}
        step="any"
        class={[
            "absolute inset-0 size-full [appearance:textfield] p-0 text-center",
            "bg-dark/50 backdrop-blur-sm",
            !inWriteMode && "hidden",
        ]}
        oninput={(event) => {
            let inputValue = parseFloat((event.target as HTMLInputElement).value);
            if (isNaN(inputValue)) return;
            if (inputValue < min) inputValue = min;
            if (inputValue > max) inputValue = max;
            value = inputValue;
        }}
        onkeyup={(event) => {
            if (["Enter", "Escape"].includes(event.key)) {
                inWriteMode = false;
                writeInput?.blur(); // removes keyboard focus. idk why it's called that
            }
        }}
        onfocusout={() => {
            inWriteMode = false;
        }}
    />
</div>

<style>
    input[type="range"]::-webkit-slider-thumb {
        width: calc(var(--spacing) * 3);
        height: calc(var(--spacing) * 8);
        background-color: transparent;
        appearance: none;
        backdrop-filter: invert(1) contrast(400%);
        border-radius: var(--radius-xs);
    }
    input[type="range"]::-moz-range-thumb {
        width: calc(var(--spacing) * 3);
        height: calc(var(--spacing) * 8);
        background-color: transparent;
        border: none;
        backdrop-filter: invert(1) contrast(400%);
        border-radius: var(--radius-xs);
    }
    input[type="number"],
    input[type="number"]:focus {
        outline: none;
        border: none;
        box-shadow: none;
    }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
</style>
