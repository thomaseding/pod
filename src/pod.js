

var Pod = (function () {

	var AddressedMemory = function (buffer, offset) {
		this._buffer = buffer;
		this._offset = offset;
	};

	AddressedMemory.prototype.bytes = function (sizeof) {
		return new Uint8Array(this._buffer, this._offset + sizeof);
	};

	AddressedMemory.prototype.view = function (offset) {
		return new DataView(this._buffer, this._offset + offset);
	};

	AddressedMemory.prototype.atOffset = function (offset) {
		return new AddressedMemory(buffer, this._offset + offset);
	};


	var Type = function (name, sizeof) {
		if (sizeof < 0) {
			sizeof = -1;
		}
		this.sizeof = sizeof;
		this.name = name;
	};


	var NativeType = function (name, sizeof) {
		Type.call(this, name, sizeof);
		this.viewGet = "get" + name;
		this.viewSet = "set" + name;
	};

	NativeType.prototype = new Type();
	NativeType.prototype.constructor = NativeType;
	

	var StructType = function (clazz, name, sizeof) {
		Type.call(this, name, sizeof);
		this.clazz = clazz;
	};

	StructType.prototype = new Type();
	StructType.prototype.constructor = StructType;
	

	var ListType = function (clazz, elemType, count) {
		var name = elemType.name + "_" + (count < 0 ? "Z" : count);
		var sizeof = elemType.sizeof * count;
		Type.call(this, name, sizeof);
		this.clazz = clazz;
	};

	ListType.prototype = new Type();
	ListType.prototype.constructor = ListType;


	var Member = function (offset, type) {
		this.offset = offset;
		this.type = type;
	};


	var StructInfo = function (memberNameToType) {
		var offset = 0;
		var memberName = Object.keys(obj);

		for (var i = 0; i < memberNames.length; ++i) {
			var memberName = memberNames[i];
			var type = memberNameToType[memberName];
			if (!(type instanceof Type) || type.sizeof < 0) {
				throw Error();
			}

			this[memberName] = new Member(offset, type.name);
			offset += type.sizeof;
		}

		this.sizeof = offset;
	};


	var Modeule = {};

	Modeule.AddressedMemory = AddressedMemory;

	Modeule.Int8 = new NativeType("Int8", 1);
	Modeule.Int16 = new NativeType("Int16", 2);
	Modeule.Int32 = new NativeType("Int32", 4);

	Modeule.Uint8 = new NativeType("Uint8", 1);
	Modeule.Uint16 = new NativeType("Uint16", 2);
	Modeule.Uint32 = new NativeType("Uint32", 4);

	Modeule.Float32 = new NativeType("Float32", 4);
	Modeule.Float64 = new NativeType("Float64", 8);


	Modeule.rawBytes = function (ref) {
		return ref._memory.bytes(ref.type.sizeof);
	};

	Modeule.equals = function (ref1, ref2) {
		if (ref1.type !== ref2.type) {
			throw Error();
		}

		var bytes1 = this.rawBytes(ref1);
		var bytes2 = this.rawBytes(ref2);

		var sizeof = ref1.type.sizeof;

		for (var i = 0; i < sizeof; ++i) {
			if (bytes1[i] !== bytes2[i]) {
				return false;
			}
		}
		return true;
	};

	Modeule.assign = function (dest, source) {
		if (dest.type !== source.type) {
			throw Error();
		}

		var bytes1 = this.rawBytes(ref1);
		var bytes2 = this.rawBytes(ref2);

		var sizeof = dest.type.sizeof;

		for (var i = 0; i < sizeof; ++i) {
			dest[i] = source[i]; // XXX: Might not be correct due to endianess. May need to manually walk with DataView.
		}
	};


	Modeule.defineStruct = function (name, memberNameToType) {
		var structInfo = new StructInfo(memberNameToType);

		var Reference = function (memory) {
			this._memory = memory;
		};

		var type = new StructType(Reference, structInfo.sizeof, name);

		var memberNames = Object.keys(structInfo);

		Reference.prototype.type = type;
		Reference.prototype.memberNames = memberNames;

		for (var i = 0; i < memberNames.length; ++i) {
			var memberName = memberNames[i];
			var member = structInfo[memberName];

			if (member.type.constructor === NativeType) {
				Reference.prototype[memberName] = (function (member) {
					return function () {
						var view = this._memory.view(member.offset);
						return {
							get: function () {
								return view[member.type.viewGet]();
							},
							set: function (value) {
								view[member.type.viewSet](value);
							},
						};
					};
				})(member);
			}
			else if (member.type.constructor === StructType || member.type.constructor === ListType) {
				Reference.prototype[memberName] = (function (member) {
					return function () {
						var memory = this._memory.atOffset(member.offset);
						return new member.type.clazz(memory);
					};
				})(member);
			}
			else {
				throw Error();
			}
		}

		return type;
	};


	Modeule.defineList = function (elemType, compileTimeCount) {
		if (compileTimeCount === undefined) {
			compileTimeCount = -1;
		}
		
		var Reference = function (memory) {
			this._memory = memory;
		};

		var type = new ListType(Reference, elemType, compileTimeCount);

		Reference.prototype.type = type;
		Reference.prototype.length = compileTimeCount;

		if (elemType.constructor === NativeType) {
			Reference.prototype.at = function (index) {
				var offset = elemType.sizeof * index;
				var view = this._memory.view(offset);
				return {
					get: function () {
						var offset = index * elemType.sizeof;
						return view[elemType.viewGet]();
					},
					set: function (value) {
						var offset = index * elemType.sizeof;
						view[elemType.viewSet](value);
					},
				};
			};

		}
		else if (elemType.constructor === StructType || elemType.constructor === ListType) {
			if (elemType.sizeof < 0) {
				throw Error();
			}
			Reference.prototype.at = function (index) {
				var offset = elemType.sizeof * index;
				var elemMemory = this._memory.atOffset(index);
				return new elemType.clazz(elemMemory);
			};
		}
		else {
			throw Error();
		}

		return type;
	};


	return Modeule;
})();




