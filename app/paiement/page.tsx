import { redirect } from "next/navigation";

/**
 * Legacy generic payment route is retired.
 * Pricing and recipient must always come from the selected published course.
 * The real checkout lives at /formation/[slug].
 */
export default async function LegacyPaymentRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = params.formation ?? params.course ?? params.slug;
  const slug = typeof requested === "string" ? requested : "";

  if (/^[a-z0-9][a-z0-9-]{1,150}$/.test(slug)) {
    redirect("/formation/" + slug);
  }

  redirect("/formations");
}
