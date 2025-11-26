
import { GoogleGenAI, Type } from "@google/genai";
import type { Property, ValuationReport, Language } from '../types';

const getAiClient = (apiKey: string): GoogleGenAI => {
  if (!apiKey) {
    throw new Error("Gemini API Key not provided. Please set it in the settings.");
  }
  return new GoogleGenAI({ apiKey });
};

const valuationSchema = {
  type: Type.OBJECT,
  properties: {
    estimatedPrice: {
      type: Type.NUMBER,
      description: 'AI-estimated total price of the property in the local currency (e.g., TWD, USD).'
    },
    pricePerSqm: {
      type: Type.NUMBER,
      description: 'AI-estimated price per square meter in the local currency.'
    },
    confidence: {
      type: Type.STRING,
      description: 'AI\'s confidence level for this valuation (e.g., High, Medium, Low), with a brief explanation.'
    },
    marketSummary: {
      type: Type.STRING,
      description: 'A brief summary of the market conditions in the property\'s area, under 150 words.'
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List 3 main advantages of this property.'
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List 3 main disadvantages of this property.'
    },
    amenitiesAnalysis: {
      type: Type.OBJECT,
      properties: {
        schools: { type: Type.STRING, description: 'Analysis of nearby schools and educational resources.' },
        transport: { type: Type.STRING, description: 'Analysis of surrounding transportation convenience.' },
        shopping: { type: Type.STRING, description: 'Analysis of shopping and commercial functions.' }
      },
      required: ['schools', 'transport', 'shopping']
    },
    inferredDetails: {
      type: Type.OBJECT,
      description: "Provide ONLY when the target property's details are unknown. Infer these details based on the address and context.",
      properties: {
        type: { type: Type.STRING, description: "Inferred property type (e.g., '電梯大樓')." },
        sizePing: { type: Type.NUMBER, description: "Inferred size in Pings (e.g., 25.5)." },
        floor: { type: Type.STRING, description: "Inferred floor (e.g., '20樓 / 22樓')." },
        layout: { type: Type.STRING, description: "Inferred layout (e.g., '2房1衛')." }
      },
      required: ['type', 'sizePing', 'floor', 'layout']
    },
    realtorAnalysis: {
      type: Type.ARRAY,
      description: "Provide ONLY when the valuation basis is 'Realtor's Perspective'. Generate analysis for 2-3 local real estate agencies.",
      items: {
        type: Type.OBJECT,
        properties: {
          realtorName: { type: Type.STRING, description: 'Real estate agency brand name (e.g., Sinyi Realty, Yungching Realty).' },
          branchName: { type: Type.STRING, description: 'A simulated local branch name (e.g., Daan Forest Park Branch).' },
          address: { type: Type.STRING, description: 'A simulated branch address.' },
          analysis: { type: Type.STRING, description: 'Provide a detailed market perspective, potential customer profile, and sales strategy analysis for the target property, in the tone and professional angle of that real estate brand.' }
        },
        required: ['realtorName', 'branchName', 'address', 'analysis']
      }
    },
    foreclosureAnalysis: {
        type: Type.OBJECT,
        description: "Provide ONLY when the valuation basis is 'Foreclosure Info'. This section should contain analysis of nearby foreclosure properties, NOT an analysis of the target property as a foreclosure.",
        properties: {
            summary: { type: Type.STRING, description: "A summary sentence stating whether nearby foreclosure cases were found (e.g., 'Found 1 recent foreclosure case within 500m.') or not found." },
            cases: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        address: { type: Type.STRING, description: 'The address of the nearby foreclosed property.' },
                        auctionPrice: { type: Type.STRING, description: 'The estimated auction price or recent auction result (e.g., Approx. 12M TWD).' },
                        analysis: { type: Type.STRING, description: 'A brief analysis of this specific foreclosure case and its potential impact on the target property\'s market.' }
                    },
                    required: ['address', 'auctionPrice', 'analysis']
                }
            }
        },
        required: ['summary', 'cases']
    },
    rentalYieldAnalysisData: {
      type: Type.OBJECT,
      description: "Provide ONLY when the valuation basis is 'Rental Yield Analysis'. This section should contain an analysis of nearby rental listings.",
      properties: {
        summary: { type: Type.STRING, description: "A summary of the rental analysis, including the estimated monthly rent for the target property and the calculated annual yield percentage (e.g., 'Estimated monthly rent is around 45,000 TWD, with an annual yield of approximately 2.5%.')." },
        listings: {
          type: Type.ARRAY,
          description: "A list of 2-3 simulated nearby rental listings from popular rental websites.",
          items: {
            type: Type.OBJECT,
            properties: {
              address: { type: Type.STRING, description: 'The address of the nearby rental property.' },
              monthlyRent: { type: Type.STRING, description: 'The monthly rent price (e.g., 48,000 TWD/month).' },
              source: { type: Type.STRING, description: 'The simulated source of the listing (e.g., 591 Rentals, Zuyou Wang).' }
            },
            required: ['address', 'monthlyRent', 'source']
          }
        }
      },
      required: ['summary', 'listings']
    }
  },
  required: ['estimatedPrice', 'pricePerSqm', 'confidence', 'marketSummary', 'pros', 'cons', 'amenitiesAnalysis']
};

const getPrompts = (language: Language) => {
    const prompts = {
        'zh-TW': {
            system: '請扮演一位專業的台灣房地產AI估價師。',
            targetProperty: '目標房產地址',
            propertyType: '房屋類型',
            propertyAge: '屋齡',
            layout: '格局',
            bedrooms: '房',
            bathrooms: '衛',
            floor: '樓層',
            area: '建物面積',
            sqm: '平方公尺',
            ping: '坪',
            basis: '估價參考基準',
            customValues: '使用者自訂參考數值 (請優先使用這些數值進行估算)',
            customRequest: '使用者自訂估價需求',
            actualPing: '實際坪數',
            refPrice: '參考單價',
            refPriceUnit: '萬/坪',
            notProvided: '未提供',
            unknown: '未知',
            nearbyTransactions: '參考的周邊{{count}}筆近期成交資訊',
            address: '地址',
            totalPrice: '總價',
            transactionDate: '交易日期',
            instructions: `請根據以上所有資訊，提供一份專業的JSON格式估價報告。
- 估價需考慮地點、屋齡、類型、樓層、坪數、市場趨勢及提供的成交資訊。
- **價格約束**：您的估價必須合理，且最終的每坪單價應落於所提供參考成交案例的價格區間內或其合理延伸範圍。請避免脫離市場行情的高估或低估。如果參考案例來自鄰近但不同的行政區，請進行適當的價格調整。
- **極重要**：如果目標房產的詳細資訊（類型、坪數、格局、樓層）為「未知」，請你務必根據地址（例如地址中的「20樓」暗示這是一間公寓大樓的單位）以及周邊成交資訊，來**推斷**此房產最可能的特徵。在推斷坪數時，請參考周邊案例的平均值，並保持謹慎保守的估計。你的估價必須基於這些推斷出的特徵。請務必在回傳的JSON中，填寫 \`inferredDetails\` 欄位，包含你推斷出的 \`type\` (類型), \`sizePing\` (坪數), \`floor\` (樓層), 和 \`layout\` (格局，例如 '2房1衛')。
- **特別注意**：當估價參考基準為 **'實價登錄'** 時，您的分析應**主要基於**「內政部不動產交易實價查詢服務」所提供的周邊成交案例，並在報告中強調這一點。
- **特別注意**：當估價參考基準為 **'房屋仲介觀點'** 時，請務必在報告中加入 \`realtorAnalysis\` 欄位，模擬2-3家不同品牌的當地房仲（例如：信義房屋、永慶房屋、台灣房屋）對此物件的專業觀點分析。
- **特別注意**：當估價參考基準為 **'法拍房產信息'** 時，請對目標房產進行常規估價，但**額外**模擬搜尋其周邊500公尺內的近期法拍案件。如果模擬找到1-2筆相關案件，請務必在報告中加入 \`foreclosureAnalysis\` 欄位。此欄位應包含一個 \`summary\` (例如：「周邊500公尺內查詢到1筆相關法拍案件」) 以及一個 \`cases\` 陣列，詳述每筆法拍案的地址、預估拍賣價，並分析其存在對目標房產市價的潛在影響。如果模擬後未發現相關法拍案，也請在 \`summary\` 中說明「周邊查無相關法拍案件」，並讓 \`cases\` 為空陣列。**目標房產本身不應被當作法拍屋來估價。**
- **特別注意**：當估價參考基準為 **'租金投報率'** 時，請務必在報告中加入 \`rentalYieldAnalysisData\` 欄位。此欄位應包含一個 \`summary\` (詳述目標房產的預估月租金及年化投報率)，以及一個 \`listings\` 陣列。此列表應模擬從「內政部不動產住宅租賃實價查詢」以及其他主流租屋網站（如 591租屋網、好房網等）蒐集到的相似條件周邊房產租金行情，包含地址、月租金與來源。估價報告中的 \`estimatedPrice\` 應基於投資價值（租金資本化）來計算。
- **特別注意**：當估價參考基準為 **'都更危老評估'** 時，請在 \`marketSummary\` 與 \`pros/cons\` 中，特別針對該物件的土地持分價值、使用分區強度（如容積率）、以及是否符合危老重建條例的潛力進行深入分析。
- **特別注意**：當估價參考基準為 **'商業效益評估'** 時，請重點評估該物件作為店面或辦公室的商業潛力，包括人流量、商圈屬性與租金效益，並反映在價格中。
- **特別注意**：當估價參考基準為 **'結構安全評估'** 時，請根據屋齡與建築類型，分析可能的耐震係數與結構風險（如海砂屋、土壤液化區），並在報告中適度反映折舊或風險貼水。
- **特別注意**：當估價參考基準為 **'自訂估價指令'** 時，請**優先遵循**使用者提供的自訂指令進行分析與估價。將使用者的特定需求（如裝潢增值、特殊設施影響等）納入核心考量。
- 其他估價基準則**不需要** \`realtorAnalysis\`、\`foreclosureAnalysis\` 或 \`rentalYieldAnalysisData\` 欄位。
- 輸出語言為繁體中文。`,
            scenarioSystem: '請扮演一位專業的台灣房地產AI分析師。',
            scenarioIntro: '我正在評估一個房產，以下是它的基本資料和初步估價結果：',
            scenarioValuation: 'AI初步估價',
            scenarioQuestion: '現在，我有一個特定的情境想請您分析，這個情境可能會如何影響房價。請根據您的專業知識提供一段簡潔、專業的分析。\n\n我的情境是：「{{query}}」',
            scenarioInstructions: '請直接提供分析內容，不需要重複我的問題。輸出語言為繁體中文。'
        },
        'zh-CN': {
            system: '请扮演一位专业的台湾房地产AI估价师。',
            targetProperty: '目标房产地址',
            propertyType: '房屋类型',
            propertyAge: '屋龄',
            layout: '格局',
            bedrooms: '房',
            bathrooms: '卫',
            floor: '楼层',
            area: '建物面积',
            sqm: '平方米',
            ping: '坪',
            basis: '估价参考基准',
            customValues: '使用者自订参考数值 (请优先使用这些数值进行估算)',
            customRequest: '使用者自订估价需求',
            actualPing: '实际坪数',
            refPrice: '参考单价',
            refPriceUnit: '万/坪',
            notProvided: '未提供',
            unknown: '未知',
            nearbyTransactions: '参考的周边{{count}}笔近期成交资讯',
            address: '地址',
            totalPrice: '总价',
            transactionDate: '交易日期',
            instructions: `请根据以上所有资讯，提供一份专业的JSON格式估价报告。
- 估价需考虑地点、屋龄、类型、楼层、坪数、市场趋势及提供的成交资讯。
- **价格约束**：您的估价必须合理，且最终的每坪单价应落于所提供参考成交案例的价格区间内或其合理延伸范围。请避免脱离市场行情的高估或低估。如果参考案例来自邻近但不同的行政区，请进行适当的价格调整。
- **极重要**：如果目标房产的详细资讯（类型、坪数、格局、楼层）为「未知」，请你务必根据地址（例如地址中的「20楼」暗示这是一间公寓大楼的单位）以及周边成交资讯，来**推断**此房产最可能的特征。在推断坪数时，请参考周边案例的平均值，并保持谨慎保守的估计。你的估价必须基于这些推断出的特征。请务务必在回传的JSON中，填写 \`inferredDetails\` 字段，包含你推断出的 \`type\` (类型), \`sizePing\` (坪数), \`floor\` (楼层), 和 \`layout\` (格局，例如 '2房1卫')。
- **特别注意**：当估价参考基准为 **'实价登录'** 时，您的分析应**主要基于**「内政部不动产交易实价查询服务」所提供的周边成交案例，并在报告中强调这一点。
- **特别注意**：当估价参考基准为 **'房屋中介观点'** 时，请务必在报告中加入 \`realtorAnalysis\` 字段，模拟2-3家不同品牌的当地房仲（例如：信义房屋、永庆房屋、台湾房屋）对此物件的专业观点分析。
- **特别注意**：当估价参考基准为 **'法拍房产信息'** 时，请对目标房产进行常规估价，但**额外**模拟搜寻其周边500公尺内的近期法拍案件。如果模拟找到1-2笔相关案件，请务必在报告中加入 \`foreclosureAnalysis\` 字段。此字段应包含一个 \`summary\` (例如：「周边500公尺内查询到1笔相关法拍案件」) 以及一个 \`cases\` 数组，详述每笔法拍案的地址、预估拍卖价，并分析其存在对目标房产市价的潜在影响。如果模拟后未发现相关法拍案，也请在 \`summary\` 中说明「周边查无相关法拍案件」，并让 \`cases\` 为空数组。**目标房产本身不应被当作法拍屋来估价。**
- **特别注意**：当估价参考基准为 **'租金回报率'** 时，请务必在报告中加入 \`rentalYieldAnalysisData\` 字段。此字段应包含一个 \`summary\` (详述目标房产的预估月租金及年化回报率)，以及一个 \`listings\` 数组。此列表应模拟从「内政部不动产住宅租赁实价查询」以及其他主流租屋网站（如 591租屋网、好房网等）蒐集到的相似条件周边房产租金行情，包含地址、月租金与来源。估价报告中的 \`estimatedPrice\` 应基于投资价值（租金资本化）来计算。
- **特别注意**：当估价参考基准为 **'都更危老评估'** 时，请在 \`marketSummary\` 与 \`pros/cons\` 中，特别针对该物件的土地持分价值、使用分区强度（如容积率）、以及是否符合危老重建条例的潜力进行深入分析。
- **特别注意**：当估价参考基准为 **'商业效益评估'** 时，请重点评估该物件作为店面或办公室的商业潜力，包括人流量、商圈属性与租金效益，并反映在价格中。
- **特别注意**：当估价参考基准为 **'结构安全评估'** 时，请根据屋龄与建筑类型，分析可能的耐震系数与结构风险（如海砂屋、土壤液化区），并在报告中适度反映折旧或风险贴水。
- **特别注意**：当估价参考基准为 **'自订估价指令'** 时，请**优先遵循**使用者提供的自订指令进行分析与估价。将使用者的特定需求（如装潢增值、特殊设施影响等）纳入核心考量。
- 其他估价基准则**不需要** \`realtorAnalysis\`、\`foreclosureAnalysis\` 或 \`rentalYieldAnalysisData\` 字段。
- 输出语言为简体中文。`,
            scenarioSystem: '请扮演一位专业的台湾房地产AI分析师。',
            scenarioIntro: '我正在评估一个房产，以下是它的基本资料和初步估价结果：',
            scenarioValuation: 'AI初步估价',
            scenarioQuestion: '现在，我有一个特定的情境想请您分析，这个情境可能会如何影响房价。请根据您的专业知识提供一段简洁、专业的分析。\n\n我的情境是：「{{query}}」',
            scenarioInstructions: '请直接提供分析内容，不需要重复我的问题。输出语言为简体中文。'
        },
        'en': {
            system: 'Act as a professional Taiwanese real estate AI appraiser.',
            targetProperty: 'Target Property Address',
            propertyType: 'Property Type',
            propertyAge: 'Property Age',
            layout: 'Layout',
            bedrooms: 'Bedrooms',
            bathrooms: 'Bathrooms',
            floor: 'Floor',
            area: 'Building Area',
            sqm: 'sqm',
            ping: 'ping',
            basis: 'Valuation Basis',
            customValues: 'User-defined Reference Values (Prioritize these for estimation)',
            customRequest: 'User Custom Valuation Request',
            actualPing: 'Actual Size (Ping)',
            refPrice: 'Reference Price',
            refPriceUnit: 'x10k TWD/Ping',
            notProvided: 'Not provided',
            unknown: 'Unknown',
            nearbyTransactions: 'Reference of {{count}} nearby recent transactions',
            address: 'Address',
            totalPrice: 'Total Price',
            transactionDate: 'Transaction Date',
            instructions: `Based on all the information above, please provide a professional valuation report in JSON format.
- The valuation must consider location, age, type, floor, size, market trends, and the provided transaction data.
- **Price Constraint**: Your valuation must be reasonable. The final unit price per ping should fall within or be a reasonable extension of the price range of the provided reference transactions. Avoid over- or under-valuation that deviates from market conditions. If reference cases are from a nearby but different administrative district, make appropriate price adjustments.
- **CRITICAL**: If the target property's details (type, size, layout, floor) are "Unknown," you MUST infer its most likely characteristics based on the address (e.g., '20F' in the address implies it's a unit in an apartment building) and the provided nearby transaction data. When inferring the size (ping), please refer to the average size of nearby cases and maintain a cautious, conservative estimate. Your valuation must be based on these inferred characteristics. You MUST populate the \`inferredDetails\` field in the returned JSON with your inferred \`type\`, \`sizePing\`, \`floor\`, and \`layout\` (e.g., '2BR 1BA').
- **SPECIAL NOTE**: When the valuation basis is **'Transactions'**, your analysis should be **primarily based on** the provided nearby transaction cases from the "Ministry of the Interior Real Estate Actual Transaction Inquiry Service", and you should emphasize this in the report.
- **SPECIAL NOTE**: When the valuation basis is **'Realtor's Perspective'**, you MUST include the \`realtorAnalysis\` field in the report, simulating the professional analysis of this property from 2-3 different local real estate agency brands (e.g., Sinyi Realty, Yungching Realty, Taiwan Realty).
- **SPECIAL NOTE**: When the valuation basis is **'Foreclosure Info'**, perform a standard valuation on the target property, but **additionally**, simulate a search for recent foreclosure cases within a 500-meter radius. If 1-2 relevant cases are found, you MUST include a \`foreclosureAnalysis\` field in the report. This field should contain a \`summary\` (e.g., "Found 1 related foreclosure case within 500m") and a \`cases\` array detailing each foreclosure's address, estimated auction price, and its potential impact on the target property's market value. If no cases are found, state so in the \`summary\` and provide an empty \`cases\` array. **The target property itself should NOT be valued as a foreclosure property.**
- **SPECIAL NOTE**: When the valuation basis is **'Rental Yield Analysis'**, you MUST include the \`rentalYieldAnalysisData\` field. This field should contain a \`summary\` (detailing the target property's estimated monthly rent and annual yield) and a \`listings\` array. This list should simulate rental listings for similar nearby properties collected from the "Ministry of the Interior Real Estate Residential Rental Actual Inquiry" as well as other major rental websites (e.g., 591 Rentals, Zuyou Wang), including address, monthly rent, and source. The \`estimatedPrice\` in the report should be calculated based on investment value (rental capitalization).
- **SPECIAL NOTE**: When the valuation basis is **'Urban Renewal Potential'**, please focus your analysis in \`marketSummary\` and \`pros/cons\` on land share value, zoning intensity (e.g., FAR), and potential for reconstruction under Urban Renewal laws.
- **SPECIAL NOTE**: When the valuation basis is **'Commercial Value'**, please focus on the commercial potential as a storefront or office, including foot traffic, district attributes, and rental yield efficiency, reflecting this in the price.
- **SPECIAL NOTE**: When the valuation basis is **'Structural Safety'**, please analyze potential seismic resistance and structural risks (e.g., sea-sand buildings, soil liquefaction zones) based on age and building type, applying appropriate depreciation or risk premiums.
- **SPECIAL NOTE**: When the valuation basis is **'Custom Valuation'**, please **prioritize** the user's custom request/instructions for your analysis and valuation. Incorporate their specific needs (e.g., renovation value, special facility impact) as core considerations.
- For all other valuation bases, the \`realtorAnalysis\`, \`foreclosureAnalysis\`, and \`rentalYieldAnalysisData\` fields are **NOT required**.
- The output language must be English.`,
            scenarioSystem: 'Act as a professional Taiwanese real estate AI analyst.',
            scenarioIntro: 'I am evaluating a property. Here is its basic information and initial valuation:',
            scenarioValuation: 'AI Initial Valuation',
            scenarioQuestion: 'Now, I have a specific scenario I would like you to analyze regarding how it might affect the property price. Please provide a concise, professional analysis based on your expertise.\n\nMy scenario is: "{{query}}"',
            scenarioInstructions: 'Please provide the analysis directly without repeating my question. The output language must be English.'
        },
        'ja': {
            system: 'プロの台湾不動産AI鑑定士として行動してください。',
            targetProperty: '対象物件の住所',
            propertyType: '物件種別',
            propertyAge: '築年数',
            layout: '間取り',
            bedrooms: 'LDK',
            bathrooms: '浴室',
            floor: '階数',
            area: '建物面積',
            sqm: '平方メートル',
            ping: '坪',
            basis: '評価基準',
            customValues: 'ユーザー指定の参考値（これらを優先して評価してください）',
            customRequest: 'ユーザー指定の評価要望',
            actualPing: '実際の坪数',
            refPrice: '参考単価',
            refPriceUnit: '万円/坪',
            notProvided: '未提供',
            unknown: '不明',
            nearbyTransactions: '参考となる周辺の最近の取引{{count}}件',
            address: '住所',
            totalPrice: '総価格',
            transactionDate: '取引日',
            instructions: `上記のすべての情報に基づき、専門的な評価レポートをJSON形式で提供してください。
- 評価には、立地、築年数、種別、階数、面積、市場動向、および提供された取引情報を考慮する必要があります。
- **価格制約**：評価は合理的でなければなりません。最終的な坪単価は、提供された参考取引事例の価格範囲内、またはその合理的な延長線上にあるべきです。市況からかけ離れた過大評価や過小評価は避けてください。参考事例が近隣の異なる行政区からのものである場合は、適切な価格調整を行ってください。
- **最重要**：対象物件の詳細情報（種別、面積、間取り、階数）が「不明」の場合、住所（例：住所の「20階」はマンションの一部屋であることを示唆）と周辺の取引情報に基づいて、物件の最も可能性の高い特徴を**推測**しなければなりません。坪数を推測する際は、周辺事例の平均値を参考にし、慎重かつ保守的な見積もりを維持してください。評価はこれらの推測された特徴に基づいて行う必要があります。返されるJSONには、推測した\`type\`（種別）、\`sizePing\`（坪数）、\`floor\`（階数）、および\`layout\`（間取り、例：「2LDK」）を含む\`inferredDetails\`フィールドを必ず入力してください。
- **特記事項**：評価基準が **'実取引価格'** の場合、あなたの分析は**主に**「内務省不動産取引実価照会サービス」から提供された周辺の取引事例に基づいているべきであり、レポートでその点を強調してください。
- **特記事項**：評価基準が **'仲介業者の視点'** の場合、レポートに必ず \`realtorAnalysis\` フィールドを含め、2～3社の異なる地元の不動産仲介業者（例：信義房屋、永慶房屋、台灣房屋）がこの物件に対して行う専門的な分析をシミュレートしてください。
- **特記事項**：評価基準が **'競売物件情報'** の場合、対象物件には通常の評価を行いますが、**追加で**、その周辺500メートル以内の最近の競売物件を模擬検索してください。もし1～2件の関連物件が見つかった場合は、レポートに必ず \`foreclosureAnalysis\` フィールドを含めてください。このフィールドには、\`summary\`（例：「周辺500m以内で関連する競売物件が1件見つかりました」）と、各競売物件の住所、推定競売価格、対象物件の市場価値への潜在的影響を詳述した \`cases\` 配列を含める必要があります。物件が見つからない場合は、その旨を \`summary\` に記述し、空の \`cases\` 配列を提供してください。**対象物件自体を競売物件として評価しないでください。**
- **特記事項**：評価基準が **'賃料利回り分析'** の場合、必ず \`rentalYieldAnalysisData\` フィールドを含めてください。このフィールドには、対象物件の推定月額賃料と年間利回りを詳述した \`summary\` と、 \`listings\` 配列を含める必要があります。このリストは、「内務省不動産住宅賃貸実価照会」および他の主要な賃貸ウェブサイト（例：591賃貸、好房網など）から収集した、類似条件の周辺物件の賃貸情報をシミュレートする必要があります（住所、月額賃料、情報源を含む）。レポートの \`estimatedPrice\` は、投資価値（賃料の資本化）に基づいて計算する必要があります。
- **特記事項**：評価基準が **'都市更新ポテンシャル'** の場合、\`marketSummary\` と \`pros/cons\` において、土地持分価値、用途地域（容積率など）、および都市更新・建替え条例への適合性に焦点を当てて分析してください。
- **特記事項**：評価基準が **'商業価値評価'** の場合、店舗やオフィスとしての商業的ポテンシャル（人通り、商圏特性、賃料収益性など）を重点的に評価し、価格に反映させてください。
- **特記事項**：評価基準が **'構造安全性評価'** の場合、築年数と建築タイプに基づき、耐震性や構造リスク（海砂屋、液状化エリアなど）を分析し、適切な減価償却やリスクプレミアムを反映させてください。
- **特記事項**：評価基準が **'カスタム評価リクエスト'** の場合、ユーザーが提供したカスタム指示を**優先的に**遵守して分析と評価を行ってください。ユーザーの特定のニーズ（リフォームによる価値向上、特殊施設の影響など）を中核的な考慮事項として組み込んでください。
- その他の評価基準の場合は、\`realtorAnalysis\`、\`foreclosureAnalysis\`、および \`rentalYieldAnalysisData\` フィールドは**不要**です。
- 出力言語は日本語でなければなりません。`,
            scenarioSystem: 'プロの台湾不動産AIアナリストとして行動してください。',
            scenarioIntro: 'ある物件を評価しています。以下がその基本情報と初期評価です：',
            scenarioValuation: 'AIによる初期評価',
            scenarioQuestion: 'さて、特定のシナリオが物件価格にどのように影響するかについて分析していただきたいです。専門知識に基づき、簡潔で専門的な分析を提供してください。\n\n私のシナリオは：「{{query}}」',
            scenarioInstructions: '私の質問を繰り返さず、分析内容を直接提供してください。出力言語は日本語でなければなりません。'
        }
    };
    return prompts[language] || prompts['zh-TW'];
};


export const getValuation = async (
  property: Property,
  nearbyTransactions: Property[],
  reference: string,
  apiKey: string,
  language: Language,
  referenceKey?: string, // Pass the raw key (e.g., 'urbanRenewalPotential') for more reliable switching
  customInputs?: { size?: number; pricePerPing?: number; floor?: string; customRequest?: string }
): Promise<ValuationReport> => {
    
  const p = getPrompts(language);

  // Use referenceKey if provided (it's the internal key like 'customValuation'), otherwise fallback to the localized string 'reference'
  const effectiveBasis = referenceKey || reference; 
  // However, to match the prompt logic properly which checks for localized strings in some cases (old logic) 
  // but we added English-like keys in the prompt special notes instructions.
  // Actually, the prompt instructions check for:
  // '實價登錄', 'Transactions', '実取引価格'
  // '都更危老評估', 'Urban Renewal Potential', '都市更新ポテンシャル'
  // So we should pass the localized label as 'reference' to be displayed as "Basis: XXX",
  // AND we rely on the instruction block matching those localized keywords or we pass the raw key if the instruction expects it.
  // The `instructions` block has Hardcoded Chinese/English/Japanese checks. 
  // e.g. "**特別注意**：當估價參考基準為 **'都更危老評估'** 時..."
  // So `reference` passed here MUST MATCH the localized label.

  const propertyDetails = `
    ${p.propertyType}：${property.type || p.unknown}
    ${p.propertyAge}：${property.yearBuilt ? `${new Date().getFullYear() - property.yearBuilt}年` : p.unknown}
    ${p.layout}：${property.bedrooms && property.bathrooms ? `${property.bedrooms}${p.bedrooms} / ${property.bathrooms}${p.bathrooms}` : p.unknown}
    ${p.floor}：${customInputs?.floor || property.floor || p.unknown}
    ${p.area}：${property.size ? `${property.size.toFixed(2)} ${p.sqm} (約 ${(property.size / 3.30579).toFixed(2)} ${p.ping})` : p.unknown}
  `;

  let prompt = `
    ${p.system}
    ${p.targetProperty}：${property.address}
    ${propertyDetails}

    ${p.basis}：**${reference}**

    ${customInputs ? `
    ${p.customValues}:
    ${customInputs.size ? `- ${p.actualPing}: ${(customInputs.size / 3.30579).toFixed(2)} ${p.ping}` : ''}
    ${customInputs.pricePerPing ? `- ${p.refPrice}: ${customInputs.pricePerPing} ${p.refPriceUnit}` : ''}
    ${customInputs.floor ? `- ${p.floor}: ${customInputs.floor}` : ''}
    ${customInputs.customRequest ? `- ${p.customRequest}: "${customInputs.customRequest}"` : ''}
    ` : ''}

    ${p.nearbyTransactions.replace('{{count}}', String(nearbyTransactions.length))}:
    ${nearbyTransactions.map(prop => {
      const details: string[] = [];
      if (prop.address) details.push(`${p.address}: ${prop.address}`);
      if (prop.price) details.push(`${p.totalPrice}: ${prop.price.toLocaleString()} TWD`);
      if (prop.size) details.push(`${p.area}: ${(prop.size / 3.30579).toFixed(2)} ${p.ping}`);
      if (prop.type) details.push(`${p.propertyType}: ${prop.type}`);
      if (prop.yearBuilt) details.push(`${p.propertyAge}: ${new Date().getFullYear() - prop.yearBuilt}年`);
      if (prop.transactionDate) details.push(`${p.transactionDate}: ${prop.transactionDate}`);
      return `- ${details.join(', ')}`;
    }).join('\n')}

    ${p.instructions}
  `;

  try {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: valuationSchema,
      },
    });

    const jsonString = response.text.trim();
    const cleanedJsonString = jsonString.replace(/^```json\s*|```\s*$/g, '');
    const reportData = JSON.parse(cleanedJsonString);
    
    if (!reportData.estimatedPrice || !reportData.pros || !reportData.cons) {
        throw new Error("AI returned an incomplete data format, missing required fields.");
    }

    return reportData as ValuationReport;

  } catch (error) {
    console.error("Gemini API call failed:", error);
    if (error instanceof Error) {
        if (error.message.includes('API Key not provided')) {
             throw new Error("Please enter your Gemini API Key in the settings.");
        }
        if (error.message.includes('API key not valid')) {
            throw new Error("The API Key you provided is invalid. Please check and try again.");
        }
        if (error.message.includes('SAFETY')) {
            throw new Error("The content was filtered due to safety concerns. Please try a different query.");
        }
        if (error.message.includes('response is not valid JSON')) {
            throw new Error("The AI model did not return valid JSON. Please try again later.");
        }
    }
    throw new Error("The AI valuation service is temporarily unavailable. Please try again later.");
  }
};

export const getScenarioAnalysis = async (
  property: Property,
  valuation: ValuationReport,
  query: string,
  apiKey: string,
  language: Language,
): Promise<string> => {
  const p = getPrompts(language);
  const prompt = `
    ${p.scenarioSystem}
    ${p.scenarioIntro}
    - ${p.address}: ${property.address}
    - ${p.propertyType}: ${valuation.inferredDetails?.type || property.type || p.unknown}
    - ${p.propertyAge}: ${property.yearBuilt ? `${new Date().getFullYear() - property.yearBuilt} 年` : p.unknown}
    - ${p.scenarioValuation}: ${valuation.estimatedPrice.toLocaleString()} TWD

    ${p.scenarioQuestion.replace('{{query}}', query)}

    ${p.scenarioInstructions}
  `;

  try {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini scenario analysis failed:", error);
    if (error instanceof Error) {
        if (error.message.includes('API Key not provided')) {
             throw new Error("Please enter your Gemini API Key in the settings.");
        }
        if (error.message.includes('API key not valid')) {
            throw new Error("The API Key you provided is invalid. Please check and try again.");
        }
        if (error.message.includes('SAFETY')) {
            throw new Error("The content was filtered due to safety concerns. Please try a different query.");
        }
    }
    throw new Error("AI scenario analysis service is temporarily unavailable. Please try again later.");
  }
};
