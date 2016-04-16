"use strict";

var dodo = {};

if ("console" in window && "log" in console) 
{
    dodo.log = function log() {
        console.log.apply(console, arguments);
    };
    dodo.dumpLog = function dumpLog() {};
}
else 
{
    dodo.logMessages = "";
    dodo.log = function log() {
        var line = "";
        var len = arguments.length;
        for (var i = 0; i < len; i++) 
        {
            line += arguments[i];
        }
        dodo.logMessages += line + "\n";
    };
    dodo.dumpLog = function dumpLog() {
        throw new Error(dodo.logMessages);
    };
}

dodo.toString = function toString() {
    var desc = "{";
    for (var attr in this) 
    {
        var val = this[attr];
        if (typeof val === "function") 
        {
            if (!this.hasOwnProperty(attr)) continue;
            val = "function()";
        }
        desc += attr + ": " + val + ",";
    }
    return desc.replace(/,?$/, "}");
};


dodo.log("Loading dodo object model");

if ("create" in Object) 
{
    dodo.create = function create(o) {
        return Object.create(o);
    };
}
else 
{
    dodo.create = function create(o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}

dodo.definePropertyFailback = function definePropertyFailback(o, name, descriptor) {
    if ("value" in descriptor) 
    {
        o[name] = descriptor.value;
    }
    else if ("get" in descriptor || "set" in descriptor) 
    {
        throw new Error("dodo._defineProperty implementation only accepts data descriptors: property: " + name);
    }
    // ignore other cases
};

dodo.canDefineProperty = false;

if ("defineProperty" in Object) 
{
    try {
        // The following fails in IE8
        Object.defineProperty({}, "dummy", {value: 1, writable: true});
        dodo.canDefineProperty = true;
    }
    catch (someException) {
        dodo.log("Object.defineProperty defined, but fails on non-DOM objects!");
    }
}

if (dodo.canDefineProperty) 
{
    dodo._defineProperty = function _defineProperty(o, name, descriptor) {
        try {
            Object.defineProperty(o, name, descriptor);
        }
        catch (someException) {
            dodo.log("dodo._defineProperty: ", someException);
            dodo.definePropertyFailback(o, name, descriptor);
        }
    };
}
else
{
    dodo._defineProperty = dodo.definePropertyFailback;
    dodo.log("Define object property not available!");
}

dodo.objectType = (function(global) {
    return function objectType(value) {
        if (value === global)
        {
            return "global";
        }
        else if (value === undefined)
        {
            return "undefined";
        }
        else if ('typename' in value.constructor)
        {
            return value.constructor.typename;
        }
        else
        {
            return Object.prototype.toString.call(value);
        }
    };
})(this);

dodo.checkType = function checkType(variable, value, reference) {
    if (typeof value !== typeof reference ||
            (value instanceof Object && !(value instanceof reference.constructor)))
    {
        throw new Error("checkType: incompatible type: supplied " + variable + " is " + 
                dodo.objectType(value) + ", expected: " + dodo.objectType(reference));
    }
};

function copy(proto, changes) {
    var self = dodo.create(proto);
    for (var attribute in changes)
    {
        var value = changes[attribute];
        var dot = attribute.indexOf("$");
        var attr = (dot === -1)? attribute: attribute.substr(0, dot);
        if (!(attr in proto))
        {
            throw new Error("copy: unknown attribute: " + attribute);
        }
        if (dot !== -1)
        {
            var change = {};
            change[attribute.substr(dot + 1)] = value;
            value = copy(proto[attr], change);
        }
        else
        {
            dodo.checkType(attr, value, proto[attr]);
        }
        dodo._defineProperty(self, attr, {value: value, writable: false, enumerable: true});
    }
    return self;
}

dodo.extend = function extend(self, extension) {
    var extended = false;
    for (var attribute in extension) 
    {
        var value = extension[attribute];
        if (attribute.lastIndexOf("$", 0) === 0)
        {
            attribute = attribute.substr(1);
            if (!(attribute in self)) 
            {
                throw new Error("extend: cannot override unknown attribute: " + attribute);
            }
            dodo.checkType(attribute, value, self[attribute]);
        }
        else if (attribute in self)
        {
            throw new Error("extend: attribute already exists: " + attribute);
        }
        else 
        {
            extended = true;
        }
        dodo._defineProperty(self, attribute, {value: value, writable: false, enumerable: true});
    }
    return extended;
}

dodo.MakeType = function MakeType(name, proto, instance) {
    if (!(instance instanceof proto.constructor))
    {
        throw new Error("MakeType: instance: " + instance + " must belong to type: " + dodo.objectType(proto));
    }
    
    var MakeInstance = function MakeInstance() {
        var self = copy(instance);
        self.init.apply(self, arguments);
        return self;
    };
    dodo._defineProperty(MakeInstance, 'typename', {value: name, writable: false, enumerable: true});
    MakeInstance.prototype = proto;
    MakeInstance.instance = instance;
    
    dodo._defineProperty(instance, 'constructor', {value: MakeInstance, writable: false, enumerable: false});
    if (!('init' in instance))
    {
        dodo._defineProperty(instance, 'init', {value: function init() {}, writable: false, enumerable: false});
    }
    
    return MakeInstance;
};

function extend(proto, extension) {
    var self = dodo.create(proto);
    if (dodo.extend(self, extension))
    {
        // Create a new type since self was extended with new attributes
        var name = ('typename' in proto.constructor)
            ? proto.constructor.typename
            : "extend " + dodo.objectType(proto);
        dodo.MakeType(name, proto, self);
    }
    return self;
}

function Create(proto, name, body) {
    var instance = dodo.create(proto);
    dodo.extend(instance, body);
    return dodo.MakeType(name, proto, instance);
}

dodo.Type = Create({}, "dodo.Type");
var struct = dodo.Type.instance;
dodo._defineProperty(struct, 'toString', {value: dodo.toString, writable: false, enumerable: false});

// Examples of use

// Create a struct x with attributes a, z and b
var x = extend(struct, {a:3, z:true, b:{}});
// Display a copy of x where a is replaced with a different value
alert(dodo.objectType(x) + " " + copy(x, {a:-5.6}));
// Extend x to create a variable y with additional attribute c and a new value for a
var y = extend(x, {c:"hi", $a:9});
// Type checking: x extends {} and y extends x, so z can be created as follows
var z = copy(copy(x, {b:x}), {b:y});
// Nesting: since z.b is a struct containing attribute b (z.b == x), display a copy of z with a new value for z.b.b
alert(copy(z, {b$b:extend(struct, {j:"dodo"})}));

// Create a new type A with prototype struct and attribute col
var A = Create(struct, "A", {col:"blue"});
// Create a new type B with prototype struct and a new constructor
var B = Create(struct, "B", {$init:function(n) {dodo.log(n);}});
// Create a new type C based on A with a new attribute p
var C = Create(A(), "C", {p:0});

// Call the constructor of B
B(1000);
// Create a new C and display it
alert(C());


dodo.dumpLog();
