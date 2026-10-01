export const screwChoices={
 fastenerHead:['socket','countersunk','roundh','pan','none'],
 fastenerDriver:['hex','torx','phillips','slot','phillips_slot','phillips_square','square','triangle','none'],
 fastenerDriverPosition:['head','right'],
 fastenerShaft:['machine','tapping','none'],
 fastenerThreads:['full','partial','none']
};
export const screwKeys=[...Object.keys(screwChoices),'fastenerFlange','fastenerSecurity'];
export function screwConfig(input){
 if(!input||typeof input!=='object')throw Error('Schraubenkonfiguration fehlt.');
 const result={};
 for(const [key,values]of Object.entries(screwChoices)){
  if(!values.includes(input[key]))throw Error('Ungültige Schraubenoption: '+key);
  result[key]=input[key];
 }
 for(const key of ['fastenerFlange','fastenerSecurity']){
  if(typeof input[key]!=='boolean')throw Error('Ungültige Schraubenoption: '+key);
  result[key]=input[key];
 }
 return result;
}
