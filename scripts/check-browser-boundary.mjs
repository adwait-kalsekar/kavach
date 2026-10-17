import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = fileURLToPath(new URL("../", import.meta.url));
const areas = [
  {
    path: "apps/web/src",
    allowed: new Set([
      "react",
      "react-dom/client",
      "@tanstack/react-router",
      "@tanstack/react-query",
      "@kavach/api-client",
      "@kavach/contracts",
    ]),
  },
  {
    path: "packages/api-client/src",
    allowed: new Set(["@kavach/contracts", "hono/client"]),
  },
  { path: "packages/contracts/src", allowed: new Set(["zod"]) },
];
const failures = [];
for (const area of areas) {
  const sourceRoot = resolve(root, area.path);
  for (const name of readdirSync(sourceRoot, { recursive: true })) {
    if (!/\.[cm]?[jt]sx?$/.test(name)) continue;
    const path = resolve(sourceRoot, name);
    const source = parse(readFileSync(path, "utf8"), {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      createImportExpressions: true,
    });
    function inspect(specifier, typeOnly) {
      const module = specifier.text;
      if (module.startsWith(".")) {
        const target = relative(sourceRoot, resolve(dirname(path), module));
        if (target !== ".." && !target.startsWith(".." + sep)) return;
      } else if (area.allowed.has(module)) return;
      else if (
        area.path === "packages/api-client/src" &&
        module === "@kavach/api/rpc" &&
        typeOnly
      )
        return;
      failures.push(
        `${relative(root, path)}: forbidden ${typeOnly ? "type" : "runtime"} import ${module}`,
      );
    }
    function visit(node) {
      if (
        [
          "ImportDeclaration",
          "ExportNamedDeclaration",
          "ExportAllDeclaration",
        ].includes(node.type) &&
        node.source?.type === "StringLiteral"
      ) {
        inspect(
          { text: node.source.value },
          node.importKind === "type" || node.exportKind === "type",
        );
      }
      if (node.type === "ImportExpression") {
        if (node.source.type === "StringLiteral")
          inspect({ text: node.source.value }, false);
        else
          failures.push(
            `${relative(root, path)}: dynamic module paths are not allowed in browser packages`,
          );
      }
      if (
        node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        node.callee.name === "require"
      ) {
        if (node.arguments[0]?.type === "StringLiteral")
          inspect({ text: node.arguments[0].value }, false);
        else
          failures.push(
            `${relative(root, path)}: dynamic module paths are not allowed in browser packages`,
          );
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value))
          value.forEach((child) => {
            if (child?.type) visit(child);
          });
        else if (value?.type) visit(value);
      }
    }
    visit(source);
  }
}
if (failures.length) throw new Error(failures.join("\n"));
console.log(
  "Browser import boundary passed: server route types only, no backend runtime imports.",
);
