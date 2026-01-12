#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 v_texCoord;

uniform sampler2D u_inputTexture;
uniform ivec2 u_resolution;
uniform vec2 u_direction;
uniform int u_kernelRadius;
uniform float u_sigma;

out vec4 f_color;

const float PI = 3.1415926535897932384626433832795;

float gaussian(float sigma, float x) {
    float scalar = 1.0 / (sqrt(2.0 * PI * sigma * sigma));
    float exponent = -(x * x) / (2.0 * sigma * sigma);
    return scalar * exp(exponent);
}

void main() {
    vec2 offsetBase = u_direction / vec2(u_resolution);

    f_color = vec4(0.0);
    float sum = 0.0;
    for (int i = -u_kernelRadius; i <= u_kernelRadius; i++) {
        float weight = gaussian(u_sigma, float(i));
        vec4 pixel = texture(u_inputTexture, v_texCoord + float(i) * offsetBase);
        f_color = f_color + pixel * weight;
        sum = sum + weight;
    }
    f_color = f_color / sum;
}
