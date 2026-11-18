import type { ShaderId } from '../shared/settings';

/**
 * Shader backgrounds ported from 映间 MARGIN (MIT, © 2026 jiuyang5354) — same fbm noise
 * and palettes, trimmed to the five that suit a video site.
 */
const COMMON = `
precision mediump float;
uniform vec2 u_res; uniform float u_t; uniform vec3 u_c1; uniform vec3 u_c2; uniform vec3 u_c3; uniform vec3 u_bg;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }
`;

const BODIES: Record<ShaderId, string> = {
  aurora: `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; vec2 p=vec2(uv.x*u_res.x/u_res.y, uv.y);
  float t=u_t*.05;
  float w=fbm(vec2(p.x*1.4+t, t*.6));
  float band=smoothstep(.0,.55,uv.y-.18+w*.35)*smoothstep(1.05,.45,uv.y+w*.25);
  float rays=.55+.45*sin(p.x*9.+w*6.+u_t*.15);
  vec3 col=mix(u_c1,u_c2,smoothstep(.2,.8,w));
  col=mix(col,u_c3,smoothstep(.55,1.,uv.y+w*.3));
  vec3 c=mix(u_bg,col,band*rays*.9);
  gl_FragColor=vec4(c,1.);
}`,
  silk: `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; vec2 p=vec2(uv.x*u_res.x/u_res.y, uv.y)*1.6;
  float t=u_t*.04;
  vec2 q=vec2(fbm(p+t), fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+2.*q+vec2(1.7,9.2)+t*.7), fbm(p+2.*q+vec2(8.3,2.8)));
  float s=.5+.5*sin((p.x+p.y*.6)*3.+r.x*6.);
  float sheen=pow(s,3.);
  vec3 col=mix(u_c1,u_c2,clamp(r.y*1.4-.2,0.,1.));
  col=mix(col,u_c3,sheen*.55);
  gl_FragColor=vec4(mix(u_bg,col,.55+.35*q.x),1.);
}`,
  mesh: `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float a=u_res.x/u_res.y; vec2 p=vec2(uv.x*a,uv.y);
  float t=u_t*.08;
  p+=.08*vec2(fbm(p*2.+t), fbm(p*2.-t));
  vec2 c1=vec2(a*(.2+.15*sin(t*1.1)), .25+.15*cos(t*.9));
  vec2 c2=vec2(a*(.8+.12*cos(t*.7)), .3+.2*sin(t*1.3));
  vec2 c3=vec2(a*(.55+.2*sin(t*.5)), .85+.1*cos(t*1.7));
  vec2 c4=vec2(a*(.1+.1*cos(t*1.5)), .9+.08*sin(t));
  float w1=1./pow(distance(p,c1)+.08,2.), w2=1./pow(distance(p,c2)+.08,2.), w3=1./pow(distance(p,c3)+.08,2.), w4=1./pow(distance(p,c4)+.08,2.)*.6;
  vec3 col=(u_c1*w1+u_c2*w2+u_c3*w3+u_bg*w4)/(w1+w2+w3+w4);
  gl_FragColor=vec4(col,1.);
}`,
  grain: `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; vec2 p=vec2(uv.x*u_res.x/u_res.y, uv.y);
  float t=u_t*.03;
  float n=fbm(p*1.2+vec2(t,-t*.7));
  float m=fbm(p*.8-vec2(t*.5,t));
  vec3 col=mix(u_c1,u_c2,smoothstep(.25,.75,n));
  col=mix(col,u_c3,smoothstep(.5,.85,m)*.8);
  col=mix(u_bg,col,smoothstep(-.1,.9,uv.y*.6+n*.7));
  float g=hash(floor(gl_FragCoord.xy))-.5;
  gl_FragColor=vec4(col+g*.035,1.);
}`,
  ice: `
void main(){
  vec2 uv=gl_FragCoord.xy/u_res; float a=u_res.x/u_res.y; vec2 p=vec2(uv.x*a,uv.y);
  float t=u_t*.06;
  vec2 b1=vec2(a*(.72+.08*sin(t*1.3)), .62+.1*cos(t));
  vec2 b2=vec2(a*(.28+.1*cos(t*.8)), .22+.08*sin(t*1.1));
  vec2 b3=vec2(a*(.9+.05*sin(t*.6)), .15+.06*cos(t*1.7));
  float n=fbm(p*2.2+t);
  float g1=exp(-pow(distance(p,b1)/(.30+.04*n),2.));
  float g2=exp(-pow(distance(p,b2)/(.22+.04*n),2.));
  float g3=exp(-pow(distance(p,b3)/.16,2.));
  vec3 col=u_bg;
  col=mix(col,u_c3,smoothstep(.2,1.,uv.y*.5+n*.6)*.7);
  col=mix(col,u_c2,g2*.75+g3*.5);
  col=mix(col,u_c1,g1*.85);
  float d=p.x*.8-p.y+.15*sin(t);
  float streak=exp(-pow((fract(d*.9+.35)-.5)*14.,2.))*.35 + exp(-pow((fract(d*.9+.05)-.5)*30.,2.))*.25;
  col+=streak*(.6+.4*n)*vec3(1.)*(1.-g1*.5)*.6;
  gl_FragColor=vec4(col,1.);
}`,
};

type RGB = [number, number, number];
const hex = (s: string): RGB => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as RGB;

interface Palette {
  bg: RGB;
  c: [RGB, RGB, RGB];
}

const PALETTES: Record<'light' | 'dark', Record<ShaderId, Palette>> = {
  dark: {
    aurora: { bg: hex('#0d0e12'), c: [hex('#1fd1a5'), hex('#2b6cff'), hex('#b44cff')] },
    silk: { bg: hex('#0f0f13'), c: [hex('#2a2440'), hex('#123a52'), hex('#8fb6d9')] },
    mesh: { bg: hex('#101015'), c: [hex('#173b6b'), hex('#5b2a6e'), hex('#0e5a5a')] },
    grain: { bg: hex('#0e0e10'), c: [hex('#3a1f2b'), hex('#1c3350'), hex('#c06a3c')] },
    ice: { bg: hex('#0f1014'), c: [hex('#2b5fd9'), hex('#1b2f5e'), hex('#1a1d26')] },
  },
  light: {
    aurora: { bg: hex('#f5f4f1'), c: [hex('#9de8d2'), hex('#a9c4ff'), hex('#e0b8ff')] },
    silk: { bg: hex('#f4f2ee'), c: [hex('#e8e1f2'), hex('#d4e8f2'), hex('#ffffff')] },
    mesh: { bg: hex('#f5f4f1'), c: [hex('#bfe0ff'), hex('#ffd1e3'), hex('#c9f2e3')] },
    grain: { bg: hex('#f3f1ec'), c: [hex('#f7d9c4'), hex('#cfdcf2'), hex('#f2b48f')] },
    ice: { bg: hex('#f5f4f1'), c: [hex('#6f9cf2'), hex('#c3d6fb'), hex('#e9eef8')] },
  },
};

const VERT = 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }';

export class BackgroundLayer {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private shader: ShaderId | 'off' = 'off';
  private theme: 'light' | 'dark' = 'light';
  private raf = 0;
  private start = 0;
  private last = 0;
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'margin-bg';
    this.el.hidden = true;
    this.el.setAttribute('aria-hidden', 'true');
    const scrim = document.createElement('div');
    scrim.className = 'margin-bg-scrim';
    this.el.append(scrim);
    (document.body ?? document.documentElement).append(this.el);
    new ResizeObserver(() => this.resize()).observe(this.el);
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', this.updateAnimation);
    this.motion.addEventListener('change', this.updateAnimation);
  }

  apply(shader: ShaderId | 'off', intensity: number, theme: 'light' | 'dark'): void {
    this.theme = theme;
    this.el.style.setProperty('--margin-bg-o', String(intensity));
    if (shader === 'off') {
      this.shader = 'off';
      this.stop();
      this.el.hidden = true;
      this.el.toggleAttribute('data-off', true);
      return;
    }
    this.shader = shader;
    this.el.hidden = false;
    this.el.toggleAttribute('data-off', false);
    if (!this.program || this.programShader !== shader) {
      this.start = performance.now();
      if (!this.compile(shader)) {
        this.el.hidden = true;
        return;
      }
      this.resize();
    }
    this.updateAnimation();
  }

  private programShader: ShaderId | null = null;

  private ensureCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      // The canvas is created only once the layer is actually shown; creating it at
      // document_start (before the page has a layout box) leaves it unpainted in Chrome.
      this.el.prepend(this.canvas);
      this.resize();
    }
    return this.canvas;
  }

  private compile(shader: ShaderId): boolean {
    const canvas = this.ensureCanvas();
    if (!this.gl) {
      this.gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        // Keep frames readable to screenshots and to the compositor even when a frame
        // is missed; the buffer is small (half resolution) so the cost is negligible.
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
      });
      if (!this.gl) return false;
      const buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);
      this.gl.enableVertexAttribArray(0);
      this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    }
    const gl = this.gl;
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, COMMON + BODIES[shader]);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.warn('[margin] shader failed', gl.getShaderInfoLog(fs));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return false;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[margin] program failed', gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return false;
    }
    gl.useProgram(prog);
    this.program = prog;
    this.programShader = shader;
    this.uniforms = {};
    for (const name of ['u_res', 'u_t', 'u_c1', 'u_c2', 'u_c3', 'u_bg']) {
      this.uniforms[name] = gl.getUniformLocation(prog, name);
    }
    return true;
  }

  private resize(): void {
    const canvas = this.canvas;
    if (!canvas || !this.gl) return;
    const scale = Math.min(devicePixelRatio || 1, 2) * 0.5;
    const w = Math.max(1, Math.round(innerWidth * scale));
    const h = Math.max(1, Math.round(innerHeight * scale));
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    this.gl.viewport(0, 0, w, h);
    this.draw(performance.now());
  }

  private draw(now: number): void {
    const gl = this.gl;
    if (!gl || !this.program || this.shader === 'off' || !this.canvas) return;
    const pal = PALETTES[this.theme][this.shader];
    if (!pal) return;
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.u_res ?? null, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.u_t ?? null, (now - this.start) / 1000);
    const set = (loc: WebGLUniformLocation | null, c: RGB) => gl.uniform3f(loc, c[0], c[1], c[2]);
    set(this.uniforms.u_c1 ?? null, pal.c[0]);
    set(this.uniforms.u_c2 ?? null, pal.c[1]);
    set(this.uniforms.u_c3 ?? null, pal.c[2]);
    set(this.uniforms.u_bg ?? null, pal.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private updateAnimation = (): void => {
    if (!this.program || this.shader === 'off' || document.hidden) {
      this.stop();
      return;
    }
    if (this.motion.matches) {
      this.stop();
      this.draw(this.start);
      return;
    }
    if (this.raf) return;
    const tick = (now: number) => {
      // 30fps is plenty for slow gradients and keeps the GPU quiet under video playback.
      if (now - this.last >= 32) {
        this.last = now;
        this.draw(now);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
