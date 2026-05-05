---
name: frontend-dev-workflow
description: 前端开发流程 - 修改 control-ui 后需要 npm run dev
type: reference
---

# 前端开发注意事项

## 修改 control-ui 后

1. **开发模式**：需要在 `control-ui` 目录下运行 `npm run dev`
   ```bash
   cd "D:\Projects\agent-jk\Agent Team version3\control-ui"
   npm run dev
   ```

2. **生产部署**：需要 rebuild 并 commit push
   ```bash
   cd "D:\Projects\agent-jk\Agent Team version3\control-ui"
   npm run build
   git add control-ui/dist/
   git commit -m "build: rebuild control-ui"
   git push
   ```

3. **Render 部署**：必须 commit + push 才能触发自动部署
