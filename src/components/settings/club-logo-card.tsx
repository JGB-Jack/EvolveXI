"use client";

import { useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { saveClubLogoUrl, removeClubLogo } from "@/lib/actions/club-logo";
import { withTimeout } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

export function ClubLogoCard({
  teamId,
  initialLogoUrl,
}: {
  teamId: string;
  initialLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [busy, setBusy] = useState(false);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("That image is too large - please choose one under 5MB.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(`${teamId}/logo`, file, {
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("club-logos")
        .getPublicUrl(`${teamId}/logo`);
      // Cache-bust so the new image shows immediately - the path never
      // changes on re-upload, so browsers/react-pdf would otherwise keep
      // showing a cached copy of the old logo.
      const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const result = await withTimeout(saveClubLogoUrl(bustedUrl), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setLogoUrl(bustedUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.storage.from("club-logos").remove([`${teamId}/logo`]);

      const result = await withTimeout(removeClubLogo(), 15000);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setLogoUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-b-2 border-b-primary">
      <CardHeader>
        <CardTitle>Club set up</CardTitle>
        <CardDescription>
          Add your club badge to appear alongside the EvolveXI logo on
          generated PDFs.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {logoUrl ? (
          <>
            <Image
              src={logoUrl}
              alt="Club logo"
              width={64}
              height={64}
              className="rounded-md border object-contain"
              unoptimized
            />
            <Button variant="outline" onClick={handleRemove} disabled={busy}>
              {busy ? "Removing..." : "Remove"}
            </Button>
          </>
        ) : (
          <label>
            <Button
              variant="outline"
              disabled={busy}
              render={<span />}
            >
              {busy ? "Uploading..." : "Upload logo"}
            </Button>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFileSelected}
              disabled={busy}
            />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
