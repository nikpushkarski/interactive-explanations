const alphabet = 'ALPHABET = "abcdefghijklmnopqrstuvwxyz"\n\n';
const starter = alphabet + `def encode(message, n):
    result = ""
    for letter in message:
        index = ALPHABET.find(letter)
        result += ALPHABET[(index + n) % 26]
    return result
`;
const safe = alphabet + `def encode(message, n):
    result = ""
    for letter in message:
        if letter in ALPHABET:
            index = ALPHABET.find(letter)
            result += ALPHABET[(index + n) % 26]
        else:
            result += letter
    return result
`;
const mixed = alphabet + `def encode(message, n):
    result = ""
    for letter in message:
        lower = letter.lower()
        if lower in ALPHABET:
            index = ALPHABET.find(lower)
            shifted = ALPHABET[(index + n) % 26]
            if letter.isupper():
                shifted = shifted.upper()
            result += shifted
        else:
            result += letter
    return result
`;
const test = (label, message, n, expected) => ({label, args:[message,n], expected});
export const challenges = [
 {id:'punctuation',title:'Keep the spaces in the secret',task:'Repair encode(message, n). Shift lowercase ASCII letters, wrapping through z to a. Leave spaces, punctuation, digits, and all other characters unchanged. Shifts may be negative or larger than 26. Return the encoded string.',starter,solution:safe,functionName:'encode',hints:['Which characters actually belong to ALPHABET? Check before looking up an index.','Use an if/else inside the loop: shift alphabet letters; copy everything else.','Try: if letter in ALPHABET: … else: result += letter. Keep the modulo (%) wrapping.'],tests:[test('An ordinary word','cat',3,'fdw'),test('Keep a space','a z',1,'b a'),test('Keep punctuation and digits','hi, 2!',2,'jk, 2!'),test('Wrap backwards','a-z',-1,'z-y'),test('Empty input','',29,'')]},
 {id:'uppercase',title:'Capital letters belong here too',task:'Extend encode(message, n) to shift both lowercase and uppercase ASCII letters. Preserve each letter’s case; copy non-ASCII letters, spaces, digits, and punctuation unchanged. Support any integer shift and return a string.',starter:safe,solution:mixed,functionName:'encode',hints:['The alphabet contains lowercase letters only. How could you look up an uppercase letter?','Use letter.lower() for membership and index lookup, but remember the original letter.','After shifting, use letter.isupper() and shifted.upper() to restore capitals.'],tests:[test('Mixed case','Hello',3,'Khoor'),test('Wrap capitals','Zz Aa',1,'Aa Bb'),test('Negative shift','AbC',-2,'YzA'),test('Large shift','XyZ!',55,'AbC!'),test('Leave other characters','É 42?',4,'É 42?')]},
 {id:'decode',title:'Reverse the secret',task:'Repair decode(message, n) so it reverses encoding with a positive shift n. Keep encode unchanged. Preserve case and non-letter characters. Support negative and large shifts too. Return the decoded string rather than printing it.',starter:mixed+'\ndef decode(message, n):\n    return encode(message, n)\n',solution:mixed+'\ndef decode(message, n):\n    return encode(message, -n)\n',functionName:'decode',hints:['Encoding moves forward. Which direction should decoding move?','You can reuse encode: it already handles case, punctuation, and wrapping.','Return encode(message, -n). Negating n reverses the original shift.'],tests:[test('Read the greeting','Khoor',3,'Hello'),test('Cross the alphabet boundary','Abc',3,'Xyz'),test('Keep punctuation','phhw, 2!',3,'meet, 2!'),test('Undo a large shift','AbC!',55,'XyZ!'),test('Undo a negative shift','YzA',-2,'AbC')]}
];
export function publicChallenge(index, prose) {
 return {...challenges[index], ...prose, resources:[{title:'Python: strings and their methods',url:'https://docs.python.org/3/library/stdtypes.html#string-methods'},{title:'Python: if statements and for loops',url:'https://docs.python.org/3/tutorial/controlflow.html'}]};
}
