export async function exportFile(content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "momentum-backup.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > 5_000_000)
        return reject(new Error("Choose a backup smaller than 5 MB."));
      try {
        resolve(await file.text());
      } catch {
        reject(new Error("Could not read this file."));
      }
    };
    input.click();
  });
}
