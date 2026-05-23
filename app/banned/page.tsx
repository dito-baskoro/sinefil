import Link from "next/link";

export const metadata = { title: "Akun ditangguhkan" };

export default function BannedPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Akun ditangguhkan</h1>
      <p className="text-sm text-muted-foreground">
        Akun kamu di-banned oleh admin. Kamu tidak bisa mengakses Sinefil dengan
        akun ini. Hubungi admin kalau menurutmu ini keliru.
      </p>
      <Link href="/" className="inline-block text-sm underline">
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
