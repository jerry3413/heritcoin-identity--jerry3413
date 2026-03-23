---
name: heritcoin-recognizer
description: 识别硬币、古钱币、纪念币、钱币并获取估价信息。当用户想要鉴定、识别、估价硬币、古钱币、纪念币，或提供硬币/古钱币/纪念币图片时使用此skill。支持传入图片URL、本地图片路径或本地图片文件，每次识别需要正反两面各一张图片。
---

# Heritcoin Coin 识别

## 环境依赖

**Node.js**: >= 18.0.0

**依赖包**:

- `tsx` (运行TypeScript脚本)

**自动安装**:

```bash
cd scripts && npm install
```

## 工作流程

### 1. 收集图片

当用户想识别硬币时，引导用户提供2张图片（正面和反面）：

- 如果用户只提供了1张图片，询问另一面
- 如果用户提供了本地路径，确认文件存在
- 收集完成后，**必须**向用户确认："我将使用以下2张图片进行识别：[图片1] 和 [图片2]，确认吗？"

### 2. 上传本地图片（如有）

**仅本地图片需要上传，URL图片跳过此步。**

**上传端点**: `POST https://api.heritcoin.com/app/v1/file/file-upload-skills`

**上传方式**: Base64 编码的 JSON

**请求头**:

```
User-Agent: <动态生成>
Content-Type: application/json
uuid: <全局唯一标识符>
```

**请求体**:

```json
{
  "file": "<base64编码的图片数据>",
  "mode": 2
}
```

**响应**:

```json
{
  "code": 0,
  "data": {
    "url": "https://..."
  }
}
```

**处理逻辑**:

- 两张本地图片并行上传，获取 URL
- 上传完成后，将获得的 URL 传入识别步骤

### 3. 调用识别脚本

**脚本位置**: `scripts/recognize.ts`

**安装依赖**:

```bash
cd scripts && npm install
```

**运行识别**:

```bash
npm run recognize -- <img1> <img2> [token]
```

参数说明：

- `img1`: 正面图片路径或URL
- `img2`: 反面图片路径或URL
- `token`: 可选，用户token（不提供则使用默认token）

### 4. 调用识别API

**API端点**: `POST http://identify-api-t.wpt.la/app/v1/inference-machine`

**请求方式**:

- URL图片 → 直接传 URL
- 本地图片 → 先上传获取 URL，再用 URL 调用

**请求头**:

```
ut: <token>
User-Agent: <动态生成>
Content-Type: application/json 或 multipart/form-data
uuid: <全局唯一标识符>
```

**UUID机制**:

- 首次使用时自动生成全局UUID并缓存到 `scripts/.cache/device.uuid`
- 所有后续API请求都会在header中携带此UUID
- UUID用于设备标识和请求追踪

**默认Token**: `tm1fYCECg75nhSYKEgK9YG/wtq4d3WnAm9Wd83YXhxSQfq67jbWFrqCAJC6LpZldgLXqJryzuJkwQ5QeHLRGMSBPCzz1kAx/rVjwmdk3VeIlSKq0nFsQ5DrF8XFWTNgNCUE2BWpEpeAI6mj8mbPb6A==`

### 5. 响应数据

响应JSON结构:

- `code`: 0 表示成功
- `data.recognitionText`: 识别文字，如 "Poland 50 groszy 1987-MW"
- `data.coinInformation`: 硬币信息 (Region, Denomination, Krause number, Mintage, Metal)
- `data.obverseReverseInfo`: 正反面详情 (frontInfo, backInfo)
- `data.physicalFeaturesInfo`: 物理特征 (diameter, thickness, weight)
- `data.price`: 估价
- `data.priceUnit`: 价格单位
- `data.years`: 年份
- `data.isCoin`: 是否是硬币 (1=是)

### 6. 输出格式

识别成功后，以以下格式输出：

```
🎫 识别结果

💰 估值: [price] [priceUnit]

名称: [recognitionText]
年份: [years]
国家/地区: [Region]
面值: [Denomination]

铸造量: [Mintage]

⸻

📐 详细信息

Krause编号: [Krause number]
材质: [Metal]

直径: [diameter]
厚度: [thickness]
重量: [weight]

正面: [frontDesc]
背面: [backDesc]
```

### 7. 错误处理

- 如果 `code != 0`，显示错误信息: `msg`
- 如果 `isCoin != 1`，提示用户"未识别为硬币，可能是其他物品"
- 网络错误时提示用户重试

## 注意事项

- 始终确保有2张图片后再调用API
- 使用默认token调用，用户的token优先级更高
- 调用前必须和用户确认图片
