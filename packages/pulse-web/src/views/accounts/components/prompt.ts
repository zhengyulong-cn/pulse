import dayjs, { type Dayjs } from "dayjs"

const promptStartTime: Dayjs = dayjs().subtract(1, "day").hour(21).minute(0).second(0).millisecond(0)
const promptEndTime: Dayjs = dayjs().hour(15).minute(0).second(0).millisecond(0)
export const importPrompt = `你将从交易软件截图中提取交易记录，并输出为可直接导入系统的 JSON，类型为对象数组，交易时间跨度为${promptStartTime.format("YYYY-MM-DD HH:mm:ss")}至${promptEndTime.format("YYYY-MM-DD HH:mm:ss")}。
对于有平仓匹配不到开仓的不记录，而有开仓匹配不到平仓的则记录，此时平仓相关属性不显示。

账户：accountId。固定值为1
名称：underlyingName
合约代码：underlyingCode
市场区域：marketRegion。固定值为MAINLAND_FUTURES
方向：direction。LONG表示多头，SHORT表示空头。
手数：quantity
开仓时间：openTime。为+08时区。
开仓价格：openPrice
平仓时间：openTime。为+08时区。
平仓价格：closePrice

输出示例：
\`\`\`
[
  {
    "accountId": "1",
    "underlyingName": "焦煤2609",
    "underlyingCode": "jm2609",
    "marketRegion": "MAINLAND_FUTURES",
    "direction": "SHORT",
    "quantity": "12",
    "openTime": "2026-08-06T21:11:11.000+08:00",
    "openPrice": "1258.5",
    "closeTime": "2026-08-07T14:54:00.000+08:00",
    "closePrice": "1250.0",
  }
]
\`\`\`
`