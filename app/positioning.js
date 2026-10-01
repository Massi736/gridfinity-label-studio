// Shared by the live editor and export layout: preset constraints survive size changes.
const round=n=>Math.round(n*100000)/100000;
export function constrainPosition(value,max,step=0){
 const limit=Math.max(0,max);
 if(step>0)return round(Math.max(0,Math.min(Math.floor((limit+1e-7)/step)*step,Math.round(value/step)*step)));
 return round(Math.max(0,Math.min(limit,value)));
}
export function constrainAnchor(value,max,anchor=0,step=0){
 if(!step)return constrainPosition(value,max);
 const low=Math.ceil((anchor-1e-7)/step)*step,high=Math.floor((Math.max(0,max)+anchor+1e-7)/step)*step;
 if(low>high)return constrainPosition(value,max);
 return round(Math.max(low,Math.min(high,Math.round((value+anchor)/step)*step))-anchor);
}
export function presetPosition(rule,extent,size,margin){
 if(rule==='left'||rule==='top')return margin;
 if(rule==='center'||rule==='middle')return (extent-size)/2;
 if(rule==='right'||rule==='bottom')return extent-margin-size;
 return null;
}
export const AUTO_DEFAULTS={autoGap:1.2,autoLineGap:.9,autoTextVertical:'center',autoIconVertical:'center',iconPosition:'right',align:'left',align2:'left',text2AlignStart:false,margin:1.2};
