<script lang="ts">
    import "./layout.css";

    let { children } = $props();
</script>

<div class="app-body flex flex-col items-center">
    {@render children()}
</div>
