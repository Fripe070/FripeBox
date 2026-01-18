<script lang="ts">
    import type { Snippet } from "svelte";
    import MenuIcon from "virtual:icons/lucide/menu";

    let { children, sidebar }: { children: Snippet; sidebar: Snippet } = $props();
    let sidebarElement = $state<HTMLElement | undefined>(undefined);
</script>

{#if sidebar}
    <button
        class="absolute top-2 left-2 z-20 size-8 sm:hidden"
        onclick={() => sidebarElement?.classList.toggle("collapsed")}
    >
        <MenuIcon class="size-full" />
    </button>
    <div
        bind:this={sidebarElement}
        class={[
            "flex h-full shrink-0 flex-col gap-1 overflow-y-auto bg-back-1 p-3 text-center",
            "fixed z-10 w-full",
            "sm:static sm:z-0 sm:w-(--sidebar-width)",
            "sm:is-[collapsed]:translate-x-0 not-sm:[.collapsed]:-translate-x-full",
        ]}
    >
        {@render sidebar()}
        <div class="grow"></div>
        <div class="text-front-3 text-xs">
            <a href="/">Back</a>
        </div>
    </div>
{/if}
{@render children()}
