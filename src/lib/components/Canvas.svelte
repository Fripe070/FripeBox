<script lang="ts">
    type ContextProps =
        | { contextType: "2d"; context: CanvasRenderingContext2D | null }
        | { contextType: "webgl"; context: WebGLRenderingContext | null }
        | { contextType: "webgl2"; context: WebGL2RenderingContext | null };

    let {
        class: className = "",
        contextType = "2d",
        context = $bindable(null),
    }: {
        class?: string | string[];
        min?: number;
        max?: number;
    } & ContextProps = $props();

    let canvas = $state<HTMLCanvasElement | undefined>(undefined);
    $effect(() => {
        context = (canvas?.getContext(contextType) as ContextProps["context"]) ?? null;
    });
</script>

<canvas bind:this={canvas} class={className}> </canvas>
