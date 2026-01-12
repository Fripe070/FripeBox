#version 300 es
precision highp float;
precision highp int;

in vec2 v_texCoord;

uniform sampler2D u_inputTexture;
uniform ivec2 u_resolution;
uniform float u_threshold;

out uint f_output;

const float PI = 3.1415926535897932384626433832795;

ivec2 quantizeDirection(vec2 dir) {
    int x = 0;
    int y = 0;
    // non-horizontal
    if (abs(dir.y) > sin(PI / 8.0)) {
        y = -int(sign(dir.y));
    }
    // non-vertical
    if (abs(dir.x) > sin(PI / 8.0)) {
        x = int(sign(dir.x));
    }
    return ivec2(x, y);
}

void main() {
    vec2 xy = texture(u_inputTexture, v_texCoord).xy;
    float currentMagnitude = length(xy);

    if (currentMagnitude < u_threshold) {
        f_output = 0u;
        return;
    }

    ivec2 pos = ivec2(v_texCoord * vec2(u_resolution));
    ivec2 dir = quantizeDirection(normalize(xy));

    vec2 forwardSample = texelFetch(u_inputTexture, pos + dir, 0).xy;
    vec2 backwardSample = texelFetch(u_inputTexture, pos - dir, 0).xy;

    if (currentMagnitude < max(length(forwardSample), length(backwardSample))) {
        f_output = 0u;
        return;
    }

    // // Pass direction and magnitude data in a format that can be parsed from JS
    // f_output = vec4(vec2(dir) * 0.5 + 0.5, currentMagnitude, 1.0);

    // Pass direction as one of five integers (0 = no edge, 1 = horizontal, 2 = vertical, 3 = / diagonal, 4 = \ diagonal)
    // At this point we know that it is guaranteed to be an edge, so we can skip magnitude
    if (dir.x == 0 && dir.y != 0) {
        f_output = 1u;
    } else if (dir.x != 0 && dir.y == 0) {
        f_output = 2u;
    } else if (dir.x == dir.y) {
        f_output = 3u;
    } else {
        f_output = 4u;
    }
}
