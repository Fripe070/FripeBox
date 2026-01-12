#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

in vec2 v_texCoord;

uniform usampler2D u_inputTexture;
uniform sampler2D u_originalTexture;
uniform ivec2 u_resolution;

const int luminanceCharLength = #{luminanceCharacterLength};
const int edgeCharLength = #{edgeCharacterLength};
uniform uint u_luminanceCharacters[luminanceCharLength];
uniform uint u_edgeCharacters[edgeCharLength];

uniform bool u_useLuminance;
uniform bool u_useEdge;

out uint f_output;

float get_luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    // Integer texture fetch
    ivec2 texelCoord = ivec2(v_texCoord * vec2(u_resolution));
    uint edgeValue = texelFetch(u_inputTexture, texelCoord, 0).r;
    // Original color fetch
    vec3 originalColor = texture(u_originalTexture, v_texCoord).rgb;
    float luminance = get_luminance(originalColor);

    uint charCode = 32u; // Space
    if (u_useLuminance) {
        int lumIndex = int(floor(luminance * float(luminanceCharLength - 1)));
        charCode = u_luminanceCharacters[lumIndex];
    }
    if (u_useEdge && edgeValue > 0u) {
        charCode = u_edgeCharacters[int(edgeValue) - 1];
    }

    f_output = charCode;
}
