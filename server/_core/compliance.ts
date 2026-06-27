// Mira AI 陪伴聊天的医疗合规层。
// 目标：温暖、像懂营养的好朋友；但绝不诊断、不评估剂量、不替代医生。

export const MIRA_CHAT_SYSTEM_PROMPT = `你是 Mira，一个懂营养的贴心好朋友，专门陪伴正在使用 GLP-1 药物（如 Ozempic、Wegovy、Mounjaro、Zepbound）的人。

你的性格：温暖、鼓励、不评判、像朋友一样自然。说话简洁口语，适当用 emoji，但不浮夸。

你能做的：
- 聊营养、蛋白质、饮食搭配、补水、温和运动、用药期常见的吃饭困扰（没胃口、容易饱、恶心时怎么吃）。
- 给具体、可操作的小建议（例如"恶心时可以试试少量多餐、清淡高蛋白的食物"）。
- 情绪支持，肯定对方的努力。

你绝对不能做的（硬性红线）：
- 不诊断任何疾病、不解读症状是否严重。
- 不建议调整药物剂量、不评价该不该用药、不推荐具体药物。
- 不提供医疗、处方或急救建议。
- 涉及以上内容时，温和地说明这超出你的范围，并建议联系医生/药师或当地急救服务。

如果用户描述可能严重的症状（剧烈腹痛、持续呕吐、胰腺炎征兆、脱水、晕厥等）或情绪危机/自伤念头，
请认真、温柔地建议立即联系医生或当地紧急服务（如拨打急救电话），不要淡化，也不要尝试自行处理。

回复用中文，控制在 4 句以内，除非用户明确要更详细。`;

// 触发医疗护栏的关键词（剂量 / 症状严重性 / 危机）。命中则在回复后附加就医提示。
const MEDICAL_PATTERNS = [
  /剂量|加量|减量|停药|换药|多少\s*(mg|毫克|单位)/i,
  /副作用|不良反应|过敏/i,
  /胰腺炎|胆囊|甲状腺|肠梗阻|低血糖/i,
  /医生说|处方|该不该(打|吃|用)/i,
];

const CRISIS_PATTERNS = [
  /自杀|自残|不想活|活不下去|想结束/i,
  /剧烈腹痛|持续呕吐|吐血|便血|晕倒|昏迷|呼吸困难|脱水/i,
];

export type ComplianceCheck = {
  level: "none" | "medical" | "crisis";
};

export function checkCompliance(userMessage: string): ComplianceCheck {
  if (CRISIS_PATTERNS.some((re) => re.test(userMessage))) {
    return { level: "crisis" };
  }
  if (MEDICAL_PATTERNS.some((re) => re.test(userMessage))) {
    return { level: "medical" };
  }
  return { level: "none" };
}

// 危机情形下不调用 LLM，直接给出稳妥的引导话术。
export const CRISIS_RESPONSE =
  "我很关心你现在的状态 💙 这听起来需要专业的帮助——请尽快联系你的医生，或拨打当地急救电话。如果你有伤害自己的念头，请立即联系当地心理危机热线或急救服务，你并不孤单。";

export const MEDICAL_DISCLAIMER_SUFFIX =
  "\n\n（这类和用药/症状相关的问题，我没法替你判断哦——建议和你的医生或药师聊聊会更稳妥 🩺）";
