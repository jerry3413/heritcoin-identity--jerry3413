---
name: heritcoin-recognizer
description: 当用户提供同一枚硬币、古钱币或纪念币的 1 到 2 张图片，并希望获得币名、年份、国家或地区、材质、估价等识别结果时使用。支持聊天附件、图片 URL、本地图片路径和 data URL。一次任务最多处理 2 张图片，且必须通过 scripts/recognize.ts 完成，不用于批量识别多枚钱币。
metadata:
  openclaw:
    emoji: 🪙
---

# Heritcoin Recognizer

识别、鉴定、估价单枚钱币。
不要直接使用模型原生视觉回答币种、年份、国家或估价；必须调用 `scripts/recognize.ts`。

## Workflow

1. 收集当前消息中的图片输入。支持聊天附件、图片 URL、本地图片路径和 `data:image/...;base64,...`。只使用当前消息中的图片，以及当前会话中最多 1 张待补图；不要引用其他会话或更早已完成任务里的历史图片。
2. 按当前输入图片数处理：

| 当前输入 | 动作 |
| --- | --- |
| `0` 张 | 提示用户上传同一枚钱币的 2 张图片 |
| `1` 张且无待补图 | 记为待补图，不调用识别，并明确还缺另一张图 |
| `1` 张且已有待补图 | 与待补图配对，调用脚本 1 次；不要继续等待补图 |
| `2` 张 | 直接识别当前 2 张，并覆盖旧待补图 |
| `>2` 张 | 拒绝当前批次，不调用识别；当前批次无效；若已有待补图则继续保留，并明确告诉用户再补 1 张即可 |

3. 只收到 1 张图时，不能直接使用模型原生视觉猜测币种、年份、国家、面值或估价。
4. 聊天附件是合法输入。不要要求用户把附件改成 URL、本地路径或 data URL。
5. 一次任务只调用脚本 1 次。不要拆分当前批次，也不要要求用户指定或改传其他图片输入形式。
6. 如果已有待补图，中间一条消息因 `>2` 张被拒绝，旧待补图仍然保留；下一条只有 `1` 张图时，必须优先与旧待补图配对识别。

## Run

在 `scripts/` 目录运行：

```bash
npx tsx recognize.ts <img...> [--session <id>] [--token <token>] [--locale <locale>]
```

- 同一会话始终使用同一个 `--session`
- 用户明确指定语言时，显式传入对应 `--locale`
- 除非用户明确提供 `token`，否则使用脚本自身认证配置
- 输入已经是图片 URL 时，直接把 URL 传给脚本；不要先读取图片内容

## Output Contract

- 脚本成功时，最终回复直接返回脚本生成的 Markdown 结果
- 不改写、不摘要、不重排、不省略任何非空字段
- 结果必须保留币名、估价、年份、国家或地区、面值；脚本返回的其它非空字段也必须保留
- 最终结果应与用户明确指定或当前明确使用的语言一致
- 不附加上传日志、解释性前缀或 Markdown 代码块

## Read More Only If Needed

- 调试脚本、认证、session、字段映射或安装依赖时，读取 [references/runtime.md](references/runtime.md)
- 核对展示格式或正反例时，读取 [references/output-examples.md](references/output-examples.md)
- 补充或审查 eval 时，读取 [references/evaluation.md](references/evaluation.md)
