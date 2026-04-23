export function buildRefreshPageUrl(currentUrl: string, refreshToken?: string) {
  const url = new URL(currentUrl);

  if (refreshToken && refreshToken.trim().length > 0) {
    url.searchParams.set("refresh", refreshToken);
  } else {
    url.searchParams.set("refresh", Date.now().toString());
  }

  return url.toString();
}
