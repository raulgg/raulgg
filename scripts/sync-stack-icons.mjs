#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.join(rootDir, "assets", "stack");

const SVGL_API = "https://api.svgl.app";
const DEVICON_CDN_BASE_URL =
  "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons";
const REMOTE_ICON_FETCH_TIMEOUT_MS = 5000;

const LOGO_SIZE = 40;
const LOGO_PADDING = 4;
const CANVAS_WIDTH = 48;
const CANVAS_HEIGHT = 48;

const TECH_STACK = [
  "typescript",
  "javascript",
  "html5",
  "css",
  "react",
  "solidjs",
  "nextjs",
  "astro",
  "tailwindcss",
  "arkui",
  "materialui",
  "figma",
  "nodejs",
  "bun",
  "vite",
  "pnpm",
  "npm",
  "graphql",
  "apollographql",
  "hasura",
  "prisma",
  "postgresql",
  "neon",
  "redis",
  "mongodb",
  "mysql",
  "vercel",
  "cloudflare",
  "amazonwebservices",
  "render",
  "netlify",
  "docker",
  "resend",
  "inngest",
  "n8n",
  "sentry",
  "posthog",
  "git",
  "github",
  "githubactions",
  "vitest",
  "playwright",
  "linear",
  "vim",
  "cursor",
  "opencode",
  "codex",
  "claude",
  "openclaw",
];

const SVGL_TITLE_OVERRIDES = {
  css: "CSS (New)",
};

const DEVICON_DARK_FILL_OVERRIDES = {
  apollographql: "#ffffff",
};

const shouldSkipFileWrites = process.argv.includes("--dry-run");

async function main({ shouldSkipFileWrites }) {
  await mkdir(assetsDir, { recursive: true });
  const svglIconCatalog = await fetchSvglIconCatalog({});

  const syncResults = [];
  for (const stackIconSlug of TECH_STACK) {
    const targetSvgFilePath = path.join(assetsDir, `${stackIconSlug}.svg`);
    const {
      defaultSvgMarkup,
      darkSvgMarkup,
      sourceDescription,
    } = await getSourceSvgMarkup({
      stackIconSlug,
      localSvgFilePath: targetSvgFilePath,
      svglIconCatalog,
    });

    const paddedSvgMarkup = hasCurrentCanvasPadding({
      svgMarkup: defaultSvgMarkup,
    })
      ? defaultSvgMarkup.trim()
      : addTransparentCanvasPaddingToSvg({
          svgMarkup: defaultSvgMarkup,
          stackIconSlug,
        });
    const paddedDarkSvgMarkup = darkSvgMarkup
      ? addTransparentCanvasPaddingToSvg({
          svgMarkup: darkSvgMarkup,
          stackIconSlug,
        })
      : null;

    if (!shouldSkipFileWrites) {
      await writeFile(targetSvgFilePath, `${paddedSvgMarkup}\n`);
      if (paddedDarkSvgMarkup) {
        await writeFile(
          path.join(assetsDir, `${stackIconSlug}-dark.svg`),
          `${paddedDarkSvgMarkup}\n`,
        );
      }
    }

    syncResults.push(
      `${shouldSkipFileWrites ? "checked" : "updated"} ${stackIconSlug}.svg${paddedDarkSvgMarkup ? ` + ${stackIconSlug}-dark.svg` : ""} (${sourceDescription})`,
    );
  }

  console.log(syncResults.join("\n"));
}

async function fetchSvglIconCatalog({} = {}) {
  const response = await fetch(SVGL_API);

  if (!response.ok) {
    throw new Error(`SVGL catalog fetch failed: ${response.status}`);
  }

  return response.json();
}

async function getSourceSvgMarkup({
  stackIconSlug,
  localSvgFilePath,
  svglIconCatalog,
}) {
  const matchingSvglIcon = findMatchingSvglIcon({
    stackIconSlug,
    svglIconCatalog,
  });

  if (matchingSvglIcon) {
    return getSvglSvgMarkup({
      svglIcon: matchingSvglIcon,
    });
  }

  const deviconSvgMarkup = await fetchDeviconSvgMarkup({
    stackIconSlug,
  });

  if (deviconSvgMarkup) {
    const deviconDarkFill = DEVICON_DARK_FILL_OVERRIDES[stackIconSlug];
    return {
      defaultSvgMarkup: deviconSvgMarkup,
      darkSvgMarkup: deviconDarkFill
        ? replaceSvgFill({ svgMarkup: deviconSvgMarkup, fill: deviconDarkFill })
        : null,
      sourceDescription: deviconDarkFill ? "devicon light/dark" : "devicon",
    };
  }

  return {
    defaultSvgMarkup: await readFile(localSvgFilePath, "utf8"),
    darkSvgMarkup: null,
    sourceDescription: "local fallback",
  };
}

async function getSvglSvgMarkup({ svglIcon }) {
  if (typeof svglIcon.route === "string") {
    return {
      defaultSvgMarkup: await fetchSvgMarkup({ svgUrl: svglIcon.route }),
      darkSvgMarkup: null,
      sourceDescription: "svgl",
    };
  }

  const defaultSvgUrl = svglIcon.route?.light ?? svglIcon.route?.dark;
  if (!defaultSvgUrl) {
    throw new Error(`No route found for ${svglIcon.title}`);
  }

  return {
    defaultSvgMarkup: await fetchSvgMarkup({ svgUrl: defaultSvgUrl }),
    darkSvgMarkup: svglIcon.route?.dark
      ? await fetchSvgMarkup({ svgUrl: svglIcon.route.dark })
      : null,
    sourceDescription:
      svglIcon.route?.light && svglIcon.route?.dark ? "svgl light/dark" : "svgl",
  };
}

function replaceSvgFill({ svgMarkup, fill }) {
  return svgMarkup.replace(/\bfill=(["'])#[0-9a-f]{3,8}\1/gi, `fill="${fill}"`);
}

function findMatchingSvglIcon({ stackIconSlug, svglIconCatalog }) {
  if (!stackIconSlug) {
    return null;
  }

  const svglTitle = SVGL_TITLE_OVERRIDES[stackIconSlug] ?? stackIconSlug;
  const normalizedStackIconSlug = normalizeForMatching({ text: svglTitle });
  return (
    svglIconCatalog.find(
      (svglIcon) =>
        normalizeForMatching({ text: svglIcon.title }) ===
        normalizedStackIconSlug,
    ) ??
    svglIconCatalog.find((svglIcon) =>
      normalizeForMatching({ text: svglIcon.title }).includes(
        normalizedStackIconSlug,
      ),
    ) ??
    null
  );
}

async function fetchSvgMarkup({ svgUrl }) {
  const response = await fetch(svgUrl);

  if (!response.ok) {
    throw new Error(`SVG download failed for ${svgUrl}: ${response.status}`);
  }

  return response.text();
}

async function fetchDeviconSvgMarkup({ stackIconSlug }) {
  const deviconSvgUrl = `${DEVICON_CDN_BASE_URL}/${stackIconSlug}/${stackIconSlug}-original.svg`;

  try {
    const response = await fetch(deviconSvgUrl, {
      signal: AbortSignal.timeout(REMOTE_ICON_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const svgMarkup = await response.text();
    if (!svgMarkup.trim().startsWith("<svg")) {
      return null;
    }

    return svgMarkup;
  } catch {
    return null;
  }
}

function addTransparentCanvasPaddingToSvg({ svgMarkup, stackIconSlug }) {
  const svgMarkupWithoutXmlProlog = svgMarkup.trim().replace(
    /^<\?xml[^>]*>\s*/i,
    "",
  );
  const rootSvgStartIndex = svgMarkupWithoutXmlProlog.search(/<svg\b/i);
  const rootSvgEndIndex = svgMarkupWithoutXmlProlog
    .toLowerCase()
    .lastIndexOf("</svg>");

  if (rootSvgStartIndex === -1 || rootSvgEndIndex === -1) {
    throw new Error(`Could not parse root <svg> for ${stackIconSlug}`);
  }

  const rootSvgMarkup = svgMarkupWithoutXmlProlog.slice(
    rootSvgStartIndex,
    rootSvgEndIndex + "</svg>".length,
  );
  const rootSvgMatch = rootSvgMarkup.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/i);

  if (!rootSvgMatch) {
    throw new Error(`Could not parse root <svg> for ${stackIconSlug}`);
  }

  const innerSvgAttributes = normalizeInnerSvgAttributes({
    rawSvgAttributes: rootSvgMatch[1],
    stackIconSlug,
  });
  const innerSvgMarkup = rootSvgMatch[2].trim();

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`,
    `  <svg${innerSvgAttributes} x="${LOGO_PADDING}" y="${LOGO_PADDING}" width="${LOGO_SIZE}" height="${LOGO_SIZE}">`,
    indentMultilineText({ text: innerSvgMarkup, spaces: 4 }),
    "  </svg>",
    "</svg>",
  ].join("\n");
}

function hasCurrentCanvasPadding({ svgMarkup }) {
  return (
    /<svg\b[^>]*\bwidth=["']48["'][^>]*\bheight=["']48["'][^>]*\bviewBox=["']0 0 48 48["']/i.test(
      svgMarkup,
    ) &&
    /<svg\b[^>]*\bx=["']4["'][^>]*\by=["']4["'][^>]*\bwidth=["']40["'][^>]*\bheight=["']40["']/i.test(
      svgMarkup,
    )
  );
}

function normalizeInnerSvgAttributes({ rawSvgAttributes, stackIconSlug }) {
  let normalizedSvgAttributes = rawSvgAttributes
    .replace(/\s(width|height|x|y)="[^"]*"/gi, "")
    .replace(/\s(width|height|x|y)='[^']*'/gi, "")
    .trim();

  if (!/\bviewBox=/i.test(normalizedSvgAttributes)) {
    const viewBox = extractViewBoxFromSvgDimensions({
      rawSvgAttributes,
    });
    if (!viewBox) {
      throw new Error(
        `No viewBox or numeric width/height found for ${stackIconSlug}`,
      );
    }
    normalizedSvgAttributes =
      `${normalizedSvgAttributes} viewBox="${viewBox}"`.trim();
  }

  if (!/\bpreserveAspectRatio=/i.test(normalizedSvgAttributes)) {
    normalizedSvgAttributes = `${normalizedSvgAttributes} preserveAspectRatio="xMidYMid meet"`;
  }

  return normalizedSvgAttributes ? ` ${normalizedSvgAttributes}` : "";
}

function extractViewBoxFromSvgDimensions({ rawSvgAttributes }) {
  const svgWidth = rawSvgAttributes.match(/\bwidth=["']?([0-9.]+)/i)?.[1];
  const svgHeight = rawSvgAttributes.match(/\bheight=["']?([0-9.]+)/i)?.[1];

  if (!svgWidth || !svgHeight) {
    return null;
  }

  return `0 0 ${svgWidth} ${svgHeight}`;
}

function indentMultilineText({ text, spaces }) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function normalizeForMatching({ text }) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

main({ shouldSkipFileWrites }).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
