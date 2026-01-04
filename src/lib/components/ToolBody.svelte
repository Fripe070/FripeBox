<script lang="ts">
    import type { Snippet } from "svelte";

    let { children, sidebar }: { children: Snippet; sidebar: Snippet } = $props();
</script>

{#if sidebar}
    <div class={["flex w-(--sidebar-width) flex-col gap-1 bg-back-1 p-3 text-center"]}>
        {@render sidebar()}
    </div>
{/if}
{@render children()}
