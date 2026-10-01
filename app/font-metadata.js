export function fontMetadata(font,fallback){
 const names=font.names.windows||font.names.unicode||font.names.macintosh||font.names;
 const local=name=>typeof name==='string'?name:name?.en||Object.values(name||{})[0];
 const family=local(names.preferredFamily)||local(names.fontFamily)||fallback;
 const subfamily=local(names.preferredSubfamily)||local(names.fontSubfamily)||'Regular';
 const bold=/bold/i.test(subfamily),italic=/italic|oblique/i.test(subfamily);
 const style=bold&&italic?'BoldItalic':bold?'Bold':italic?'Italic':/regular|normal|roman|book/i.test(subfamily)?'Regular':subfamily;
 return{family,style};
}
