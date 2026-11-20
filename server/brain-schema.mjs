const s={type:'string'}, a=items=>({type:'array',items}), ss=a(s);
const o=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const e=(...values)=>({type:'string',enum:values});
export const ideationSchema=o({
  title:s,reply:s,understanding:s,intentType:s,maturity:e('explore','focus','ready'),
  clarity:a(o({dimension:s,status:e('confirmed','assumed','unknown'),description:s})),
  directions:a(o({id:s,title:s,description:s,value:s,firstExperiment:s,assumptions:ss})),
  questions:a(o({id:s,question:s,reason:s,options:ss})),
  connections:a(o({id:s,kind:e('thought','project'),reason:s,possibility:s})),
  researchQuestions:ss,
  workingBrief:o({purpose:s,audience:s,outcome:s,constraints:s,scope:ss,notDoing:ss,successCriteria:ss,assumptions:ss}),
  nextStep:s
});
export const blueprintSchema=o({
  title:s,form:s,vision:s,audience:s,problem:s,value:s,
  scope:ss,excluded:ss,journey:ss,
  deliverables:a(o({id:s,title:s,format:s,description:s,acceptance:s})),
  milestones:a(o({id:s,title:s,goal:s,duration:s,tasks:a(o({id:s,title:s,instruction:s,output:s,acceptance:s,dependsOn:ss}))})),
  resources:a(o({name:s,purpose:s,estimate:s})),
  risks:a(o({risk:s,validation:s,passCriteria:s})),
  openQuestions:ss,evidence:a(o({claim:s,kind:e('fact','inference','hypothesis'),sourceIds:ss})),
  nextAction:s,limitations:ss
});
export const memorySchema=o({
  title:s,summary:s,
  themes:a(o({title:s,insight:s,sourceIds:ss})),
  decisions:a(o({decision:s,context:s,sourceIds:ss})),
  unresolved:a(o({question:s,nextStep:s,sourceIds:ss})),
  connections:a(o({idea:s,reason:s,sourceIds:ss})),
  limitations:ss
});
