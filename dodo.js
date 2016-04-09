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
        throw new Error("checkType: incompatible type: " + variable + " is " + 
                dodo.objectType(value) + ", expected: " + dodo.objectType(reference));
    }
};

function copy(proto, changes) {
    var self = dodo.create(proto);
    for (var attribute in changes)
    {
        if (!(attribute in proto))
        {
            throw new Error("copy: unknown attribute: " + attribute);
        }
        var value = changes[attribute];
        dodo.checkType(attribute, value, proto[attribute]);
        dodo._defineProperty(self, attribute, {value: value, writable: false, enumerable: true});
    }
    return self;
}

dodo.extend = function extend(proto, extension, canMakeType) {
    var self = dodo.create(proto);
    var extended = false;
    for (var attribute in extension) 
    {
        var value = extension[attribute];
        if (attribute.lastIndexOf("$", 0) === 0)
        {
            attribute = attribute.substr(1);
            if (!(attribute in proto)) 
            {
                throw new Error("extend: cannot override unknown attribute: " + attribute);
            }
            dodo.checkType(attribute, value, proto[attribute]);
        }
        else if (attribute in proto)
        {
            throw new Error("extend: attribute already exists: " + attribute);
        }
        else 
        {
            extended = true;
        }
        dodo._defineProperty(self, attribute, {value: value, writable: false, enumerable: true});
    }
    if (extended && canMakeType)
    {
        var name = ('typename' in proto.constructor)? proto.constructor.typename: "extend " + dodo.objectType(proto);
        dodo.MakeType(name, proto, self);
    }
    return self;
}

dodo.MakeType = function MakeType(name, proto, instance) {
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
    return dodo.extend(proto, extension, true);
}

function Create(proto, name, body) {
    return dodo.MakeType(name, proto, dodo.extend(proto, body, false));
}

dodo.Type = Create({}, "dodo.Type");
var struct = dodo.Type.instance;
dodo._defineProperty(struct, 'toString', {value: dodo.toString, writable: false, enumerable: false});

var x = extend(struct, {a:3, z:true, b:{}});
alert(dodo.objectType(x) + " " + copy(x, {a:-5.6}));
var y = extend(x, {c:"hi", $a:9});
alert(copy(copy(x, {b:x}), {b:y}));
