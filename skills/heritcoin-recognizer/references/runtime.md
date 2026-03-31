# Runtime Notes

仅在调试或修改脚本时读取本文件。

## 入口

- 主脚本：[scripts/recognize.ts](../scripts/recognize.ts)
- CLI：

```bash
npx tsx recognize.ts <img...> [--session <id>] [--token <token>] [--locale <locale>]
```

## 输入约束

- 用户输入可以是聊天附件、`http`/`https` URL、本地图片路径或 `data:image/...;base64,...` 数据 URL。
- 每次调用 `recognize.ts` 时可以传入 1 张或 2 张标准化后的图片引用。
- 图片引用可以是：
  - `http` 或 `https` URL
  - 本地图片路径
  - `data:image/...;base64,...` 数据 URL
- 用户可以直接上传聊天附件；运行时应把附件作为合法图片输入处理，不要要求用户改传 URL、本地路径或 data URL。
- 脚本按 `--session` 维护 1 个最小待补图状态。
- 规则固定为：
  - 当前输入 `1` 张，且当前会话没有待补图：写入待补图，不调识别
  - 当前输入 `1` 张，且当前会话已有待补图：取旧图 + 当前图调识别，并清空待补图
  - 当前输入 `2` 张：直接用当前 2 张调识别，并覆盖旧待补图
  - 当前输入 `>2` 张：拒绝当前批次，不调识别，保留旧待补图；如果旧待补图存在，返回文案必须明确说明这张旧图仍保留着，用户再补 1 张同一枚钱币的另一面照片即可
- 同一会话必须稳定传入同一个 `--session`；不要做多任务队列。
- 一旦最近一轮未完成的单图请求已经存在，后续再次只收到 `1` 张图时，默认先尝试把这两张配成同一枚钱币的一次识别请求；不要重新降级回“还缺一张”。

## 当前脚本行为

- 两个参数都是 URL 时，直接调用识别接口。
- 如果输入已经是 URL，直接把 URL 作为 `img1` / `img2` 传给脚本；不要先自行读取图片内容。
- 任一参数是本地路径或数据 URL 时，先上传图片，再调用识别接口。
- `recognize.ts` 负责把接口中的材质、直径、厚度、重量、正反面描述等非空字段格式化进最终文本。
- `coinInformation` / `propertyList` 当前是 `{ property, value }[]` 结构；字段映射必须按 `property` 取值，不能再按旧对象结构读取。
- `obverseReverseInfo.frontInfo.detail` / `backInfo.detail` 当前可能是数组；脚本需要保留其中的 `Description`、`Creators` 等非空字段，不要只输出 `labels`。
- `recognize.ts` 负责把“名称/估价”排在前面，并在结尾追加 1 行简短收藏建议；收藏建议应引用当前币种或估价信息，不应始终是固定同一句。
- `recognize.ts` 在成功时，stdout 只应输出 1 份最终识别结果；上传过程日志保留，但必须写到 stderr，不能混入最终回复。
- `recognize.ts` 的 locale 解析顺序是：显式传入的 `--locale` -> 系统 locale。
- agent 在脚本成功时应直接返回脚本最终文本，不要为了“更简洁”而二次摘要或丢字段。

## 输出约束

- 结果字段以接口真实返回为准。
- 如果接口没有返回版别、铸记、铸币工艺或品相，不要在对话中臆造这些信息。
- 如果产品要求这些字段稳定输出，应先修改脚本字段映射，再更新 eval。

## 变更规则

- 修改接口调用、认证方式或字段映射时，同时更新：
  - [scripts/recognize.ts](../scripts/recognize.ts)
  - [evals/evals.json](../evals/evals.json)
  - 本文件
