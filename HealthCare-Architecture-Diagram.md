# HealthCare Project Architecture

Dưới đây là sơ đồ cấu trúc dự án HealthCare theo hình ảnh bạn cung cấp.

```mermaid
flowchart TD
  A[HealthCare] --> B[client]
  A --> C[server]
  C --> C1[src]
  C1 --> C1a[assets]
  C1 --> C1b[Config]
  C1 --> C1c[controllers]
  C1 --> C1d[jobs]
  C1 --> C1e[jwt]
  C1 --> C1f[middlewares]
  C1 --> C1g[models]
  C1 --> C1h[routes]
  C1 --> C1i[SendMail]
  C1 --> C1j[uploads]
  C1 --> C1k[utils]
  C --> C2[server.js]
  C --> C3[uploads]
  C --> C4[.env]
  C --> C5[.gitignore]
  C --> C6[.prettierrc]
  C --> C7[Dockerfile]
  C --> C8[package-lock.json]
  C --> C9[package.json]
  C --> C10[app_offline.htm]
```

### Cấu trúc thư mục dạng cây

- HealthCare
  - client
  - server
    - src
      - assets
      - Config
      - controllers
      - jobs
      - jwt
      - middlewares
      - models
      - routes
      - SendMail
      - uploads
      - utils
    - server.js
    - uploads
    - .env
    - .gitignore
    - .prettierrc
    - Dockerfile
    - package-lock.json
    - package.json
    - app_offline.htm
