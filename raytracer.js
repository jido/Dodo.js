// Ray tracer adapted from TypeScript
// Original code: https://github.com/Microsoft/TypeScriptSamples/tree/master/raytracer

var Vector = Create(struct, 'Vector', {
    x: 0,
    y: 0,
    z: 0,
    
    times: function times(k) {
        return copy(vector, {x:k * this.x}, {y:k * this.y}, {z:k * this.z});
    },
    minus: function minus(v) {
        return copy(vector, {x:this.x - v.x}, {y:this.y - v.y}, {z: this.z - v.z});
    },
    plus: function plus(v) {
        return copy(vector, {x:this.x + v.x}, {y:this.y + v.y}, {z: this.z + v.z});
    },
    dot: function dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    },
    mag: function mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },
    norm: function norm() {
        var mag = this.mag();
        var div = (mag === 0) ? Infinity : 1.0 / mag;
        return this.times(div);
    },
    cross: function cross(v) {
        return copy(vector,
            {x: this.y * v.z - this.z * v.y},
            {y: this.z * v.x - this.x * v.z},
            {z: this.x * v.y - this.y * v.x});
    }
});

var vector = Vector.instance;

var Color = Create(struct, 'Color', {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    
    scale: function scale(k) {
        return copy(color, {r:k * this.r}, {g:k * this.g}, {b:k * this.b});
    },
    plus: function plus(c) {
        return copy(color, {r:this.r + c.r}, {g:this.g + c.g}, {b:this.b + c.b});
    },
    times: function times(c) {
        return copy(color, {r:this.r * c.r}, {g:this.g * c.g}, {b:this.b * c.b});
    },
    toDrawingColor: function toDrawingColor() {
        var legalize = function legalize(d) {
            return (d > 1.0) ? 1.0 : d;
        };
        return copy(color,
            {r: Math.floor(legalize(this.r) * 255)},
            {g: Math.floor(legalize(this.g) * 255)},
            {b: Math.floor(legalize(this.b) * 255)});
    }
});

var color = Color.instance;
var white = copy(color, {r: 1.0}, {g: 1.0}, {b: 1.0});
var grey = copy(color, {r: 0.5}, {g: 0.5}, {b: 0.5});
var black = color;
var background = black;

var Camera = Create(struct, 'Camera', {
    forward: vector,
    right: vector,
    up: vector,
    pos: vector,
    
    $init(pos, lookAt) {
        this.pos = pos;
        var down = copy(vector, {y: -1.0});
        this.forward = lookAt.minus(pos).norm();
        this.right = this.forward.cross(down).norm().times(1.5);
        this.up = this.forward.cross(this.right).norm().times(1.5);
    }
});

var interfac = struct;

var Ray = Create(interfac, 'Ray', {
    start: vector,
    dir: vector
});

var Surface = Create(interfac, 'Surface', {
    diffuse: function(pos) {return color;},
    specular: function(pos) {return color;},
    reflect: function(pos) {return 0;},
    roughness: 0
});

var Thing = Create(interfac, 'Thing', {
    intersect: function(ray) {return Intersection.instance;},
    normal: function(pos) {return vector;},
    surface: Surface.instance
});

var Intersection = Create(interfac, 'Intersection', {
    thing: Thing.instance,
    ray: Ray.instance,
    dist: 0
});

var Light = Create(interfac, 'Light', {
    pos: vector,
    color: color
});

var Scene = Create(interfac, 'Scene', {
    things: new Array(),
    lights: new Array(),
    camera: Camera.instance
});

var Sphere = Create(Thing.instance, 'Sphere', {
    radius2: 1.0,
    center: vector,
    
    $init: function initSphere(center, radius, surface) {
        this.radius2 = radius * radius;
        this.center = center;
        this.surface = surface;
    },
    
    $normal: function normal(pos) {
        dodo.checkType('pos (Sphere.normal)', pos, vector);
        return pos.minus(this.center).norm();
    },
    
    $intersect: function intersect(ray) {
        var eo = this.center.minus(ray.start);
        var v = eo.dot(ray.dir);
        var dist = 0;
        if (v > 0)
        {
            var disc = this.radius2 - (eo.dot(eo) - v * v);
            if (disc > 0)
            {
                dist = v - Math.sqrt(disc);
            }
        }
        if (dist === 0)
        {
            return null;
        }
        else
        {
            return copy(Intersection(), {thing:this}, {ray:ray}, {dist:dist});
        }
    }
});

var sphere = Sphere.instance;
        
var Plane = Create(Thing.instance, 'Plane', {
    offset: 0.0,
    $intersect: function intersect(ray) {
        var norm = this.normal()
        var denom = norm.dot(ray.dir);
        if (denom > 0)
        {
            return null;
        }
        else
        {
            var dist = (norm.dot(ray.start) + this.offset) / (-denom);
            return copy(Intersection(), {thing:this}, {ray:ray}, {dist:dist});
        }
    },
    $init: function initPlane(norm, offset, surface) {
        this.normal = function normal(pos) {
            return norm;
        };
        this.surface = surface;
    }
});

var module = struct;

var surfaces = extend(module, {
    shiny: copy(Surface(),
        {diffuse: function diffuse(pos) {return white;}},
        {specular: function specular(pos) {return grey;}},
        {reflect: function reflect(pos) {return 0.7;}},
        {roughness: 250}
    ),
    
    checkerboard: copy(Surface(),
        {diffuse: function diffuse(pos) {
            if ((Math.floor(pos.z) + Math.floor(pos.x)) % 2 !== 0)
            {
                return white;
            }
            else
            {
                return black;
            }
        }},
        {specular: function specular(pos) {
            return white;
        }},
        {reflect: function reflect(pos) {
            if ((Math.floor(pos.z) + Math.floor(pos.x)) % 2 !== 0)
            {
                return 0.1;
            }
            else
            {
                return 0.7;
            }
        }},
        {roughness: 150}
    )
});
        
var RayTracer = Create(struct, 'RayTracer', {
    _maxDepth: 5,
    
    _intersections: function intersections(ray, scene) {
        var closest = +Infinity;
        var closestInter = null;
        for (var i in scene.things)
        {
            var inter = scene.things[i].intersect(ray);
            if (inter !== null && inter.dist < closest)
            {
                closestInter = inter;
                closest = inter.dist;
            }
        }
        return closestInter;
    },
    
    _testRay: function testRay(ray, scene) {
        var isect = this._intersections(ray, scene);
        if (isect === null)
        {
            return null;
        }
        return isect.dist;
    },
    
    _traceRay: function traceRay(ray, scene, depth) {
        var isect = this._intersections(ray, scene);
        if (isect === null) {
            return background;
        } else {
            return this._shade(isect, scene, depth);
        }
    },
    
    _shade: function shade(isect, scene, depth) {
        var d = isect.ray.dir;
        var pos = d.times(isect.dist).plus(isect.ray.start);
        var normal = isect.thing.normal(pos);
        var reflectDir = d.minus(normal.times(normal.dot(d)).times(2.0));
        var naturalColor = background.plus(this._getNaturalColor(isect.thing, pos, normal, reflectDir, scene));
        var reflectedColor = (depth >= this._maxDepth)
            ? grey
            : this._getReflectionColor(isect.thing, pos, normal, reflectDir, scene, depth);
        return naturalColor.plus(reflectedColor);
    },
    
    _getReflectionColor: function getReflectionColor(thing, pos, normal, rd, scene, depth) {
        return this._traceRay(copy(Ray(), {start:pos}, {dir:rd}), scene, depth + 1).scale(thing.surface.reflect(pos));
    },
    
    _getNaturalColor: function getNaturalColor(thing, pos, norm, rd, scene) {
        var self = this;
        var addLight = function addLight(col, light) {
            var ldis = light.pos.minus(pos);
            var livec = ldis.norm();
            var neatIsect = self._testRay(copy(Ray(), {start:pos}, {dir:livec}), scene);
            var isInShadow = (neatIsect === null)
                ? false
                : (neatIsect <= ldis.mag());
            if (isInShadow)
            {
                return col;
            }
            else
            {
                var illum = livec.dot(norm);
                var lcolor = (illum > 0)
                    ? light.color.scale(illum)
                    : color;
                var specular = livec.dot(rd.norm());
                var scolor = (specular > 0)
                    ? light.color.scale(Math.pow(specular, thing.surface.roughness))
                    : color;
                return col.plus(thing.surface.diffuse(pos).times(lcolor).plus(thing.surface.specular(pos).times(scolor)));
            }
        };
        return scene.lights.reduce(addLight, color);
    },
    
    render: function render(scene, ctx, screenWidth, screenHeight) {
        var getPoint = function getPoint(x, y, camera) {
            var recenterX = function(x) {
                return (x - screenWidth / 2.0) / 2.0 / screenWidth;
            };
            var recenterY = function(y) {
                return (screenHeight / 2.0 - y) / 2.0 / screenHeight;
            };
            return camera.forward.plus(camera.right.times(recenterX(x)).plus(camera.up.times(recenterY(y)))).norm();
        };
        for (var y = 0; y < screenHeight; y++) 
        {
            for (var x = 0; x < screenWidth; x++) 
            {
                var scolor = this._traceRay(copy(Ray(), {start:scene.camera.pos}, {dir:getPoint(x, y, scene.camera)}), scene, 0);
                var c = scolor.toDrawingColor();
                ctx.fillStyle = "rgb(" + String(c.r) + ", " + String(c.g) + ", " + String(c.b) + ")";
                ctx.fillRect(x, y, x + 1, y + 1);
            }
        }
    }
});

var rayTracer = RayTracer.instance;

function defaultScene() {
    return copy(Scene(),
        {things: [
            Plane(copy(vector, {y:1.0}), 0.0, surfaces.checkerboard),
            Sphere(copy(vector, {y:1.0}, {z:-0.25}), 1.0, surfaces.shiny),
            Sphere(copy(vector, {x:0.5}, {y:1.75}, {z:2.1}), 0.25, surfaces.shiny),
            Sphere(copy(vector, {x:-1.0}, {y:0.7}, {z:1.5}), 0.5, surfaces.shiny)
        ]},
        
        {lights: [
            copy(Light(),
                {pos: copy(vector, {x:-2.0}, {y:2.5})},
                {color: copy(color, {r:0.49}, {g:0.07}, {b:0.07})}
            ),
            copy(Light(),
                {pos: copy(vector, {x:1.5}, {y:2.5}, {z:1.5})},
                {color: copy(color, {r:0.07}, {g:0.07}, {b:0.49})}
            ),
            copy(Light(),
                {pos: copy(vector, {x:1.5}, {y:2.5}, {z:-1.5})},
                {color: copy(color, {r:0.57}, {g:0.8}, {b:0.071})}
            ),
            copy(Light(),
                {pos: copy(vector, {y:3.5})}, 
                {color: copy(color, {r:0.21}, {g:0.21}, {b:0.35})}
            )
        ]},
        
        {camera: Camera(copy(vector, {x:3.0}, {y:2.0}, {z:4.0}), copy(vector, {x:-1.0}, {y:0.5}))}
    );
}

function execute() {
    var canv = document.createElement("canvas");
    canv.width = 300;
    canv.height = 300;
    document.body.appendChild(canv);
    var ctx = canv.getContext("2d");
    return rayTracer.render(defaultScene(), ctx, canv.width, canv.height);
}

execute();


dodo.dumpLog();
