<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        aspectRatio,
        children,
        width = $bindable(0),
        height = $bindable(0),
    }: {
        aspectRatio: number;
        children: Snippet;
        width?: number;
        height?: number;
    } = $props();

    let displayDimensions = $derived.by(() => {
        let w = width;
        let h = width / aspectRatio;
        if (h > height) {
            h = height;
            w = height * aspectRatio;
        }
        return { width: w, height: h };
    });
</script>

<div class="relative size-full" bind:clientWidth={width} bind:clientHeight={height}>
    <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style:width={`${displayDimensions.width}px`}
        style:height={`${displayDimensions.height}px`}
    >
        {@render children()}
    </div>
</div>
