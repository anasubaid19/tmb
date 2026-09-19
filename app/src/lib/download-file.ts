/**
 * Unduh berkas hasil ekspor server (`{filename, mime, content}`). CSV dikirim
 * sebagai teks → dibuat Blob; XLSX dikirim sebagai data URL → langsung dipakai.
 */
export function downloadFile(
  filename: string,
  mime: string,
  content: string,
): void {
  const a = document.createElement("a");
  if (mime === "text/csv") {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  a.href = content;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
