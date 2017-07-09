

var Node = Pod.defineStruct({
	asciiChar: Pod.Uint8,
	parentPtr: Pod.Uint32,
	kidCapacity: Pod.Uint8,
	kids: Pod.Uint32,
});

var NodePair = Pod.defineStruct({
	first: Node,
	second: Node,
});


var buffer = new ArrayBuffer(666);
var memory = new Pod.AddressedMemory(buffer, 0);


var nodePair = NodePair.view(memory);
var node = nodePair.first();
var asciiChar = node.asciiChar();
var c = asciiChar.get();
console.log(c);
asciiChar.set(7);
c = asciiChar.get();
console.log(c);







