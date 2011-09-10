"use strict";

var dodo = {};

if ("console" in window && "log" in console) {
	dodo.log = function() {
		console.log.apply(console, arguments);
	};
	dodo.dumpLog = function() {};
}
else {
	dodo.logMessages = "";
	dodo.log = function() {
		var line = "";
		var len = arguments.length;
		for (var i = 0; i < len; i++) {
			line += arguments[i];
		}
		dodo.logMessages += line + "\n";
	};
	dodo.dumpLog = function() {
		throw new Error(dodo.logMessages);
	};
}

dodo.log("Loading dodo object model");

if ("create" in Object) {
	dodo.create = function(o) {
		return Object.create(o);
	};
}
else {
    dodo.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}

dodo.definePropertyFailback = function (o, name, descriptor) {
	if ("value" in descriptor) {
		o[name] = descriptor.value;
	}
	else if ("get" in descriptor || "set" in descriptor) {
		throw new Error("dodo._defineProperty implementation only accepts data descriptors: property: " + name);
	}
	// ignore other cases
};

dodo.canDefineProperty = false;

if ("defineProperty" in Object) {
	try {
		// The following fails in IE8
		Object.defineProperty({}, "dummy", {value: 1, writable: true});
		dodo.canDefineProperty = true;
	}
	catch (someException) {
		dodo.log("Object.defineProperty defined, but fails on non-DOM objects!");
	}
}

if (dodo.canDefineProperty) {
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
else {
	dodo._defineProperty = dodo.definePropertyFailback;
	dodo.log("Define object property not available!");
}


dodo.defaultConstructor = function(constructorList, args) {
	var constructor = constructorList[args.length];
	if (typeof constructor === "undefined") {
		throw new Error("dodo.defaultConstructor: No constructor with arity: " + args.length);
	}
	constructor.apply(this, args);
};

dodo.copy = function(proto) {
//	dodo.log("in copy: proto: " + proto);
	var superProto = this.prototype;
	var self = dodo.create(proto);
	var field;
	var i = 2;
	while (i < arguments.length) {
		field = arguments[i-1];
//		dodo.log("in copy: setting field: " + field);
		if (!(field in superProto)) {
			throw new Error("copy: unknown field: " + field);
		}
		if (typeof self[field] === "function") {
			throw new Error("copy: not an attribute of object: " + field);
		}
		dodo._defineProperty(self, field, {value: arguments[i], writable: false, enumerable: true});
		i += 2;
	}
	if (i === arguments.length) {
		var extension = arguments[i-1];
		for (field in extension) {
//			dodo.log("in copy: adding field: " + field);
			if (field in superProto) {
				throw new Error("copy: field already exists: " + field);
			}
			var value = extension[field];
			if (field.lastIndexOf("$", 0) === 0)
			{
				field = field.substr(1);
				if (!(field in superProto)) {
					throw new Error("copy: cannot override unknown field: " + field);
				}
			}
			dodo._defineProperty(self, field, {value: value, writable: false, enumerable: true});
		}
	}
	if (typeof proto === "function") {
		// Assume constructor
		var MakeInstance = function() {
			proto.apply(this, arguments);
		};
		MakeInstance.prototype = self.prototype;
		MakeInstance.constructor = self.constructor;
		return MakeInstance;
	}
	return self;
}

function copy(proto) {
    var Super = proto.constructor;
    return dodo.copy.apply(Super, arguments);
}

function Default() {
	dodo._defineProperty(this, "constructor", {value: Default, writable: true});
}

Default.prototype = {
	toString: function() {
		var desc = "{";
		for (var attr in this) {
			var val = this[attr];
			if (typeof val === "function") {
				if (!this.hasOwnProperty(attr)) continue;
				val = "function()";
			}
			desc += attr + ": " + val + ",";
		}
		return desc.replace(/,?$/, "}");
	}
};

var struct = new Default();

function Class(declarations) {
	// Create the prototype of the objects of the class
	var proto = dodo.copy.call(this, this.prototype, declarations);

	// Class constructor
	var MakeInstance;
	if (arguments.length < 2) {
		// Inherit parent constructors
		var Super = this.constructor.prototype;
	}
	else {
		// New list of constructors
		var constructorList = arguments[1];
	}
	function MakeInstanceInherited() {
		// call super
		Super.apply(this, arguments);
		dodo._defineProperty(this, "constructor", {value: MakeInstanceInherited, writable: true});
	}
	function MakeInstanceWithConstructors() {
		dodo.defaultConstructor.call(this, constructorList, arguments);
		dodo._defineProperty(this, "constructor", {value: MakeInstanceWithConstructors, writable: true});
	}
	MakeInstance = (arguments.length < 2? MakeInstanceInherited: MakeInstanceWithConstructors);
	MakeInstance.prototype = proto;

	// Metaclass constructor (for extending the class)
	function MakeClass() {
		return Class.apply(this, arguments);
	}
	MakeClass.prototype = MakeInstance;
	MakeInstance.constructor = MakeClass;

	return MakeInstance;
}

Class.prototype = Default;


function Link(T) {
	this.$ = (typeof T === "function"? new T(): "");
}

Link.prototype = {
	toString: function() {
		return (typeof this.$ === "object"? "Link()": this.$);
	}
};

function linkTo(val) {
	var ln = new Link();
	ln.$ = val;
	return ln;
}