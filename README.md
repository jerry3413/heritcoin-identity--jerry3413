# Heritcoin Coin Recognizer

硬币、古钱币、纪念币识别、鉴定与估价工具。

## 功能

- 自动识别硬币正面与反面
- 提供详细的硬币信息（年份、材质、铸造量等）
- 获取市场估价参考

## 使用方法

当用户提供硬币图片时，此 skill 会自动激活：

1. **收集图片** - 需要正反两面各一张
2. **自动识别** - 调用识别 API 分析硬币
3. **展示结果** - 输出识别信息和估价

## 快速开始

```bash
# 安装依赖
cd scripts && npm install

# 测试识别
npx tsx recognize.ts <正面图片> <反面图片>
```

## 目录结构

```
heritcoin-recognizer/
├── SKILL.md          # Skill 定义文件
├── install.md        # 安装指南
├── scripts/          # 识别脚本
│   ├── recognize.ts  # 主识别脚本
│   └── package.json
└── references/       # 参考资料
```

## 环境要求

- Node.js >= 18.0.0
- tsx (TypeScript 执行器)

## 更多信息

详见 [SKILL.md](./SKILL.md) 和 [install.md](./install.md)
