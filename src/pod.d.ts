

declare module Pod {
	class AddressedMemory {
		constructor(buffer: ArrayBuffer, offset: number);

		bytes(byteCount: number): Uint8Array;
		view(byteOffset: number): DataView;
		offsetBy(byteOffset: number): AddressedMemory;
	}

	interface View<$Value> {
		get(): $Value;
		set(value: $Value): void;
	}

	interface NamedType { }

	interface Type<$View> {
		as(memberName: string): NamedType;
		view(memory: AddressedMemory): $View;
		sizeof(): number;
		byteCount: number;
		bitCount: number;
		bitwiseEnabled: boolean;
	}

	interface BitwiseType<$View> extends Type<$View> {
		bitwiseView(bitOffset: number, memory: AddressedMemory): $View;
	}

	type NumberType = Type<View<number>>;
	type BoolType = BitwiseType<View<boolean>>;

	var ByteBoundary: NamedType;

	var Int8: NumberType;
	var Int16: NumberType;
	var Int32: NumberType;
	var Uint8: NumberType;
	var Uint16: NumberType;
	var Uint32: NumberType;
	var Float32: NumberType;
	var Float64: NumberType;
	var Bool: BoolType;

	type View_Int8 = View<number>;
	type View_Int16 = View<number>;
	type View_Int32 = View<number>;
	type View_Uint8 = View<number>;
	type View_Uint16 = View<number>;
	type View_Uint32 = View<number>;
	type View_Float32 = View<number>;
	type View_Float64 = View<number>;
	type View_Bool = View<boolean>;

	function reservedMemberNames(): string[];

	function allocate<$View>(type: Type<$View>): $View;

	function rawBytes(view: View<any>): Uint8Array;

	function equals<$Value>(x: View<$Value>, y: View<$Value>): boolean;

	function assign<$Value>(dest: View<$Value>, source: View<$Value>);

	function defineStruct(namedTypes: NamedType[]): Type<any>;
	function defineStruct(namedTypes: NamedType[], get: () => any): Type<any>;
	function defineStruct(namedTypes: NamedType[], get: () => any, set: (value: any) => void): Type<any>;

	function defineList<$View>(elemType: Type<$View>, compileTimeCount: number): Type<any>;
}


