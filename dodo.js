"use strict";

var dodo = {};

if ("console" in window && "log" in console) 
{
    dodo.log = function() {
        console.log.apply(console, arguments);
    };
    dodo.dumpLog = function() {};
}
else 
{
    dodo.logMessages = "";
    dodo.log = function() {
        var line = "";
        var len = arguments.length;
        for (var i = 0; i < len; i++) 
        {
            line += arguments[i];
        }
        dodo.logMessages += line + "\n";
    };
    dodo.dumpLog = function() {
        throw new Error(dodo.logMessages);
    };
}

dodo.toString = function() {
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
    dodo.create = function(o) {
        return Object.create(o);
    };
}
else 
{
    dodo.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}

dodo.definePropertyFailback = function (o, name, descriptor) {
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
    dodo._defineProperty = function(o, name, descriptor) {
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
    return function type(value) {
        if (value === global)
        {
            return "global";
        }
        else
        {
                return Object.prototype.toString.call(value);
        }
    };
})(this);

dodo.checkType = function(variable, value, reference) {
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

function extend(proto, extension) {
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
    if (extended)
    {
        if (self.toString !== dodo.toString)
        {
            self.toString = dodo.toString;
        }
        var MakeInstance = function() {
            return copy(self);
        };
        dodo._defineProperty(self, 'constructor', {value: MakeInstance, writable: false, enumerable: false});
        MakeInstance.prototype = proto;
        MakeInstance.instance = self;
    }
    return self;
}

var x = extend({}, {a:3, z:true, b:{}});
alert(copy(x, {a:-5.6}));
var y = extend(x, {c:"hi", $a:9});
copy(copy(x, {b:y}), {b:x});
