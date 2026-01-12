<script lang="ts">
    let imageInput: HTMLInputElement;
    let isDraggingOver: boolean = $state(false);

    let {
        file = $bindable(undefined),
        url = $bindable(undefined),
        image = $bindable(undefined),
        class: className = "",
    }: {
        file?: File;
        url?: string;
        image?: HTMLImageElement;
        class?: string | string[];
    } = $props();

    let imageUpdateTimestamp = performance.now();
    function loadImageFile(file: File) {
        url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            if (performance.now() <= imageUpdateTimestamp) return;
            imageUpdateTimestamp = performance.now();
            image = img;
        };
        img.src = url;
    }
</script>

<button
    class={[
        "relative flex flex-col items-center justify-center rounded-sm p-4",
        "cursor-pointer",
        "border border-back-0 bg-back-2 hover:bg-back-2/75",
        isDraggingOver && "border-dashed bg-back-2/75 border-front-1",
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
        if (!files?.length) return;
        loadImageFile(files[0]);
    }}
    onclick={() => {
        imageInput.click();
    }}
>
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
            loadImageFile(files[0]);
        }}
    />
</button>
