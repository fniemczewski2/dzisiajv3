import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "../../lib/supabaseServer";
import AdmZip from "adm-zip";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("GTFS sync started");

    const response = await fetch(
      "https://www.ztm.poznan.pl/pl/dla-deweloperow/getGTFSFile"
    );

    if (!response.ok) {
      throw new Error("Download failed");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(buffer);

    const requiredFiles = [
      "stops.txt",
      "trips.txt",
      "routes.txt",
      "calendar.txt",
      "stop_times.txt"
    ];

    for (const fileName of requiredFiles) {
      const entry = zip.getEntry(fileName);
      if (!entry) continue;

      const content = entry.getData();

      // upload do storage
      const { error: uploadError } = await supabaseServer.storage
        .from("gtfs")
        .upload(`tmp/${fileName}`, content, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // COPY z storage do tabeli TMP
      const { error: copyError } = await supabaseServer.rpc(
        "copy_gtfs_from_storage",
        {
          file_path: `tmp/${fileName}`,
          table_name: `gtfs_tmp_${fileName.replace(".txt", "")}`
        }
      );

      if (copyError) throw copyError;
    }

    // atomic swap
    const { error: swapError } = await supabaseServer.rpc(
      "swap_gtfs_tables"
    );

    if (swapError) throw swapError;

    await supabaseServer.from("gtfs_sync_logs").insert({
      status: "ok",
      message: "manual sync success"
    });

    console.log("GTFS sync finished");

    return res.status(200).json({ success: true });

  } catch (err: any) {

    console.error("GTFS SYNC ERROR:", err);

    await supabaseServer.from("gtfs_sync_logs").insert({
      status: "error",
      message: err.message
    });

    return res.status(500).json({ error: "Sync failed" });
  }
}
