export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "instituto-dr-marcel-goncalves",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
