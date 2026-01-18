<script lang="ts">
    import LinkIcon from "virtual:icons/lucide/link";
</script>

{#snippet card(title: string, href: string, description: string)}
    <a
        class={[
            "no-link flex max-h-60 w-80 max-w-full flex-col overflow-y-auto ",
            "rounded-md bg-back-1 px-3 py-2 shadow-xs hover:bg-back-2",
        ]}
        draggable="false"
        {href}
    >
        <div class="flex justify-between">
            <h2>{title}</h2>
            <LinkIcon class="size-5" />
        </div>
        <p>{description}</p>
    </a>
{/snippet}

<div class="flex size-full justify-center">
    <div class="grid size-fit grid-cols-1 gap-4 p-4 *:justify-self-center md:grid-cols-2">
        {@render card("ASCII Art Maker", "/ascii", "Convert images into ASCII art.")}
    </div>
</div>
