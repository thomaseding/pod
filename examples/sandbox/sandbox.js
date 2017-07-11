

var Node = Pod.defineStruct([
	Pod.Uint8.as("asciiChar"),
	Pod.Uint32.as("parentPtr"),
	Pod.Uint8.as("kidCapacity"),
	Pod.Uint32.as("kidsPtr"),
]);

var NodePair = Pod.defineStruct([
	Node.as("first"),
	Node.as("second"),
]);


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







