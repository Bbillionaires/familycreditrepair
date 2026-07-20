export async function checkHealth(url, timeoutMs = 10000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, status: response.status };
    }
    return { ok: false, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function main() {
  const url = process.argv[2] || process.env.HEALTH_CHECK_URL;

  if (!url) {
    console.error("HEALTH_CHECK_URL not set and no URL argument given");
    process.exit(2);
  }

  const result = await checkHealth(url);
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}

main();
