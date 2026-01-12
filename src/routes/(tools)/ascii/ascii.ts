import {
    compilePostProcessing,
    runShaderChain,
    type ShaderChainEntry,
} from "$lib/glutils/postprocessing";
import gaussianShaderCode from "./shaders/gaussian.frag?raw";
import sobelShaderCode from "./shaders/sobel.frag?raw";
import nonMaximumSuppressionShaderCode from "./shaders/nms.frag?raw";
import encodingShaderCode from "./shaders/encode.frag?raw";

export const CHARACTERS_LIGHTNESS = [" ", ".", ":", "~", "=", "+", "*", "#", "%", "@"] as const;
// export const CHARACTERS_EDGE = ["-", "\\", "|", "/", "-", "\\", "|", "/"] as const; // Clockwise starting from bottom

export const CHARACTERS_EDGE = ["-", "|", "/", "\\"] as const;

/**
 *
 * @param image Image to downscale
 * @param dimensions Dimensions to scale the image to
 * @returns A data URL of the downscaled image
 */
export function naiveDownscale(
    image: HTMLImageElement,
    dimensions: { width: number; height: number },
): string {
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Could not get 2D context for downscaling.");
    }
    ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    return canvas.toDataURL();
}

async function prepareChain(
    glCtx: WebGL2RenderingContext,
    image: HTMLImageElement,
    dimensions: { width: number; height: number },
    settings: { luma: boolean; edge: boolean },
    lastInject?: () => void,
): Promise<ShaderChainEntry[]> {
    // Enable required extensions
    if (!glCtx.getExtension("EXT_color_buffer_float")) {
        throw new Error("Required extension EXT_color_buffer_float not supported");
    }
    if (!glCtx.getExtension("OES_texture_float_linear")) {
        console.warn("Extension OES_texture_float_linear not supported");
    }

    const imageBitmap = await createImageBitmap(image, {
        resizeWidth: dimensions.width,
        resizeHeight: dimensions.height,
        resizeQuality: "high",
    });

    const imageTexture = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, imageTexture);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, glCtx.RGBA, glCtx.UNSIGNED_BYTE, imageBitmap);

    const prepGaussian = (shader: WebGLProgram, direction: [number, number]) => {
        const sigma = 1.0;
        const kernelRadius = 3;

        const sigmaLocation = glCtx.getUniformLocation(shader, "u_sigma");
        glCtx.uniform1f(sigmaLocation, sigma);
        const kernelRadiusLocation = glCtx.getUniformLocation(shader, "u_kernelRadius");
        glCtx.uniform1i(kernelRadiusLocation, kernelRadius);
        const directionLocation = glCtx.getUniformLocation(shader, "u_direction");
        glCtx.uniform2f(directionLocation, direction[0], direction[1]);
    };

    const shaderChain: ShaderChainEntry[] = [
        {
            shader: compilePostProcessing(glCtx, gaussianShaderCode),
            dimensions: { width: dimensions.width, height: dimensions.height },
            frameOptions: {
                filter: glCtx.LINEAR,
                internalFormat: glCtx.RGBA32F,
                format: glCtx.RGBA,
                type: glCtx.FLOAT,
            },
            pre: (shader: WebGLProgram) => {
                // Set the initial input texture to the image
                glCtx.activeTexture(glCtx.TEXTURE1);
                glCtx.bindTexture(glCtx.TEXTURE_2D, imageTexture);
                const inputLocation = glCtx.getUniformLocation(shader, "u_inputTexture");
                glCtx.uniform1i(inputLocation, 1);

                prepGaussian(shader, [1.0, 0.0]); // Horizontal pass
            },
        },
        {
            shader: compilePostProcessing(glCtx, gaussianShaderCode),
            dimensions: { width: dimensions.width, height: dimensions.height },
            frameOptions: {
                filter: glCtx.LINEAR,
                internalFormat: glCtx.RGBA32F,
                format: glCtx.RGBA,
                type: glCtx.FLOAT,
            },
            pre: (shader: WebGLProgram) => {
                prepGaussian(shader, [0.0, 1.0]); // Vertical pass
            },
        },
        {
            shader: compilePostProcessing(glCtx, sobelShaderCode),
            dimensions: {
                width: dimensions.width,
                height: dimensions.height,
            },
            frameOptions: {
                filter: glCtx.LINEAR,
                internalFormat: glCtx.RG32F,
                format: glCtx.RG,
                type: glCtx.FLOAT,
            },
        },

        {
            shader: compilePostProcessing(glCtx, nonMaximumSuppressionShaderCode),
            dimensions: {
                width: dimensions.width,
                height: dimensions.height,
            },
            // Output to a u8 texture since we only need to read back the data to the CPU
            frameOptions: {
                filter: glCtx.NEAREST,
                // Unsigned int output
                internalFormat: glCtx.R8UI,
                format: glCtx.RED_INTEGER,
                type: glCtx.UNSIGNED_BYTE,
            },
            pre(shader) {
                const thresholdLocation = glCtx.getUniformLocation(shader, "u_threshold");
                glCtx.uniform1f(thresholdLocation, 0.1);
            },
        },
        {
            shader: compilePostProcessing(
                glCtx,
                encodingShaderCode
                    .replace("#{luminanceCharacterLength}", CHARACTERS_LIGHTNESS.length.toString())
                    .replace("#{edgeCharacterLength}", CHARACTERS_EDGE.length.toString()),
            ),
            dimensions: {
                width: dimensions.width,
                height: dimensions.height,
            },
            frameOptions: {
                filter: glCtx.NEAREST,
                internalFormat: glCtx.R8UI,
                format: glCtx.RED_INTEGER,
                type: glCtx.UNSIGNED_BYTE,
            },
            pre(shader) {
                // Scuffed text encoder approach to get the UTF-8 char codes of the characters
                const luminanceCharCodes = CHARACTERS_LIGHTNESS.map((char) => {
                    const encoder = new TextEncoder();
                    return encoder.encode(char)[0];
                });
                const edgeCharCodes = CHARACTERS_EDGE.map((char) => {
                    const encoder = new TextEncoder();
                    return encoder.encode(char)[0];
                });
                const luminanceLocation = glCtx.getUniformLocation(shader, "u_luminanceCharacters");
                const edgeLocation = glCtx.getUniformLocation(shader, "u_edgeCharacters");
                glCtx.uniform1uiv(luminanceLocation, luminanceCharCodes);
                glCtx.uniform1uiv(edgeLocation, edgeCharCodes);

                // Enable/disable luminance and edge usage
                const useLumaLocation = glCtx.getUniformLocation(shader, "u_useLuminance");
                const useEdgeLocation = glCtx.getUniformLocation(shader, "u_useEdge");
                glCtx.uniform1i(useLumaLocation, settings.luma ? 1 : 0);
                glCtx.uniform1i(useEdgeLocation, settings.edge ? 1 : 0);

                // BInd original image texture for luminance sampling
                glCtx.activeTexture(glCtx.TEXTURE2);
                glCtx.bindTexture(glCtx.TEXTURE_2D, imageTexture);
                const originalLocation = glCtx.getUniformLocation(shader, "u_originalTexture");
                glCtx.uniform1i(originalLocation, 2);
            },
            post: lastInject,
        },
    ];
    return shaderChain;
}

export async function asciifyImage(
    glCtx: WebGL2RenderingContext,
    image: HTMLImageElement,
    dimensions: { width: number; height: number },
    settings: { color: boolean; luma: boolean; edge: boolean },
): Promise<string> {
    // We prepare to capture the output from the last shader in the chain
    const pixelData = new Uint8Array(dimensions.width * dimensions.height);
    // Create the shader chain
    const shaderChain = await prepareChain(glCtx, image, dimensions, settings, () => {
        performance.mark("asciify-readpixels-start");
        glCtx.readPixels(
            0,
            0,
            dimensions.width,
            dimensions.height,
            glCtx.RED_INTEGER,
            glCtx.UNSIGNED_BYTE,
            pixelData,
        );
        performance.mark("asciify-readpixels-end");
        performance.measure(
            "asciify readPixels",
            "asciify-readpixels-start",
            "asciify-readpixels-end",
        );
    });

    performance.mark("asciify-shader-start");
    runShaderChain(glCtx, shaderChain);
    performance.mark("asciify-shader-end");
    performance.measure(
        "asciify post-processing frame",
        "asciify-shader-start",
        "asciify-shader-end",
    );

    performance.mark("asciify-decode-start");
    const decoder = new TextDecoder("utf-8");
    // Pixel data is encoded as UTF-8 bytes
    const asciiData = decoder.decode(pixelData);
    // Insert line breaks
    let text = "";
    for (let i = dimensions.width; i <= asciiData.length; i += dimensions.width) {
        text += asciiData.slice(i - dimensions.width, i);
        if (i < asciiData.length) text += "\n";
    }
    performance.mark("asciify-decode-end");
    performance.measure("asciify decode", "asciify-decode-start", "asciify-decode-end");

    return text;
}
