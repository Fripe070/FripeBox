<script lang="ts">
    let imageInput: HTMLInputElement;
    let isDraggingOver: boolean = $state(false);

    let {
        imageFile = $bindable(null),
        class: className = "",
        showPreview = false,
    }: {
        imageFile: File | null;
        class?: string | string[];
        showPreview?: boolean;
    } = $props();

    let imageUrl = $derived(showPreview && imageFile && URL.createObjectURL(imageFile));
</script>

<button
    class={[
        "relative flex flex-col items-center justify-center rounded-sm p-4",
        "cursor-pointer transition-colors",
        "border border-back-0 bg-back-2 hover:bg-back-2/75",
        isDraggingOver && "border-dashed bg-back-2/75",
        className,
    ]}
    ondragover={(event) => {
        event.preventDefault();
        isDraggingOver = true;
    }}
    ondragleave={() => {
        isDraggingOver = false;
    }}
    ondrop={(event) => {
        event.preventDefault();
        isDraggingOver = false;
        const files = event.dataTransfer?.files;
        if (files?.length) {
            imageInput.files = files;
            const changeEvent = new Event("change");
            imageInput.dispatchEvent(changeEvent);
        }
    }}
    onclick={() => {
        imageInput.click();
    }}
>
    {#if imageUrl}
        <img
            src={imageUrl}
            alt="Uploaded preview"
            class="absolute inset-0 size-full object-contain opacity-25"
        />
    {/if}
    <div class="font-semibold text-front-0">Upload an image</div>
    <div class="text-front-1 no-underline!">or drag and drop it here</div>
    <input
        bind:this={imageInput}
        class="sr-only"
        type="file"
        accept="image/*"
        onchange={(event) => {
            const input = event.target as HTMLInputElement;
            const files = input.files;
            if (!files?.length) return;
            imageFile = files[0];
        }}
    />
</button>
