# Runtime Notes

仅在调试或修改脚本时读取本文件。

## 入口

- 主脚本：[scripts/recognize.ts](../scripts/recognize.ts)
- 桥接脚本：[scripts/resolve-image-inputs.ts](../scripts/resolve-image-inputs.ts)
- CLI：

```bash
npx tsx recognize.ts <img1> <img2> [--token <token>] [--locale <locale>]
```

## 输入约束

- 每次调用必须正好传入 2 张图片。
- `img1` 与 `img2` 可以是：
  - `http` 或 `https` URL
  - 本地图片路径
  - `data:image/...;base64,...` 数据 URL
- `recognize.ts` 不读取聊天会话、session 日志或线程状态。
- 聊天附件和跨消息补图恢复由桥接脚本负责，不属于 `recognize.ts` 的职责。
- 桥接脚本必须绑定当前线程上下文；如果缺少上下文，应直接失败，不能回退到“最新 session”。

## 当前脚本行为

- 两个参数都是 URL 时，直接调用识别接口。
- 任一参数是本地路径或数据 URL 时，先上传图片，再调用识别接口。
- `resolve-image-inputs.ts` 会从当前宿主线程恢复最近一个仍未完成任务的图片集合。
- `resolve-image-inputs.ts` 会同时处理聊天附件、显式图片 URL、显式本地路径，以及“还差一张图”后的补图消息。
- `resolve-image-inputs.ts` 只输出当前任务的 `images` 数组，不调用识别服务，也不决定 locale。
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
  - [scripts/resolve-image-inputs.ts](../scripts/resolve-image-inputs.ts)
  - [scripts/recognize.ts](../scripts/recognize.ts)
  - [evals/evals.json](../evals/evals.json)
  - 本文件
