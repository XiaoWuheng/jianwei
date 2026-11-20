const str = { type: 'string' };
const list = (items) => ({ type: 'array', items });
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const strings = list(str);
export const reportSchema = obj({
  title: str, subtitle: str, summary: str, problem: str, audience: str, valueProposition: str,
  recommendation: str, nextAction: str,
  insights: list(obj({ title: str, body: str, kind: { type:'string', enum:['fact','inference','hypothesis'] }, sourceIds: strings })),
  competitors: list(obj({ name: str, url: str, tagline: str, audience: str, pricing: str, strengths: strings, gaps: strings, learnFrom: str, sourceIds: strings })),
  benchmarks: list(obj({ name: str, url: str, positioning: str, userJourney: strings, features: strings, monetization: str, learn: strings, avoid: strings, sourceIds: strings })),
  market: obj({ overview: str, signals: list(obj({ title: str, body: str, kind: { type:'string', enum:['fact','inference','hypothesis'] }, sourceIds: strings })), entryPoint: str, risks: strings }),
  repositories: list(obj({ name: str, url: str, description: str, license: str, stack: strings, application: str, caution: str, sourceIds: strings })),
  roadmap: list(obj({ phase: str, title: str, duration: str, goal: str, tasks: strings, deliverable: str, successCriteria: str })),
  assumptions: list(obj({ assumption: str, test: str, passCriteria: str, priority: { type:'string', enum:['high','medium','low'] } })),
  sources: list(obj({ id: str, title: str, url: str, publisher: str, type: { type:'string', enum:['official','community','repository','research','market','media','appstore'] }, excerpt: str, reliability: { type:'string', enum:['primary','secondary'] } })),
  coverage: list(obj({ channel: str, queries: strings, result: str, status: { type:'string', enum:['searched','limited','not_applicable'] } })),
  limitations: strings
});
export const chatSchema = obj({ answer: str, sources: list(obj({ title: str, url: str })) });
