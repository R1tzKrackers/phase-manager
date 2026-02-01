# Framework Development Specification

**フレームワーク開発仕様書 / Framework Development Guide**

このドキュメントはPhase Manager用のカスタムフレームワークを開発するための仕様を定義する。

*This document defines the specification for developing custom frameworks for Phase Manager.*

---

## 概要 / Overview

Phase Managerはフレームワークをプラグインとして読み込み、ワークフローを実行する。
フレームワーク開発者はこの仕様に従ってフレームワークを作成する。

*Phase Manager loads frameworks as plugins and executes workflows.
Framework developers must follow this specification to create frameworks.*

---

## ディレクトリ構成 / Directory Structure

```
your-framework/
├── framework.yml      # [必須] フレームワークマニフェスト
├── prompts/           # [必須] フェーズ別プロンプト
│   ├── 01-phase-name.md
│   ├── 02-phase-name.md
│   └── ...
├── templates/         # [任意] テンプレートファイル
│   └── AGENTS.md.template
└── README.md          # [推奨] フレームワーク説明
```

---

## framework.yml 仕様 / framework.yml Specification

### 必須フィールド / Required Fields

```yaml
# メタデータ / Metadata
meta:
  id: "your-framework-id"      # 一意のID（英数字、ハイフン）
  name: "Your Framework Name"  # 表示名
  version: "1.0.0"             # セマンティックバージョン
  description: "説明文"         # フレームワークの説明

# 変数マッピング / Variable Mapping
variables:
  VARIABLE_NAME: "path.to.config"  # project-config.yml のパス

# フェーズ定義 / Phase Definitions
phases:
  - id: "01-phase-id"
    name: "フェーズ名"
    description: "フェーズの説明"
    prompt: "prompts/01-phase-name.md"
    next: ["02-next-phase"]      # 次に進めるフェーズID
    reject: ["01-previous"]      # 差し戻し先フェーズID
```

### 変数マッピング / Variable Mapping

`variables` セクションで定義された変数は、プロンプト内の `{{VARIABLE_NAME}}` を
`project-config.yml` の対応する値に置換する。

*Variables defined in the `variables` section replace `{{VARIABLE_NAME}}` in prompts
with corresponding values from `project-config.yml`.*

```yaml
# framework.yml
variables:
  DESIGN_ROLE: roles.design
  SPEC_DIR: directories.ux_spec

# project-config.yml
roles:
  design: "Designer"
directories:
  ux_spec: "docs/ux"

# プロンプト内
{{DESIGN_ROLE}} → "Designer"
{{SPEC_DIR}} → "docs/ux"
```

### フェーズ定義フィールド / Phase Definition Fields

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `id` | Yes | フェーズの一意ID |
| `name` | Yes | 表示名 |
| `description` | Yes | フェーズの説明 |
| `prompt` | Yes | プロンプトファイルパス（framework.ymlからの相対パス） |
| `next` | Yes | 完了時の次フェーズID配列 |
| `reject` | Yes | 差し戻し先フェーズID配列 |
| `tool` | No | 推奨ツール（"Claude", "Codex", "人間+AI" 等） |
| `group` | No | フェーズグループ（"design", "impl", "review" 等） |
| `optional` | No | 任意フェーズフラグ |

---

## プロンプトファイル仕様 / Prompt File Specification

### フォーマット / Format

- Markdown形式（.md）
- UTF-8エンコーディング
- 変数は `{{VARIABLE_NAME}}` 形式

### 例 / Example

```markdown
# {{DESIGN_ROLE}} - UX設計フェーズ

## 目的
{{SPEC_DIR}}/ 配下にUX仕様書を作成する。

## 成果物
- {{SPEC_DIR}}/screens/main.yml
- {{SPEC_DIR}}/flows/user-flow.yml

## 指示
1. 画面設計を行う
2. 仕様書を出力する
```

---

## テンプレートファイル仕様 / Template File Specification

`templates/` 配下のファイルはフレームワークセットアップ時に
プロジェクトルートに生成される。

*Files in `templates/` are generated at project root during framework setup.*

### AGENTS.md.template

AIロール定義ファイルのテンプレート。変数置換後に `AGENTS.md` として生成される。

```markdown
# AI行動規範

## ロール定義

### {{DESIGN_ROLE}}（設計担当）
- `{{SPEC_DIR}}/` 配下のファイル作成・編集

### {{IMPL_ROLE}}（実装担当）
- `{{IMPL_DIR}}/` 配下のファイル作成・編集
```

---

## builtin/frameworks.yml への登録 / Registration

フレームワークを公式リストに追加するには、Phase Managerの
`builtin/frameworks.yml` にエントリを追加する。

*To add a framework to the official list, add an entry to
`builtin/frameworks.yml` in Phase Manager.*

```yaml
frameworks:
  - id: your-framework-id
    name: Your Framework Name
    description: フレームワークの説明
    repo_url: https://github.com/user/your-framework
    tags: [web, api, cli]
```

---

## バリデーション / Validation

Phase Managerは起動時に以下を検証する：

1. `framework.yml` が存在すること
2. `meta.id` が `project-config.yml` の `framework.id` と一致すること
3. 参照されているプロンプトファイルが存在すること
4. 変数マッピングが有効であること

---

## ベストプラクティス / Best Practices

1. **フェーズIDは連番プレフィックス**: `01-`, `02-` で順序を明示
2. **レビューフェーズを含める**: 人間レビューのゲートを設ける
3. **差し戻し先を明確に**: `reject` で適切な修正フェーズを指定
4. **変数を活用**: ハードコードを避け、`project-config.yml` で設定可能に
5. **AGENTS.md.template を提供**: AIロール定義を標準化

---

## 参考実装 / Reference Implementation

- [ux-contract-dev](https://github.com/R1tzKrackers/ux-contract-dev) - UX駆動開発フレームワーク
