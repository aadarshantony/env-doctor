import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import dotenv from "dotenv";
import * as parser from "@babel/parser";
import * as t from "@babel/types";

// --- Babel parse options ---
const parseOptions = {
    sourceType: "module",
    plugins: ["jsx", "typescript", "importMeta"],
};

// --- Recursive AST walk ---
function walkAST(node, visitor) {
    if (!node) return;
    visitor(node);

    for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach((c) => walkAST(c, visitor));
        else if (child && typeof child.type === "string") walkAST(child, visitor);
    }
}

// --- Extract env keys from code ---
const extractEnvKeysFromCode = (code) => {
    const keys = new Set();
    let ast;

    try {
        ast = parser.parse(code, parseOptions);
    } catch {
        return keys;
    }

    walkAST(ast, (node) => {
        // process.env.KEY or process.env["KEY"]
        if (
            t.isMemberExpression(node) &&
            t.isMemberExpression(node.object) &&
            t.isIdentifier(node.object.object, { name: "process" }) &&
            t.isIdentifier(node.object.property, { name: "env" })
        ) {
            if (t.isIdentifier(node.property)) keys.add(node.property.name);
            else if (t.isStringLiteral(node.property)) keys.add(node.property.value);
        }

        // import.meta.env.KEY
        if (
            t.isMemberExpression(node) &&
            t.isMemberExpression(node.object) &&
            t.isMetaProperty(node.object.object) &&
            node.object.object.meta.name === "import" &&
            node.object.object.property.name === "meta" &&
            t.isIdentifier(node.object.property, { name: "env" })
        ) {
            if (t.isIdentifier(node.property)) keys.add(node.property.name);
            else if (t.isStringLiteral(node.property)) keys.add(node.property.value);
        }

        // import { XYZ } from "$env/static/..."
        if (t.isImportDeclaration(node)) {
            const src = node.source.value;
            if (src.startsWith("$env/") || src.startsWith("astro:env/")) {
                node.specifiers.forEach((s) => {
                    if (s.imported && s.imported.name) keys.add(s.imported.name);
                });
            }
        }
    });

    return keys;
};

// --- Recursively scan project for env usage ---
const scanProjectForEnv = (workingDir = process.cwd(), usedKeys = new Set(), spinner) => {
    const files = fs.readdirSync(workingDir);

    for (const file of files) {
        if (["node_modules", ".git", "dist", "build", "package.json", "package-lock.json"].includes(file))
            continue;

        const filePath = path.join(workingDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            scanProjectForEnv(filePath, usedKeys, spinner);
        } else if (/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(file)) {
            spinner.text = `Scanning ${chalk.blue(filePath)} for environment keys...`;
            const code = fs.readFileSync(filePath, "utf-8");
            const keysInFile = extractEnvKeysFromCode(code);
            keysInFile.forEach((k) => usedKeys.add(k));
        }
    }

    return usedKeys;
};

// --- Recursively find all .env files ---
const findAllEnvFiles = (dir = process.cwd(), filesFound = new Set()) => {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (["node_modules", ".git", "dist", "build"].includes(file)) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            findAllEnvFiles(fullPath, filesFound);
        } else if (file.startsWith(".env")) {
            filesFound.add(fullPath);
        }
    }

    return Array.from(filesFound);
};

// --- Read .env file content ---
const readEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        console.log(chalk.red("ERROR: No such file found:"), filePath);
        return null;
    }
    return fs.readFileSync(filePath, "utf-8");
};

// --- Main diagnose function ---
export const diagnose = () => {
    const spinner = ora({ text: "Finding .env files...", color: "cyan" }).start();
    const envFiles = findAllEnvFiles();
    spinner.succeed(`SUCCESS: Found ${envFiles.length} .env file(s).`);

    // Get keys from all env files
    spinner.start("Parsing .env files...");
    let definedEnvKeys = [];
    envFiles.forEach((envFile) => {
        const content = readEnvFile(envFile);
        if (content) definedEnvKeys.push(...Object.keys(dotenv.parse(content)));
    });
    definedEnvKeys = [...new Set(definedEnvKeys)];
    spinner.succeed(`SUCCESS: Parsed all .env files ${definedEnvKeys.length} unique keys found.`);

    // Scan project for used keys
    spinner.start("Scanning project for used environment keys...");
    const usedKeys = scanProjectForEnv(process.cwd(), new Set(), spinner);
    spinner.succeed(`SUCCESS: Scan complete.`);


    console.log(chalk.cyan("\nUsed keys in code:"), [...usedKeys]);
    console.log(chalk.cyan("Keys defined in .env files:"), definedEnvKeys);

    // Compute missing & unused
    const missingKeys = [...usedKeys].filter((k) => !definedEnvKeys.includes(k));
    const unusedKeys = definedEnvKeys.filter((k) => !usedKeys.has(k));

    if (missingKeys.length) console.log(chalk.redBright("\nWARNING: Missing keys in .env file(s): "), missingKeys);
    else console.log(chalk.green("SUCCESS: No missing keys in .env file(s)"));

    if (unusedKeys.length) console.log(chalk.yellow("WARNING: Unused keys in .env file(s): "), unusedKeys);
    else console.log(chalk.green("SUCCESS: No unused keys in .env file(s)"));
};
