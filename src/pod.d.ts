

declare module Pod {
	class AddressedMemory {
		constructor(buffer: ArrayBuffer, offset: number);

		bytes(sizeof: number): Uint8Array;
		view(offset: number): DataView;
		offsetBy(offset: number): AddressedMemory;
	}

	//interface View {
	//	get(): any;
	//	set(value: any): void;
	//}
	type View = any;

	interface NamedType { }

	interface Type {
		as(memberName: string): NamedType;
		view(memory: AddressedMemory): View;
		sizeof: number;
	}

	var Int8: Type;
	var Int16: Type;
	var Int32: Type;

	var Uint8: Type;
	var Uint16: Type;
	var Uint32: Type;

	var Float32: Type;
	var Float64: Type;

	var Bool: Type;

	//function zeroFill(view: View);
	function rawBytes(view: View);
	function equals(x: View, y: View);
	function assign(dest: View, source: View);
	function defineStruct(namedTypes: NamedType[]): Type;
	function defineList(elemType: Type, compileTimeCount: number): Type;
}


