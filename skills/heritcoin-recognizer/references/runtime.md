# Runtime Notes

仅在调试或修改脚本时读取本文件。

## 入口

- 主脚本：[scripts/recognize.ts](../scripts/recognize.ts)
- 附件解析脚本：[scripts/resolve-chat-images.ts](../scripts/resolve-chat-images.ts)
- CLI：

```bash
npx tsx recognize.ts <img1> <img2> [token] [locale]
```

## 输入约束

- 每次调用必须正好传入 2 张图片。
- `img1` 与 `img2` 可以是：
  - `http` 或 `https` URL
  - 本地图片路径
  - `data:image/...;base64,...` 数据 URL
- `resolve-chat-images.ts` 会从 session 日志里同时重建聊天附件、显式图片 URL 和显式本地图片路径的最近任务状态。
- 聊天附件通过 `npx tsx resolve-chat-images.ts` 从当前 Codex session 日志中提取，并落成本地临时文件路径后再传给主脚本。
- 脚本只负责一次双图识别，不负责在对话里累计图片状态。

## 当前脚本行为

- 两个参数都是 URL 时，直接调用识别接口。
- 任一参数是本地路径或数据 URL 时，先上传图片，再调用识别接口。
- `resolve-chat-images.ts` 会返回最近待处理任务中的全部附件路径；如果返回数量超过 2，agent 必须直接拒绝处理，并提示“`一次最多上传2张图，请重新上传`”。
- `resolve-chat-images.ts` 会按当前线程的消息顺序重建“最后一个仍未完成的识别任务”。
- assistant 的最终答复如果已经给出识别结果或结束当前识别，该任务立即关闭；只有“还缺一张图”这类继续追问才会保持任务打开。
- 显式 URL / 本地路径只有在 assistant 紧接着上一条刚刚催补图，或用户文字明确说明“补第二张/另一面/同一枚”时，才会自动并入最近未完成任务。
- 没有补图语义的单张显式 URL / 本地路径会被视为新任务第 1 张图，避免误并历史任务。
- 当前任务只有 1 张图时，agent 只能提示补齐同一枚钱币的另一张图；不得绕过脚本、直接用模型原生视觉猜测币种、年份、国家或估价。
- `recognize.ts` 已经负责把接口中的材质、直径、厚度、重量、正反面描述等非空字段格式化进最终文本。
- `coinInformation` / `propertyList` 当前是 `{ property, value }[]` 结构；字段映射必须按 `property` 取值，不能再按旧对象结构读取。
- `obverseReverseInfo.frontInfo.detail` / `backInfo.detail` 当前可能是数组；脚本需要保留其中的 `Description`、`Creators` 等非空字段，不要只输出 `labels`。
- `recognize.ts` 负责把“名称/估价”排在前面，并在结尾追加 1 行简短收藏建议；收藏建议应引用当前币种或估价信息，不应始终是固定同一句。
- `recognize.ts` 在成功时，stdout 只应输出 1 份最终识别结果；上传过程日志保留，但必须写到 stderr，不能混入最终回复。
- 最终答复默认输出为 Markdown 标题加两列表格；不要在 agent 层改回普通纯文本，也不要用代码块包裹表格。
- `recognize.ts` 的 locale 解析顺序是：显式传入的 `locale` -> 当前会话里最近一条有实际文字内容的用户消息语言 -> 系统 locale。
- `recognize.ts` 生成请求头时也会使用最终 locale 的语言和地区编码，不再只看系统环境。
- agent 在脚本成功时应直接返回脚本最终文本，不要为了“更简洁”而二次摘要或丢字段。
- 脚本每次调用只会输出 1 份整合结果。
- 认证、UUID 和上传细节都由脚本处理，不要在主 `SKILL.md` 重复这些实现细节。

## 输出约束

- 结果字段以接口真实返回为准。
- 如果接口没有返回版别、铸记、铸币工艺或品相，不要在对话中臆造这些信息。
- 如果产品要求这些字段稳定输出，应先修改脚本字段映射，再更新 eval。

## 变更规则

- 修改接口调用、认证方式或字段映射时，同时更新：
  - [scripts/recognize.ts](../scripts/recognize.ts)
  - [scripts/resolve-chat-images.ts](../scripts/resolve-chat-images.ts)
  - [evals/evals.json](../evals/evals.json)
  - 本文件
