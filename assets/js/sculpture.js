/* On-demand, five-draw-call viewer for the two local Chrome Infinity GLBs.
 * They contain only indexed triangles, quantized positions/normals and PBR metals.
 * No engine, decoder, external requests or perpetual animation loop. */
const art = new URL('../sculpture/', import.meta.url);
const vertex = `
attribute vec3 position, normal;
uniform mat3 rotation;
uniform float aspect, scale;
varying vec3 point, surface;
void main() {
  point = rotation * (scale * position);
  surface = rotation * normal;
  vec3 p = point - vec3(0., -.213, .03);
  float z = 13.25 - dot(p.yz, vec2(.258819, .965926));
  gl_Position = vec4(3.55556 * p.x, 3.55556 * aspect * dot(p.yz, vec2(.965926, -.258819)), 1.025316 * z - 1.012658, z);
}`;
const fragment = `
precision highp float;
varying vec3 point, surface;
uniform sampler2D studio;
uniform vec3 tint, emission;
uniform float metal, roughness;
void main() {
  vec3 n = normalize(surface), v = normalize(vec3(0., 3.216, 12.829) - point);
  vec3 r = reflect(-v, n);
  vec2 uv = vec2(.5 + atan(r.z,r.x) / 6.2831853, .5 - asin(clamp(r.y,-1.,1.)) / 3.14159265);
  vec3 e = texture2D(studio, uv, 1.1 + roughness * 5.).rgb;
  e *= e;
  vec3 radiance = e / max(vec3(.002), vec3(1.)-e);
  vec3 f0 = mix(vec3(.04), tint, metal);
  vec3 fresnel = f0 + (1.-f0)*pow(1.-max(dot(n,v),0.),5.);
  vec3 x = (radiance*1.18+.065+.035*n.y)*fresnel + tint*(1.-metal)*.24 + emission;
  vec3 mapped = clamp(x*(2.51*x+.03)/(x*(2.43*x+.59)+.14),0.,1.);
  gl_FragColor = vec4(pow(mapped,vec3(1./2.2)),1.);
}`;

async function request(name, signal) {
  const response = await fetch(new URL(name, art), { signal });
  if (!response.ok) throw new Error(`Sculpture asset: ${response.status}`);
  return response;
}

function upload(gl, bytes, buffers) {
  const header = new DataView(bytes), end = 20 + header.getUint32(12, true);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength) throw Error('Invalid sculpture');
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, end - 20)));
  const views = doc.bufferViews.map(view => {
    const buffer = gl.createBuffer(); buffers.push(buffer);
    gl.bindBuffer(view.target, buffer);
    gl.bufferData(view.target, new Uint8Array(bytes, end + 8 + (view.byteOffset || 0), view.byteLength), gl.STATIC_DRAW);
    return buffer;
  });
  const attribute = id => {
    const a = doc.accessors[id];
    return { ...a, buffer: views[a.bufferView], stride: doc.bufferViews[a.bufferView].byteStride || 0 };
  };
  return doc.nodes.flatMap(node => doc.meshes[node.mesh].primitives.map(p => ({
    position: attribute(p.attributes.POSITION), normal: attribute(p.attributes.NORMAL), indices: attribute(p.indices),
    scale: node.scale[0], material: doc.materials[p.material],
  })));
}

export async function mount(canvas, { lite, signal, failed }) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: !lite, stencil: false, powerPreference: 'low-power' });
  if (!gl) throw Error('WebGL unavailable');
  const buffers = [], shaders = [];
  let program, texture, frame = 0, observer, resizer, visible = true;
  const on = (target, event, handler, options) => target.addEventListener(event, handler, { ...options, signal });
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(frame); observer?.disconnect(); resizer?.disconnect();
    for (const b of buffers) gl.deleteBuffer(b);
    for (const s of shaders) gl.deleteShader(s);
    gl.deleteTexture(texture || null); gl.deleteProgram(program || null);
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }, { once: true });
  on(canvas, 'webglcontextlost', e => { e.preventDefault(); failed(); });
  program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const s = gl.createShader(type); shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error('Shader unavailable');
    gl.attachShader(program, s);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Program unavailable');
  const [bytes, blob] = await Promise.all([
    request(lite ? 'infinity-lite.glb' : 'infinity.glb', signal).then(r => r.arrayBuffer()),
    request('atelier.png', signal).then(r => r.blob()),
  ]);
  signal.throwIfAborted();
  const parts = upload(gl, bytes, buffers);
  const url = URL.createObjectURL(blob), image = new Image();
  try {
    image.src = url; await image.decode(); signal.throwIfAborted();
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
  } finally { URL.revokeObjectURL(url); }
  gl.useProgram(program); gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.clearColor(0, 0, 0, 1);
  const uniform = Object.fromEntries(['aspect','scale','rotation','tint','metal','roughness','emission'].map(k => [k, gl.getUniformLocation(program,k)]));
  const pLoc = gl.getAttribLocation(program,'position'), nLoc = gl.getAttribLocation(program,'normal');
  gl.enableVertexAttribArray(pLoc); gl.enableVertexAttribArray(nLoc);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let yaw = motion.matches ? 0 : -.19, pitch = 0, targetYaw = 0, targetPitch = 0, last = 0;
  function paint(time) {
    frame = 0;
    if (document.hidden || !visible || signal.aborted) return;
    const dt = Math.min(48, time - last || 16); last = time;
    const mix = motion.matches ? 1 : 1-Math.exp(-dt/95);
    yaw += (targetYaw-yaw)*mix; pitch += (targetPitch-pitch)*mix;
    const c = Math.cos(yaw), s = Math.sin(yaw), a = Math.cos(pitch), b = Math.sin(pitch);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix3fv(uniform.rotation, false, [c,b*s,-a*s, 0,a,b, s,-b*c,a*c]);
    gl.uniform1f(uniform.aspect, canvas.width/canvas.height);
    for (const part of parts) {
      for (const [loc, attr] of [[pLoc,part.position],[nLoc,part.normal]]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, attr.buffer);
        gl.vertexAttribPointer(loc,3,attr.componentType,attr.normalized,attr.stride,attr.byteOffset||0);
      }
      const m = part.material.pbrMetallicRoughness;
      gl.uniform1f(uniform.scale,part.scale); gl.uniform3fv(uniform.tint,m.baseColorFactor.slice(0,3));
      gl.uniform1f(uniform.metal,m.metallicFactor); gl.uniform1f(uniform.roughness,m.roughnessFactor);
      gl.uniform3fv(uniform.emission,part.material.emissiveFactor);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.indices.buffer);
      gl.drawElements(gl.TRIANGLES,part.indices.count,part.indices.componentType,part.indices.byteOffset||0);
    }
    if (Math.abs(targetYaw-yaw)+Math.abs(targetPitch-pitch) > .0005) schedule();
  }
  function schedule() { if (!frame && visible && !document.hidden && !signal.aborted) frame = requestAnimationFrame(paint); }
  function pause() { cancelAnimationFrame(frame); frame = 0; }
  function resume() { schedule(); }
  function resize() {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 2, (lite ? 900 : 1600)/width);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr); gl.viewport(0,0,canvas.width,canvas.height); schedule();
  }
  function rotate(dx, dy = 0) { targetYaw += dx; targetPitch = Math.max(-1, Math.min(1,targetPitch+dy)); schedule(); }
  function reset() { yaw = targetYaw = 0; pitch = targetPitch = 0; schedule(); }
  let pointer = null;
  on(canvas,'pointerdown',e => {
    if (!e.isPrimary || e.button !== 0) return;
    pointer = { id:e.pointerId, x:e.clientX, y:e.clientY };
    // Touch pointers are implicitly captured; explicit capture can swallow the next tap.
    if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId);
  });
  on(canvas,'pointermove',e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    rotate((e.clientX-pointer.x)*.009,(e.clientY-pointer.y)*.007); pointer.x=e.clientX; pointer.y=e.clientY;
  });
  on(canvas,'pointerup',e => { if(pointer?.id===e.pointerId){ try{canvas.releasePointerCapture(e.pointerId);}catch{} pointer=null; } });
  on(canvas,'pointercancel',e => { if(pointer?.id===e.pointerId){ try{canvas.releasePointerCapture(e.pointerId);}catch{} pointer=null; } });
  on(canvas,'lostpointercapture',() => { pointer = null; });
  on(canvas,'keydown',e => {
    const delta = {ArrowLeft:[-.23,0],ArrowRight:[.23,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]}[e.key];
    if (delta || e.key === 'Home') { e.preventDefault(); delta ? rotate(...delta) : reset(); }
  });
  on(document,'visibilitychange',schedule); on(motion,'change',schedule);
  observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else { cancelAnimationFrame(frame); frame=0; } });
  observer.observe(canvas); resizer = new ResizeObserver(resize); resizer.observe(canvas); resize();
  return { rotate, reset, pause, resume };
}
