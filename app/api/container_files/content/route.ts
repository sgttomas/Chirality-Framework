export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file_id");
  if (!fileId) {
    return new Response(JSON.stringify({ error: "Missing file_id" }), {
      status: 400,
    });
  }
  try {
    const res = await fetch(`https://api.openai.com/v1/container-files/${fileId}/content`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
    const blob = await res.blob();
    return new Response(blob, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename=${fileId}`,
      },
    });
  } catch (err) {
    console.error("Error fetching container file", err);
    return new Response(JSON.stringify({ error: "Failed to fetch file" }), {
      status: 500,
    });
  }
}
