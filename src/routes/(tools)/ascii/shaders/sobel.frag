#version 300 es
precision highp float;
precision highp int;

in vec2 v_texCoord;

uniform sampler2D u_inputTexture;
uniform ivec2 u_resolution;

out vec2 f_gradient;

float getValue(vec2 uv) {
    vec4 pixel = texture(u_inputTexture, uv);
    // Convert to grayscale
    float gray = dot(pixel.rgb, vec3(0.299, 0.587, 0.114));
    return gray;
}

void main() {
    vec2 texel = 1.0 / vec2(u_resolution);

    // Sample the 8 surrounding pixels
    float tl = getValue(v_texCoord + texel * vec2(-1,  1));
    float tc = getValue(v_texCoord + texel * vec2( 0,  1));
    float tr = getValue(v_texCoord + texel * vec2( 1,  1));
    float ml = getValue(v_texCoord + texel * vec2(-1,  0));
    float mr = getValue(v_texCoord + texel * vec2( 1,  0));
    float bl = getValue(v_texCoord + texel * vec2(-1, -1));
    float bc = getValue(v_texCoord + texel * vec2( 0, -1));
    float br = getValue(v_texCoord + texel * vec2( 1, -1));
    
    // Sobel operator to approximate the gradient
    float dx = -tl - ml * 2.0 - bl 
             +  tr + mr * 2.0 + br;
    float dy = -tl - tc * 2.0 - tr 
             +  bl + bc * 2.0 + br;

    f_gradient = vec2(dx, dy);
}
