type ShaderStage =
    | WebGL2RenderingContext["VERTEX_SHADER"]
    | WebGL2RenderingContext["FRAGMENT_SHADER"];

function compileShaderStage(
    ctx: WebGL2RenderingContext,
    shaderCode: string,
    shaderType: ShaderStage,
): WebGLShader {
    const shader = ctx.createShader(shaderType);
    if (!shader) throw new Error("Failed to create shader object");
    ctx.shaderSource(shader, shaderCode);
    ctx.compileShader(shader);
    return shader;
}

export function compileShader(
    ctx: WebGL2RenderingContext,
    shaders: { vertex: string; fragment: string },
): WebGLProgram {
    const vertexShader = compileShaderStage(ctx, shaders.vertex, ctx.VERTEX_SHADER);
    const fragmentShader = compileShaderStage(ctx, shaders.fragment, ctx.FRAGMENT_SHADER);

    const program = ctx.createProgram();
    if (!program) throw new Error("Failed to create shader program");
    ctx.attachShader(program, vertexShader);
    ctx.attachShader(program, fragmentShader);
    ctx.linkProgram(program);
    ctx.validateProgram(program);
    // Mark shaders for deletion after linking.
    // Will not actually be deleted until the program is deleted
    ctx.deleteShader(vertexShader);
    ctx.deleteShader(fragmentShader);

    // Check if the program linked successfully
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
        const linkingError = ctx.getProgramInfoLog(program);
        const vertexLog = ctx.getShaderInfoLog(vertexShader);
        const fragmentLog = ctx.getShaderInfoLog(fragmentShader);
        ctx.deleteProgram(program);
        throw new Error(
            `Error linking program: ${linkingError}\nVertex Shader Log: ${vertexLog}\nFragment Shader Log: ${fragmentLog}`,
        );
    }
    return program;
}
