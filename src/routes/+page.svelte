<script lang="ts">
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
            <!-- Link icon -->
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="1.5em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="mt-1"
            >
                <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                <line x1="8" x2="16" y1="12" y2="12" />
            </svg>
        </div>
        <p>{description}</p>
    </a>
{/snippet}

<div class="flex size-full justify-center">
    <div class="grid size-fit grid-cols-1 gap-4 p-4 *:justify-self-center md:grid-cols-2">
        {@render card(
            "ASCII Art Maker",
            "/ascii",
            "Convert images into ASCII art.",
        )}
    </div>
</div>
