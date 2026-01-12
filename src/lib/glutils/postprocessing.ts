import quadVertexCode from "./shaders/quad.vert?raw";
import { compileShader } from "$lib/webgl";

function makeFramebuffer(
    glCtx: WebGL2RenderingContext,
    width: number,
    height: number,
    frameOptions: FrameOptions,
): { framebuffer: WebGLFramebuffer; texture: WebGLTexture } {
    const framebuffer = glCtx.createFramebuffer();
    if (!framebuffer) throw new Error("Could not create framebuffer");

    const texture = glCtx.createTexture();
    if (!texture) throw new Error("Could not create texture for framebuffer");
    glCtx.activeTexture(glCtx.TEXTURE0);
    glCtx.bindTexture(glCtx.TEXTURE_2D, texture);
    glCtx.texImage2D(
        glCtx.TEXTURE_2D,
        0,
        frameOptions.internalFormat,
        width,
        height,
        0,
        frameOptions.format,
        frameOptions.type,
        null,
    );
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, frameOptions.filter);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, frameOptions.filter);
    glCtx.texParameteri(
        glCtx.TEXTURE_2D,
        glCtx.TEXTURE_WRAP_S,
        frameOptions.wrapping ?? glCtx.CLAMP_TO_EDGE,
    );
    glCtx.texParameteri(
        glCtx.TEXTURE_2D,
        glCtx.TEXTURE_WRAP_T,
        frameOptions.wrapping ?? glCtx.CLAMP_TO_EDGE,
    );

    glCtx.bindFramebuffer(glCtx.FRAMEBUFFER, framebuffer);
    glCtx.framebufferTexture2D(
        glCtx.FRAMEBUFFER,
        glCtx.COLOR_ATTACHMENT0,
        glCtx.TEXTURE_2D,
        texture,
        0,
    );

    const status = glCtx.checkFramebufferStatus(glCtx.FRAMEBUFFER);
    if (status !== glCtx.FRAMEBUFFER_COMPLETE) {
        throw new Error("Framebuffer is not complete: " + status.toString());
    }
    return { framebuffer, texture };
}

function reportGLError(glCtx: WebGL2RenderingContext, context: string): void {
    const error = glCtx.getError();
    if (error === glCtx.NO_ERROR) return;
    let msg = "WebGL Error " + context + ": " + error;
    // Check for common ones to translate the error code
    switch (error) {
        case glCtx.INVALID_ENUM:
            msg += " INVALID_ENUM";
            break;
        case glCtx.INVALID_VALUE:
            msg += " INVALID_VALUE";
            break;
        case glCtx.INVALID_OPERATION:
            msg += " INVALID_OPERATION";
            break;
        case glCtx.OUT_OF_MEMORY:
            msg += " OUT_OF_MEMORY";
            break;
        case glCtx.INVALID_FRAMEBUFFER_OPERATION:
            msg += " INVALID_FRAMEBUFFER_OPERATION";
            break;
        default:
            msg += " Unknown WebGL error code.";
    }
    console.error(msg);
}

export function compilePostProcessing(
    glCtx: WebGL2RenderingContext,
    fragmentShaderCode: string,
): WebGLProgram {
    return compileShader(glCtx, {
        vertex: quadVertexCode,
        fragment: fragmentShaderCode,
    });
}

// TODO: Cache framebuffers and textures for reuse between runs.
// Will also require significant changes elsewhere.
/**
 * @param glCtx WebGL2 Context
 * @param entries Shader chain entries to run in order
 * @param inputTexture Optional input texture for the first entry.
 */
export function runShaderChain(
    glCtx: WebGL2RenderingContext,
    entries: ShaderChainEntry[],
    inputTexture: WebGLTexture | null = null,
): void {
    let firstTexturePreserve: boolean = inputTexture !== null;

    const vertexBuffer = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, vertexBuffer);
    glCtx.bufferData(
        glCtx.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), // 4 corners of a quad
        glCtx.STATIC_DRAW,
    );

    const maxWIdth = Math.max(...entries.map((e) => e.dimensions.width));
    const maxHeight = Math.max(...entries.map((e) => e.dimensions.height));
    glCtx.canvas.width = maxWIdth;
    glCtx.canvas.height = maxHeight;

    for (const [index, entry] of entries.entries()) {
        console.debug("Running chain entry " + index, entry);
        // Evaluate if it's a function
        const entryShader: WebGLProgram =
            typeof entry.shader === "function" ? entry.shader() : entry.shader;

        glCtx.useProgram(entryShader);

        // Prepare output viewport
        glCtx.canvas.width = entry.dimensions.width;
        glCtx.canvas.height = entry.dimensions.height;
        glCtx.viewport(0, 0, entry.dimensions.width, entry.dimensions.height);

        // Prepare framebuffer and the output texture, or null to draw directly to the canvas
        let framebuffer: WebGLFramebuffer | null = null;
        let texture: WebGLTexture | null = null;
        if (entry.frameOptions) {
            const result = makeFramebuffer(
                glCtx,
                entry.dimensions.width,
                entry.dimensions.height,
                entry.frameOptions,
            );
            framebuffer = result.framebuffer;
            texture = result.texture;
        }
        glCtx.bindFramebuffer(glCtx.FRAMEBUFFER, framebuffer);

        // Bind the input texture
        glCtx.activeTexture(glCtx.TEXTURE1);
        glCtx.bindTexture(glCtx.TEXTURE_2D, inputTexture);
        const inputLocation = glCtx.getUniformLocation(entryShader, "u_inputTexture");
        glCtx.uniform1i(inputLocation, 1);

        // Pass the resolution uniform if it exists
        const resolutionLocation = glCtx.getUniformLocation(entryShader, "u_resolution");
        if (resolutionLocation)
            glCtx.uniform2i(resolutionLocation, entry.dimensions.width, entry.dimensions.height);

        // Set vertex positions
        const positionLocation = glCtx.getAttribLocation(entryShader, "a_position");
        glCtx.enableVertexAttribArray(positionLocation);
        glCtx.vertexAttribPointer(positionLocation, 2, glCtx.FLOAT, false, 0, 0);

        reportGLError(glCtx, "before drawing shader chain entry " + index);

        // Allow doing any extra preparation per entry
        entry.pre?.(entryShader);
        reportGLError(glCtx, "after pre for shader chain entry " + index);

        // Render
        glCtx.drawArrays(glCtx.TRIANGLE_FAN, 0, 4);
        reportGLError(glCtx, "after drawing shader chain entry " + index);

        // Copy the canvas into a texture if none exists
        if (!texture) {
            const copyTexture = glCtx.createTexture();
            glCtx.bindTexture(glCtx.TEXTURE_2D, copyTexture);
            glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
            glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
            glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.NEAREST);
            glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.NEAREST);
            // Direct GPU-to-GPU copy
            glCtx.copyTexImage2D(
                glCtx.TEXTURE_2D,
                0,
                glCtx.RGBA,
                0,
                0,
                entry.dimensions.width,
                entry.dimensions.height,
                0,
            );
            texture = copyTexture;
        }

        // Allow doing any extra post-processing per entry
        entry.post?.(entryShader);
        reportGLError(glCtx, "after post for shader chain entry " + index);

        // Cleanup
        if (framebuffer) glCtx.deleteFramebuffer(framebuffer);
        if (inputTexture && !firstTexturePreserve) {
            glCtx.deleteTexture(inputTexture);
        }
        inputTexture = texture;
        firstTexturePreserve = false; // Only delete the first input texture if it was created here
    }
}

interface FrameOptions {
    filter: number;
    internalFormat: number;
    format: number;
    type: number;
    wrapping?: number;
}

export interface ShaderChainEntry {
    shader: WebGLProgram | (() => WebGLProgram);
    dimensions: { width: number; height: number };
    frameOptions?: FrameOptions;
    pre?: (shader: WebGLProgram) => void;
    post?: (shader: WebGLProgram) => void;
}
