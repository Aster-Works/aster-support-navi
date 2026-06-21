import { ADSENSE_PUBLISHER_ID } from "@/app/lib/ads";

export const revalidate = 86400;

export function GET() {
  return new Response(
    `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`,
    {
      headers: {
        "cache-control": "public, max-age=86400, s-maxage=86400",
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
}
